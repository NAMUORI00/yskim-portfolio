/*
 * 전체 보기(지식의 구) 캔버스의 움직임을 DOM 에 직접 씁니다 — React 는 멈춘 기준 장면만 그리고, 움직이는 동안의 자리는 프레임 시계 하나에서
 * 점 모양 · 별을 가리키는 자리 · 지식 이름 · 연결선 · 가운데에서 분야로 가는 선 · 분야 이름과 묶음 원 · 적도 고리에
 * 같은 투영 값으로 써 넣습니다 (홈 전체를 매 프레임 다시 그리지 않음).
 * - 켬/끔, 움직임 줄이기, 탭 숨김, 화면 밖, 넓게 보기가 레일을 가리는 동안·분야를 펼친 동안(paused)에는 프레임을 받지 않고
 *   기준 자리로 돌려놓습니다. 다시 시작하면 세기 0 에서 천천히 커져 튀지 않고, 움직임 시계는 멈췄던 곳에서 이어집니다.
 * - 빈 곳을 가리키면 구가 그쪽으로 살짝 돕니다(그릴 때만 더함). 분야·별 위에서는 멈추고, 시점이 움직이는 동안(끌기·전환)에는 0 으로 돌아갑니다.
 * - 느린 움직임이라 30fps 안팎(터치 화면 25fps)으로만 그리고, 0.1px 보다 작은 변화는 쓰지 않습니다.
 * - 가리킨 곳 가까운 점은 은은하게 빛납니다. 움직임이 아니라 가리킴에 대한 반응이라 움직임을 꺼도 남습니다.
 */
import { useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { usePrefersReducedMotion } from "@/components/capabilities/useFlowPlayer";
import type { Canvas3DVariant, Scene3D } from "./Graph3DCanvas";
import { clamp, equatorPath, type Camera3D, type Layout3D, type View3D } from "./graph3dLayout";
import type { DomainId, KnowledgeGraph } from "./graph3dModel";
import {
  approach,
  buildMotionModel,
  calmFactor,
  DRIFT_PX,
  driftAmplitude,
  getMotionChoice,
  glowStrength,
  motionFrame,
  parallaxLimit,
  PARALLAX_PITCH_SHARE,
  parallaxTarget,
  setMotionChoice,
  subscribeFrames,
  subscribeMotionChoice,
  type MotionChoice,
  type MotionFrame,
  type MotionModel,
  type ScreenXY,
} from "./graph3dMotion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ── 켬/끔 설정 ───────────────────────────── */

export interface MotionSetting {
  /** 시스템의 움직임 줄이기 설정 */
  reduced: boolean;
  choice: MotionChoice;
  /** 실제로 움직이는지 — 움직임 줄이기면 늘 꺼짐 */
  enabled: boolean;
  setChoice: (choice: MotionChoice) => void;
}

export function useMotionSetting(): MotionSetting {
  const reduced = usePrefersReducedMotion();
  const choice = useSyncExternalStore(subscribeMotionChoice, getMotionChoice, getMotionChoice);
  return { reduced, choice, enabled: !reduced && choice === "on", setChoice: setMotionChoice };
}

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

/** 화면 안에 있는지 (IntersectionObserver 가 없으면 늘 안이라고 봅니다) */
function useInView(element: Element | null): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setInView(entry.isIntersecting);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return inView;
}

/* ── 그리는 쪽 ─────────────────────────────── */

/** 프레임 사이 최소 간격 (ms) — 몇 초 주기의 느린 움직임이라 30fps 안팎이면 충분, 터치 화면은 25fps */
const FRAME_MS = 30;
const COARSE_FRAME_MS = 40;
/** 한 번에 나아가는 최대 시간 (ms) — 오래 멈췄다 돌아와도 튀지 않게 */
const MAX_STEP_MS = 64;
/** 시작할 때 세기가 커지는 빠르기, 기울기가 따라가고 돌아오는 빠르기, 잠잠해지는 빠르기 (ms) */
const INTENSITY_MS = 700;
const PARALLAX_FOLLOW_MS = 450;
const PARALLAX_RETURN_MS = 1100;
/** 시점이 움직이는 동안(끌기·도구·전환) 기울기를 빨리 0 으로 — 펼칠 때 별이 그린 자리에서 바로 떠나게 */
const PARALLAX_SETTLE_MS = 160;
const CALM_MS = 220;
/** 가리킨 곳에서 이 거리(px) 안의 점은 멈추고, 바깥쪽 거리까지 부드럽게 다시 움직입니다 */
const CALM_RADIUS: Record<Canvas3DVariant, [number, number]> = { rail: [14, 56], drawer: [0, 0], explorer: [20, 80] };
/** 가까운 점이 은은하게 빛나는 거리 (px) */
const GLOW_RADIUS: Record<Canvas3DVariant, number> = { rail: 26, drawer: 0, explorer: 36 };
/** .kg3-star 의 CSS 가운데 맞춤 (움직임은 그 뒤에 더합니다) */
const HIT_CENTER = "translate(-50%, -50%)";

export interface CanvasMotionInput {
  graph: KnowledgeGraph;
  layout: Layout3D;
  view: View3D;
  camera: Camera3D;
  scene: Scene3D;
  variant: Canvas3DVariant;
  /** 켬/끔 설정과 움직임 줄이기를 합친 값 */
  enabled: boolean;
  /** 넓게 보기가 레일을 가리거나 목록 보기일 때 */
  paused: boolean;
  interactive: boolean;
  pinnedId: string | null;
  /** 가리키거나 키보드 초점이 있는 대상 */
  activeId: string | null;
  /** 끌거나 시점을 옮기는 중 — 기울기를 멈춥니다 */
  moving: boolean;
  coarse: boolean;
}

interface ElementIndex {
  nodes: Array<{ id: string; el: SVGElement; glow: SVGElement | null }>;
  /** 별을 가리키는 자리와 지식 이름 — 점과 같이 옮깁니다 */
  stars: Array<{ id: string; el: HTMLElement }>;
  names: Array<{ id: string; el: HTMLElement }>;
  links: Array<{ key: string; source: string; target: string; el: SVGElement }>;
  sparks: Array<{ source: string; target: string; el: SVGElement }>;
  regions: Array<{ domain: DomainId; el: SVGElement | HTMLElement }>;
  labels: Array<{ domain: DomainId; el: HTMLElement }>;
  spokes: Array<{ domain: DomainId; el: SVGElement }>;
  equator: SVGElement | null;
}

const EMPTY_INDEX: ElementIndex = { nodes: [], stars: [], names: [], links: [], sparks: [], regions: [], labels: [], spokes: [], equator: null };

function indexElements(root: HTMLElement): ElementIndex {
  return {
    nodes: Array.from(root.querySelectorAll<SVGElement>("g.kg3-node[data-id]"), (el) => ({ id: el.dataset.id ?? "", el, glow: el.querySelector<SVGElement>(".kg3-glow") })),
    stars: Array.from(root.querySelectorAll<HTMLElement>(".kg3-star[data-node-id]"), (el) => ({ id: el.dataset.nodeId ?? "", el })),
    names: Array.from(root.querySelectorAll<HTMLElement>(".kg3-label[data-node-id]"), (el) => ({ id: el.dataset.nodeId ?? "", el })),
    links: Array.from(root.querySelectorAll<SVGElement>("line.kg3-link[data-key]"), (el) => ({
      key: el.dataset.key ?? "",
      source: el.dataset.source ?? "",
      target: el.dataset.target ?? "",
      el,
    })),
    sparks: Array.from(root.querySelectorAll<SVGElement>("line.kg3-spark"), (el) => ({ source: el.dataset.source ?? "", target: el.dataset.target ?? "", el })),
    regions: Array.from(root.querySelectorAll<SVGElement | HTMLElement>(".kg3-halo-region[data-domain], .kg3-region-hit[data-domain]"), (el) => ({
      domain: (el.dataset.domain ?? "") as DomainId,
      el,
    })),
    labels: Array.from(root.querySelectorAll<HTMLElement>("button.kg3-domain[data-domain]"), (el) => ({ domain: (el.dataset.domain ?? "") as DomainId, el })),
    spokes: Array.from(root.querySelectorAll<SVGElement>("line.kg3-spoke[data-domain]"), (el) => ({ domain: (el.dataset.domain ?? "") as DomainId, el })),
    equator: root.querySelector<SVGElement>("path.kg3-equator"),
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** React 가 좌표를 쓸 때와 같은 반올림 (Graph3DCanvas 의 fixed) */
function fixed2(value: number): number {
  return Math.round(value * 100) / 100;
}

function setLineAttributes(el: SVGElement, x1: number, y1: number, x2: number, y2: number) {
  el.setAttribute("x1", String(x1));
  el.setAttribute("y1", String(y1));
  el.setAttribute("x2", String(x2));
  el.setAttribute("y2", String(y2));
}

function createMotionDriver() {
  let input: CanvasMotionInput | null = null;
  let model: MotionModel | null = null;
  let root: HTMLElement | null = null;
  let index = EMPTY_INDEX;
  let baseDomains = new Map<DomainId, ScreenXY>();
  let stopFrames: (() => void) | null = null;
  let glowRequest: (() => void) | null = null;
  // React 가 건드리지 않는 인라인 스타일(transform·opacity)과, React 가 기준 좌표를 다시 쓸 수 있는 선 좌표를 따로 기억합니다.
  let styleCache = new WeakMap<Element, string>();
  let lineCache = new WeakMap<Element, string>();
  const frame: MotionFrame = { nodes: new Map(), domains: new Map() };
  let framed = false;
  const calm = new Map<string, number>();
  const domainCalm = new Map<DomainId, number>();
  const parallax = { yaw: 0, pitch: 0 };
  const pointer = { clientX: 0, clientY: 0, inside: false };
  let local: ScreenXY | null = null;
  let pointerTarget: string | null = null;
  /** 움직임 시계 (초) — 멈춘 동안에는 흐르지 않습니다 */
  let time = 0;
  let intensity = 0;
  let lastDraw: number | null = null;

  function setStyle(el: HTMLElement | SVGElement, property: "transform" | "opacity", value: string) {
    const key = `${property}:${value}`;
    if (styleCache.get(el) === key) return;
    styleCache.set(el, key);
    el.style[property] = value;
  }

  function setLine(el: SVGElement, a: ScreenXY, b: ScreenXY) {
    const x1 = round1(a.x);
    const y1 = round1(a.y);
    const x2 = round1(b.x);
    const y2 = round1(b.y);
    const key = `${x1} ${y1} ${x2} ${y2}`;
    if (lineCache.get(el) === key) return;
    lineCache.set(el, key);
    setLineAttributes(el, x1, y1, x2, y2);
  }

  function setPath(el: SVGElement, d: string) {
    if (lineCache.get(el) === d) return;
    lineCache.set(el, d);
    el.setAttribute("d", d);
  }

  function localPointer(): ScreenXY | null {
    if (!pointer.inside || !root) return null;
    const rect = root.getBoundingClientRect();
    return { x: pointer.clientX - rect.left, y: pointer.clientY - rect.top };
  }

  function step(dt: number) {
    if (!input) return;
    const { graph, variant, view, camera, layout, moving, pinnedId, activeId, scene } = input;
    time += dt / 1000;
    intensity = approach(intensity, 1, dt, INTENSITY_MS);
    local = localPointer();
    // 기울기: 빈 곳을 가리키는 동안만 따라가고, 분야·별 위에서는 그대로 둡니다 (누르려는 곳이 밀리지 않게).
    // 시점이 움직이는 동안(끌기·도구·전환)에는 빨리 0 으로 돌아가, 그린 자리와 카메라 자리가 곧 같아집니다.
    const limit = parallaxLimit(variant, view, camera, layout);
    if (moving) {
      parallax.yaw = approach(parallax.yaw, 0, dt, PARALLAX_SETTLE_MS);
      parallax.pitch = approach(parallax.pitch, 0, dt, PARALLAX_SETTLE_MS);
    } else if (!pointerTarget) {
      const target = parallaxTarget(local, view, limit);
      const tau = local ? PARALLAX_FOLLOW_MS : PARALLAX_RETURN_MS;
      parallax.yaw = approach(parallax.yaw, target.yaw, dt, tau);
      parallax.pitch = approach(parallax.pitch, target.pitch, dt, tau);
    }
    parallax.yaw = clamp(parallax.yaw, -limit, limit);
    parallax.pitch = clamp(parallax.pitch, -limit * PARALLAX_PITCH_SHARE, limit * PARALLAX_PITCH_SHARE);
    // 잠잠함: 고른 점·가리킨 점은 멈추고, 가리킨 곳 근처는 거리에 따라 줄입니다.
    const [inner, outer] = CALM_RADIUS[variant];
    for (const node of graph.nodes) {
      let target = 1;
      if (node.id === pinnedId || node.id === activeId) target = 0;
      else if (local) {
        const at = (framed ? frame.nodes.get(node.id) : undefined) ?? scene.points.get(node.id);
        if (at) target = calmFactor(Math.hypot(at.x - local.x, at.y - local.y), inner, outer);
      }
      calm.set(node.id, approach(calm.get(node.id) ?? 1, target, dt, CALM_MS));
    }
    for (const domain of graph.domains) {
      const target = domain.key === pinnedId || domain.key === activeId ? 0 : 1;
      domainCalm.set(domain.id, approach(domainCalm.get(domain.id) ?? 1, target, dt, CALM_MS));
    }
  }

  function drawGlows(positions: ReadonlyMap<string, ScreenXY>) {
    if (!input) return;
    const radius = GLOW_RADIUS[input.variant];
    for (const { id, glow } of index.nodes) {
      if (!glow) continue;
      const at = positions.get(id);
      const strength = local && at ? glowStrength(Math.hypot(at.x - local.x, at.y - local.y), radius) : 0;
      setStyle(glow, "opacity", strength < 0.01 ? "" : String(Math.round(strength * 100) / 100));
    }
  }

  function draw() {
    if (!input || !model) return;
    const { variant, view, camera, layout, scene } = input;
    motionFrame({ model, layout, view, camera, time, amplitude: driftAmplitude(variant, view, camera) * intensity, parallax, calm, domainCalm }, frame);
    framed = true;
    for (const { id, el } of index.nodes) {
      const at = frame.nodes.get(id);
      if (at) setStyle(el, "transform", `translate(${round1(at.x)}px, ${round1(at.y)}px)`);
    }
    // 가리키는 자리와 지식 이름은 React 가 둔 기준 자리에서 같은 만큼 옮깁니다.
    for (const { id, el } of index.stars) {
      const at = frame.nodes.get(id);
      const base = scene.points.get(id);
      if (at && base) setStyle(el, "transform", `${HIT_CENTER} translate(${round1(at.x - fixed2(base.x))}px, ${round1(at.y - fixed2(base.y))}px)`);
    }
    for (const { id, el } of index.names) {
      const at = frame.nodes.get(id);
      const base = scene.points.get(id);
      if (at && base) setStyle(el, "transform", `translate(${round1(at.x - fixed2(base.x))}px, ${round1(at.y - fixed2(base.y))}px)`);
    }
    for (const { el, source, target } of index.links) {
      const a = frame.nodes.get(source);
      const b = frame.nodes.get(target);
      if (a && b) setLine(el, a, b);
    }
    for (const { el, source, target } of index.sparks) {
      const a = frame.nodes.get(source);
      const b = frame.nodes.get(target);
      if (a && b) setLine(el, a, b);
    }
    for (const { domain, el } of index.regions) {
      const at = frame.domains.get(domain);
      const base = baseDomains.get(domain);
      if (at && base) setStyle(el, "transform", `translate(${round1(at.x - base.x)}px, ${round1(at.y - base.y)}px) scale(${Math.round(at.scale * 1000) / 1000})`);
    }
    for (const { domain, el } of index.labels) {
      const at = frame.domains.get(domain);
      const base = baseDomains.get(domain);
      if (at && base) setStyle(el, "transform", `translate(${round1(at.x - base.x)}px, ${round1(at.y - base.y)}px)`);
    }
    // 가운데(사람 자리)는 돌려도 그대로이고, 정리 선의 바깥 끝만 분야 묶음을 따라갑니다.
    for (const { domain, el } of index.spokes) {
      const at = frame.domains.get(domain);
      if (at) setLine(el, scene.core, at);
    }
    if (index.equator) setPath(index.equator, equatorPath(view, { ...camera, yaw: camera.yaw + parallax.yaw, pitch: camera.pitch + parallax.pitch }, layout));
    drawGlows(frame.nodes);
  }

  /** 기준 자리로 돌려놓습니다 — 인라인 이동을 지우고, 선은 React 가 쓴 기준 좌표로 */
  function restore() {
    if (!input) return;
    const { scene } = input;
    for (const { el, glow } of index.nodes) {
      el.style.transform = "";
      if (glow) glow.style.opacity = "";
    }
    for (const { el } of index.stars) el.style.transform = "";
    for (const { el } of index.names) el.style.transform = "";
    for (const { el } of index.regions) el.style.transform = "";
    for (const { el } of index.labels) el.style.transform = "";
    const byKey = new Map(scene.links.map((link) => [link.key, link]));
    for (const { el, key } of index.links) {
      const link = byKey.get(key);
      if (link) setLineAttributes(el, fixed2(link.a.x), fixed2(link.a.y), fixed2(link.b.x), fixed2(link.b.y));
    }
    for (const { el, source, target } of index.sparks) {
      const a = scene.points.get(source);
      const b = scene.points.get(target);
      if (a && b) setLineAttributes(el, fixed2(a.x), fixed2(a.y), fixed2(b.x), fixed2(b.y));
    }
    const spokeEnds = new Map(scene.spokes.map((spoke) => [spoke.domain, spoke]));
    for (const { el, domain } of index.spokes) {
      const end = spokeEnds.get(domain);
      if (end) setLineAttributes(el, fixed2(scene.core.x), fixed2(scene.core.y), fixed2(end.x), fixed2(end.y));
    }
    if (index.equator) index.equator.setAttribute("d", scene.equator);
    styleCache = new WeakMap();
    lineCache = new WeakMap();
    framed = false;
  }

  function tick(now: number) {
    if (!input) return;
    const gap = input.coarse ? COARSE_FRAME_MS : FRAME_MS;
    if (lastDraw !== null && now - lastDraw < gap) return;
    const dt = lastDraw === null ? 16 : Math.min(MAX_STEP_MS, now - lastDraw);
    lastDraw = now;
    step(dt);
    draw();
  }

  /** 움직임이 멈춘 동안에도 가리킨 곳의 빛은 한 프레임에 한 번만 고칩니다 */
  function requestGlow() {
    if (glowRequest || !input?.interactive || GLOW_RADIUS[input.variant] <= 0) return;
    glowRequest = subscribeFrames(() => {
      glowRequest?.();
      glowRequest = null;
      if (stopFrames || !input) return;
      local = localPointer();
      drawGlows(input.scene.points);
    });
  }

  return {
    update(next: CanvasMotionInput, nextModel: MotionModel, nextRoot: HTMLElement | null) {
      input = next;
      model = nextModel;
      root = nextRoot;
      baseDomains = new Map(next.scene.domains.map((item) => [item.domain.id, { x: item.x, y: item.y }]));
    },
    /** React 가 그린 뒤 — 요소를 다시 찾고, 움직이는 중이면 바로 다시 써서 기준 자리가 한 프레임도 보이지 않게 합니다 */
    afterCommit() {
      index = root ? indexElements(root) : EMPTY_INDEX;
      lineCache = new WeakMap();
      if (stopFrames) draw();
    },
    start() {
      if (stopFrames) return;
      intensity = 0;
      lastDraw = null;
      framed = false;
      stopFrames = subscribeFrames(tick);
    },
    stop() {
      stopFrames?.();
      stopFrames = null;
      restore();
      intensity = 0;
      parallax.yaw = 0;
      parallax.pitch = 0;
      calm.clear();
      domainCalm.clear();
      if (pointer.inside) requestGlow();
    },
    dispose() {
      stopFrames?.();
      stopFrames = null;
      glowRequest?.();
      glowRequest = null;
    },
    pointerMove(event: { clientX: number; clientY: number; pointerType: string }) {
      if (event.pointerType === "touch") return;
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.inside = true;
      if (!stopFrames) requestGlow();
    },
    pointerLeave() {
      pointer.inside = false;
      pointerTarget = null;
      if (!stopFrames) requestGlow();
    },
    setPointerTarget(id: string | null) {
      pointerTarget = id;
    },
  };
}

/**
 * 캔버스 하나의 움직임. 돌려준 ref 를 캔버스 뿌리에, 포인터 처리기를 같은 요소에 붙입니다.
 * running 은 지금 프레임을 받고 있는지입니다 (켬 + 보이는 중 + 가리지 않음).
 */
export function useCanvasMotion(input: CanvasMotionInput) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const visible = usePageVisible();
  const inView = useInView(root);
  const running = input.enabled && input.interactive && !input.paused && visible && inView && DRIFT_PX[input.variant] > 0;
  const model = useMemo(() => buildMotionModel(input.graph, input.layout), [input.graph, input.layout]);
  const [driver] = useState(createMotionDriver);

  useIsoLayoutEffect(() => {
    driver.update(input, model, root);
    driver.afterCommit();
  });

  useEffect(() => {
    if (!running) return;
    driver.start();
    return () => driver.stop();
  }, [driver, running]);

  useEffect(() => () => driver.dispose(), [driver]);

  return {
    ref: setRoot,
    running,
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => driver.pointerMove(event),
    onPointerLeave: () => driver.pointerLeave(),
    setPointerTarget: driver.setPointerTarget,
  };
}
