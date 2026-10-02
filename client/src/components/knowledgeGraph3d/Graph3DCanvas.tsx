/*
 * 전체 보기 — 사람을 가운데 둔 지식의 구(globe). 레일·서랍·넓게 보기가 함께 씁니다.
 * SVG 로 적도 고리 · 가운데에서 분야로 가는 정리 선 · 분야 묶음의 옅은 원 · 연결선 · 별(지식)을 그리고,
 * 그 위의 HTML 이 가운데 이름 · 분야 이름(키보드로 고르는 단추) · 가리키는 자리를 맡습니다. 글자는 모두 화면을 향한 HTML 입니다.
 *  - 고르는 대상은 분야 8곳입니다. 분야 이름이나 묶음을 누르면(또는 Enter) 그 분야를 앞으로 데려와 층 그림으로 펼칩니다.
 *    별(지식 하나)을 가리키면 이름이 잠깐 보이고 그 분야를 미리 보며, 누르면 그 분야를 펼치면서 그 지식을 고정합니다.
 *  - 아무것도 고르지 않으면 가운데 이름과 분야 이름만 씁니다(레일). 넓게 보기에서는 확대할수록 지식 이름이 더해집니다.
 *  - 먼 것부터 그려 가까운 것이 위에 오고, 먼 점과 선은 흐리게(안개) 둡니다. 가운데 이름은 그 사이의 깊이에 놓입니다.
 *  - 가운데에서 분야로 가는 선은 지식을 분야로 정리했다는 뜻일 뿐입니다 — 모두 같은 굵기이고 숙련도나 성과를 뜻하지 않습니다.
 *  - 점 모양은 종류(개념 ● · 구현한 방법 ◎ · 기술 ◆), 점선 테두리는 관심·스택 목록(작업 기록 없음)입니다. 크기는 숙련도가 아닙니다.
 *  - 움직임(useGraph3DMotion): 은은한 숨쉬기와 빈 곳을 가리킬 때 구가 그쪽으로 살짝 도는 것은 React 를 거치지 않고 DOM 에 씁니다.
 *    계속 도는 회전은 없고, 끌기를 놓으면 짧게 미끄러지다 멈춥니다(움직임 줄이기면 없음).
 */
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Locale } from "@/lib/i18nContent";
import { estimateTextWidth, type LabelBox, type LabelObstacle } from "@/components/knowledgeMap/knowledgeMapLayout";
import { graph3dCopy } from "./graph3dCopy";
import { neighborhood, type DomainId, type KDomain, type KnowledgeGraph, type KNode, type Neighborhood } from "./graph3dModel";
import { subscribeFrames } from "./graph3dMotion";
import { useCanvasMotion } from "./useGraph3DMotion";
import {
  CAMERA_DISTANCE,
  clamp,
  clampCamera,
  CORE_LABEL,
  coreLabelBox,
  DOMAIN_LABEL_HEIGHT,
  DOMAIN_SIDES,
  domainLabelFont,
  domainLabelWidth,
  equatorPath,
  labelPriority3d,
  nodeRadius,
  nodeState,
  placeLabels3d,
  projectDomains,
  projectPoint,
  RAIL_PADDING,
  zoomAt,
  type Camera3D,
  type Emphasis3D,
  type FitPadding,
  type LabelDensity3D,
  type LabelRequest3D,
  type Layout3D,
  type NodeState3D,
  type PlacedLabel3D,
  type Projected,
  type Side3D,
  type View3D,
} from "./graph3dLayout";
import "@/components/knowledgeMap/knowledgeMap.css";
import "./graph3d.css";

export type Canvas3DVariant = "rail" | "drawer" | "explorer";

/** 지식 이름표 글자 크기 (px) — 가장 좁은 레일에서만 10.5px */
const LABEL_FONT: Record<Canvas3DVariant, number> = { rail: 11, drawer: 10.5, explorer: 12 };
export function labelFont3d(variant: Canvas3DVariant, width: number): number {
  return variant === "rail" && width < 216 ? 10.5 : LABEL_FONT[variant];
}
/** 분야 이름표 글자 크기 — 가장 좁은 레일에서만 11px */
export function domainFont3d(variant: Canvas3DVariant, width: number): number {
  if (variant === "drawer") return 10.5;
  if (variant === "explorer") return 12.5;
  return domainLabelFont(width);
}

/** 가운데 이름표 글자 (이름 · 아래의 "나의 지식") */
const CORE_FONT: Record<Canvas3DVariant, { name: number; caption: number; padX: number; padY: number }> = {
  rail: { name: 12, caption: 9, padX: 8, padY: 3 },
  drawer: { name: 11, caption: 8.5, padX: 7, padY: 2 },
  explorer: { name: 15, caption: 11, padX: 13, padY: 4 },
};

/** 가운데 이름표 크기 — 글자 폭 어림값으로 잽니다 (.kg3-core-label 의 여백과 같음) */
export function coreLabelSize(variant: Canvas3DVariant, name: string, caption: string): { width: number; height: number } {
  const font = CORE_FONT[variant];
  const width = Math.max(estimateTextWidth(name, font.name, false, true), estimateTextWidth(caption, font.caption)) + 2 * font.padX + 2;
  const height = Math.round(font.name * 1.15 + (caption ? font.caption * 1.2 : 0) + 2 * font.padY + 2);
  return { width: Math.ceil(width), height };
}

/** 점 크기 배율 (종류별 크기는 같은 비율로만 바뀝니다) */
const DOT_SCALE: Record<Canvas3DVariant, number> = { rail: 1, drawer: 0.85, explorer: 1.3 };

/** 별을 가리키는 자리 (점보다 넓게) — 터치 화면에서는 넓게 보기에서만 더 키웁니다 */
const HIT: Record<Canvas3DVariant, number> = { rail: 14, drawer: 0, explorer: 20 };
const COARSE_HIT = 1.4;

export const CANVAS_PADDING: Record<Canvas3DVariant, FitPadding> = {
  rail: RAIL_PADDING,
  drawer: { padX: 4, padTop: 8, padBottom: 4 },
  explorer: { padX: 36, padTop: 36, padBottom: 28 },
};

/** 분야를 미리 볼 때 몇 걸음까지 밝힐지 — 분야 지식(1)과 다른 분야로 바로 이어진 지식(2) */
export const PREVIEW_DEPTH = 2;

/* ── 장면 계산 (그리기와 테스트가 함께 씀) ───── */

export interface NodePoint extends Projected {
  /** 화면에서의 점 반지름 (px) */
  r: number;
}

export type LinkTier = "dim" | "idle" | "far" | "near";
const TIER_ORDER: LinkTier[] = ["dim", "idle", "far", "near"];

export interface Link3D {
  key: string;
  source: string;
  target: string;
  relation: KnowledgeGraph["links"][number]["relation"];
  tier: LinkTier;
  /** 다른 분야 사이의 연결 (전체 보기에서는 더 옅게) */
  cross: boolean;
  a: NodePoint;
  b: NodePoint;
}

export type DomainState3D = "idle" | "focus" | "near" | "dim";

export interface Domain3D {
  domain: KDomain;
  x: number;
  y: number;
  /** 화면에서 묶음의 반지름 (px) */
  r: number;
  fog: number;
  depth: number;
  state: DomainState3D;
}

export interface Scene3DInput {
  graph: KnowledgeGraph;
  layout: Layout3D;
  view: View3D;
  camera: Camera3D;
  variant: Canvas3DVariant;
  /** 미리 보거나 펼치는 중인 분야(domain:<id>), 또는 홈 목록에서 가리킨 작업(project:<slug>) */
  focusId: string | null;
  depth: number;
  emphasis: Emphasis3D;
  density: LabelDensity3D;
  /** 가리킨 별 — 다른 이름표를 밀어내지 않고 마지막에 이름만 더합니다 */
  starId?: string | null;
  /** 가운데 이름표 크기 */
  core?: { width: number; height: number };
  /** 펼치는 동안 구에서 감출 분야 (층 그림이 그 별들을 대신 그림) */
  hiddenDomain?: DomainId | null;
  /** 움직이는 동안 이름표가 이쪽저쪽으로 튀지 않게 직전 자리를 먼저 써 봅니다 */
  previousSides?: Map<string, Side3D>;
}

export interface Spoke3D {
  domain: DomainId;
  x: number;
  y: number;
  state: DomainState3D;
}

export interface Scene3D {
  hood: Neighborhood | null;
  points: Map<string, NodePoint>;
  /** 먼 것 → 가까운 것 */
  order: string[];
  /** order 에서 가운데(사람 자리)보다 먼 별의 수 — 가운데는 그 뒤에 그립니다 */
  behind: number;
  rank: Map<string, number>;
  states: Map<string, NodeState3D>;
  links: Link3D[];
  /** 분야 이름표(domain:<id>)와, 넓게 보기·가리킨 별의 지식 이름표(노드 id) */
  labels: Map<string, PlacedLabel3D>;
  domains: Domain3D[];
  /** 가운데 (사람 자리) — 돌려도 움직이지 않습니다 */
  core: { x: number; y: number; box: LabelBox };
  /** 가운데 → 분야 묶음 가운데 (정리 선) */
  spokes: Spoke3D[];
  equator: string;
}

/** 지식 이름표를 놓아 볼 순서 — 오른쪽 가장자리 근처에서만 왼쪽부터 */
function sidesFor(point: NodePoint, view: View3D): Side3D[] {
  return point.x > view.width * 0.62 ? ["left", "right", "below", "above"] : ["right", "left", "below", "above"];
}

function domainState(domain: KDomain, hood: Neighborhood | null): DomainState3D {
  if (!hood) return "idle";
  if (hood.kind === "domain") return hood.domain === domain.id ? "focus" : "dim";
  return domain.members.some((id) => hood.hops.get(id) === 1 || hood.hops.get(id) === 0) ? "near" : "dim";
}

const DEFAULT_CORE = CORE_LABEL;

export function computeScene3d(input: Scene3DInput): Scene3D {
  const { graph, layout, view, camera, variant, focusId, depth, emphasis, density, starId = null, core: coreSize = DEFAULT_CORE, hiddenDomain = null, previousSides } = input;
  const hood = neighborhood(graph, focusId, depth);
  const grow = Math.pow(camera.zoom, 0.4) * DOT_SCALE[variant];

  const points = new Map<string, NodePoint>();
  for (const node of graph.nodes) {
    const position = layout.positions.get(node.id);
    if (!position) continue;
    const projected = projectPoint(view, camera, layout, position);
    points.set(node.id, { ...projected, r: nodeRadius(node) * clamp(projected.scale, 0.72, 1.45) * grow });
  }
  const order = Array.from(points.keys()).sort((a, b) => points.get(b)!.depth - points.get(a)!.depth || (a < b ? -1 : a > b ? 1 : 0));
  const rank = new Map(order.map((id, index) => [id, index]));
  const behind = order.filter((id) => points.get(id)!.depth > CAMERA_DISTANCE).length;
  const states = new Map(graph.nodes.map((node) => [node.id, nodeState(node, hood, emphasis)]));

  const links = graph.links
    .flatMap((link): Link3D[] => {
      const a = points.get(link.source);
      const b = points.get(link.target);
      if (!a || !b) return [];
      const hop = hood?.links.get(link.key);
      const tier: LinkTier = !hood ? "idle" : hop === 1 ? "near" : hop !== undefined ? "far" : "dim";
      const cross = graph.byId.get(link.source)!.domain !== graph.byId.get(link.target)!.domain;
      return [{ key: link.key, source: link.source, target: link.target, relation: link.relation, tier, cross, a, b }];
    })
    .sort((left, right) => TIER_ORDER.indexOf(left.tier) - TIER_ORDER.indexOf(right.tier));

  const domains: Domain3D[] = projectDomains(graph, layout, view, camera)
    .map(({ domain, point, r }) => ({ domain, x: point.x, y: point.y, r: r * 1.15 + 6 * grow, fog: point.fog, depth: point.depth, state: domainState(domain, hood) }))
    .sort((a, b) => b.depth - a.depth);

  const origin = { x: view.cx + camera.panX, y: view.cy + camera.panY };
  const coreBox = coreLabelBox(view, camera, coreSize.width, coreSize.height);
  const spokes: Spoke3D[] = graph.domains.flatMap((domain) => {
    const item = domains.find((entry) => entry.domain.id === domain.id);
    return item ? [{ domain: domain.id, x: item.x, y: item.y, state: item.state }] : [];
  });

  // 이름표: 순위가 높은 것부터, 가까운 것이 같은 순위에서 먼저 자리를 잡습니다. 가운데 이름 자리는 비워 둡니다.
  const fontSize = labelFont3d(variant, view.width);
  const domainSize = domainFont3d(variant, view.width);
  const requests: LabelRequest3D[] = [];
  const sideOf = (id: string, base: Side3D[]) => {
    const preferred = previousSides?.get(id);
    return preferred && base.includes(preferred) ? [preferred, ...base.filter((side) => side !== preferred)] : base;
  };
  for (const item of domains) {
    if (item.domain.id === hiddenDomain) continue;
    if (item.x < 0 || item.x > view.width || item.y < 0 || item.y > view.height) continue;
    const priority = !hood ? 900 : item.state === "focus" ? 1000 : item.state === "near" ? 520 : 200;
    requests.push({
      id: item.domain.key,
      x: item.x,
      y: item.y,
      radius: item.r * 0.45,
      width: domainLabelWidth(item.domain.label, item.domain.evidenced, domainSize),
      height: variant === "drawer" ? 16 : DOMAIN_LABEL_HEIGHT,
      priority: priority + frontness(item.depth) * 10,
      sides: sideOf(item.domain.key, DOMAIN_SIDES),
      force: hood?.kind === "domain" && hood.domain === item.domain.id,
      dotCost: hood ? 400 : 0,
    });
  }
  // 지식 이름은 넓게 보기에서만 (레일은 가운데 이름과 분야 이름만 — 이름이 벽처럼 쌓이지 않게)
  if (density === "rich") {
    for (const node of graph.nodes) {
      if (node.domain === hiddenDomain) continue;
      const point = points.get(node.id);
      const priority = labelPriority3d(node, { hood, emphasis: null, density, zoom: camera.zoom });
      if (!point || priority === null) continue;
      if (point.x < 0 || point.x > view.width || point.y < 0 || point.y > view.height) continue;
      requests.push({
        id: node.id,
        x: point.x,
        y: point.y,
        radius: point.r + 1,
        width: nodeLabelWidth(node, fontSize),
        // .kg3-label 의 줄 높이(1.2)와 위아래 여백(1px)에 맞춥니다.
        height: Math.round(fontSize * 1.2 + 2),
        priority: priority + (point.scale - 1) * 30,
        sides: sideOf(node.id, sidesFor(point, view)),
      });
    }
  }
  const requested = new Set(requests.map((request) => request.id));
  const obstacles: LabelObstacle[] = graph.nodes.flatMap((node) => {
    const point = points.get(node.id);
    const state = states.get(node.id);
    const blocks = hood ? state === "focus" || state === "near" : requested.has(node.id);
    return point && blocks && node.domain !== hiddenDomain ? [{ id: node.id, x: point.x, y: point.y, r: point.r }] : [];
  });
  const bounds = { left: 2, top: 1, width: view.width - 4, height: view.height - 2 };
  // 가운데 이름(사람 자리)은 어떤 이름표도 덮지 않습니다 — 고른 분야의 이름표도 다른 자리를 찾습니다.
  const labels = placeLabels3d(requests, bounds, obstacles, [], [coreBox]);

  // 가리킨 별: 이름이 이미 있으면 그대로 두고, 없으면 다른 이름표를 밀어내지 않도록 마지막에 더합니다.
  const star = starId && variant !== "drawer" ? graph.byId.get(starId) : undefined;
  const starPoint = star && star.domain !== hiddenDomain ? points.get(star.id) : undefined;
  if (star && starPoint && !labels.has(star.id) && starPoint.x >= 0 && starPoint.x <= view.width && starPoint.y >= 0 && starPoint.y <= view.height) {
    const request: LabelRequest3D = {
      id: star.id,
      x: starPoint.x,
      y: starPoint.y,
      radius: starPoint.r + 1,
      width: nodeLabelWidth(star, fontSize),
      height: Math.round(fontSize * 1.2 + 2),
      priority: 0,
      sides: sidesFor(starPoint, view),
      force: true,
    };
    const placed = placeLabels3d([request], bounds, obstacles, Array.from(labels.values(), (label) => label.box), [coreBox]).get(star.id);
    if (placed) labels.set(star.id, placed);
  }

  return {
    hood,
    points,
    order,
    behind,
    rank,
    states,
    links,
    labels,
    domains,
    core: { x: origin.x, y: origin.y, box: coreBox },
    spokes,
    equator: equatorPath(view, camera, layout),
  };
}

function nodeLabelWidth(node: KNode, fontSize: number): number {
  return estimateTextWidth(node.label, fontSize, node.kind === "tech", false) + 8;
}

/** 가까운 묶음 이름이 같은 순위에서 먼저 자리를 잡도록 (카메라 거리 → 0–2) */
function frontness(depth: number): number {
  return clamp(6 - depth, 0, 2);
}

/* ── 진하기 ─────────────────────────────────── */

export function nodeOpacity(state: NodeState3D, node: Pick<KNode, "status">, fog: number): number {
  const faint = node.status === "evidenced" ? 1 : 0.75;
  if (state === "focus") return 1;
  if (state === "near") return (0.6 + 0.4 * fog) * faint;
  if (state === "far") return 0.6 * fog * faint;
  if (state === "dim") return 0.16 * fog;
  if (state === "emphasis") return fog;
  return 0.78 * fog * faint;
}

export function linkOpacity(tier: LinkTier, fog: number, cross = false): number {
  if (tier === "near") return 0.85;
  if (tier === "far") return 0.3 + 0.22 * fog;
  if (tier === "dim") return 0.04 * fog;
  return (cross ? 0.1 : 0.22) * fog;
}

export function haloOpacity(state: DomainState3D, fog: number): number {
  if (state === "focus") return 0.08 * fog;
  return 0;
}

function fixed(value: number): number {
  return Math.round(value * 100) / 100;
}

/* ── 카메라 훅 ──────────────────────────────── */

export function lerpCamera(from: Camera3D, to: Camera3D, t: number): Camera3D {
  const mix = (a: number, b: number) => a + (b - a) * t;
  return { yaw: mix(from.yaw, to.yaw), pitch: mix(from.pitch, to.pitch), zoom: mix(from.zoom, to.zoom), panX: mix(from.panX, to.panX), panY: mix(from.panY, to.panY) };
}

/**
 * 카메라 상태 — 단추·처음 시점은 부드럽게, 끌기·키는 바로 바꿉니다 (움직임 줄이기면 늘 바로).
 * 부드러운 전환도 숨쉬기와 같은 프레임 시계 하나를 씁니다. 빈 곳 기울기는 여기에 더하지 않습니다 (그릴 때만).
 */
export function useCamera3D(initial: () => Camera3D, reduced: boolean) {
  const [camera, setCamera] = useState(initial);
  const [animating, setAnimating] = useState(false);
  const tween = useRef<(() => void) | null>(null);
  const current = useRef(camera);
  current.current = camera;

  const stopTween = useCallback(() => {
    tween.current?.();
    tween.current = null;
  }, []);

  useEffect(() => stopTween, [stopTween]);

  const setNow = useCallback(
    (next: Camera3D) => {
      stopTween();
      setAnimating(false);
      current.current = next;
      setCamera(next);
    },
    [stopTween],
  );

  const animateTo = useCallback(
    (next: Camera3D, duration = 420) => {
      stopTween();
      if (reduced || typeof requestAnimationFrame !== "function") {
        setAnimating(false);
        setCamera(next);
        return;
      }
      const from = current.current;
      // 여러 바퀴 돌린 뒤 처음 시점으로 돌아갈 때도 가까운 쪽으로만 돕니다.
      const turn = next.yaw - from.yaw;
      const target = { ...next, yaw: from.yaw + turn - 2 * Math.PI * Math.round(turn / (2 * Math.PI)) };
      let start: number | null = null;
      setAnimating(true);
      tween.current = subscribeFrames((now) => {
        if (start === null) start = now;
        const progress = Math.min(1, (now - start) / duration);
        setCamera(lerpCamera(from, target, 1 - (1 - progress) ** 3));
        if (progress >= 1) {
          stopTween();
          setAnimating(false);
        }
      });
    },
    [reduced, stopTween],
  );

  return { camera, animating, setNow, animateTo };
}

const DRAG_THRESHOLD = 4;
const YAW_PER_PX = 0.0085;
const PITCH_PER_PX = 0.004;
/** 끌기를 놓은 뒤 미끄러지는 정도 — 속도가 이 시간(ms)마다 1/e 로 줄고, 아주 느려지면 멈춥니다 */
const GLIDE_TAU = 260;
const GLIDE_MIN = 0.00004;
const GLIDE_MAX = 0.004;

interface Pointer {
  x: number;
  y: number;
}

/**
 * 끌어서 돌리기(궤도), 넓게 보기에서는 휠·두 손가락 확대와 Shift+끌기 옮기기까지 맡습니다.
 * 4px 넘게 움직여야 끌기로 보고, 끌기가 끝난 직후의 누름은 고르기로 치지 않습니다 (moved).
 * glide 면 놓을 때의 속도로 짧게 미끄러지다 부드럽게 멈춥니다 (계속 돌지 않음).
 */
export function useOrbit(options: { camera: Camera3D; view: View3D; allowZoom: boolean; glide?: boolean; onChange: (camera: Camera3D) => void }) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const pointers = useRef(new Map<number, Pointer>());
  const gesture = useRef<{ camera: Camera3D; points: Pointer[] } | null>(null);
  const moved = useRef(false);
  const velocity = useRef({ yaw: 0, pitch: 0, at: 0, lastYaw: 0, lastPitch: 0 });
  const glideStop = useRef<(() => void) | null>(null);
  const [dragging, setDragging] = useState(false);
  const [gliding, setGliding] = useState(false);
  const latest = useRef(options);
  latest.current = options;

  const stopGlide = useCallback(() => {
    glideStop.current?.();
    glideStop.current = null;
    setGliding(false);
  }, []);

  useEffect(() => stopGlide, [stopGlide]);

  const local = (event: { clientX: number; clientY: number }, target: Element | null): Pointer => {
    const rect = target?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  };
  const begin = () => {
    gesture.current = { camera: latest.current.camera, points: Array.from(pointers.current.values()) };
  };
  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    moved.current = true;
    setDragging(true);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      /* 포인터 잡기를 못 해도 끌기는 됩니다 */
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopGlide();
    // 새 동작의 첫 포인터면 지난 동작을 비웁니다 (캔버스 밖에서 버튼을 놓아 pointerup 을 못 받은 경우 포함).
    if (event.isPrimary || pointers.current.size === 0) {
      pointers.current.clear();
      moved.current = false;
    }
    pointers.current.set(event.pointerId, local(event, event.currentTarget));
    velocity.current = { yaw: 0, pitch: 0, at: event.timeStamp, lastYaw: latest.current.camera.yaw, lastPitch: latest.current.camera.pitch };
    begin();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, local(event, event.currentTarget));
    const start = gesture.current;
    if (!start) return;
    const { view, allowZoom, onChange } = latest.current;
    const now = Array.from(pointers.current.values());
    if (now.length >= 2 && start.points.length >= 2) {
      if (!allowZoom) return;
      const before = Math.hypot(start.points[1].x - start.points[0].x, start.points[1].y - start.points[0].y);
      const after = Math.hypot(now[1].x - now[0].x, now[1].y - now[0].y);
      const from = { x: (start.points[0].x + start.points[1].x) / 2, y: (start.points[0].y + start.points[1].y) / 2 };
      const to = { x: (now[0].x + now[1].x) / 2, y: (now[0].y + now[1].y) / 2 };
      if (!moved.current) startDrag(event);
      const zoomed = zoomAt(start.camera, view, after / Math.max(1, before), from.x, from.y);
      onChange(clampCamera({ ...zoomed, panX: zoomed.panX + to.x - from.x, panY: zoomed.panY + to.y - from.y }, view));
      return;
    }
    const dx = now[0].x - start.points[0].x;
    const dy = now[0].y - start.points[0].y;
    if (!moved.current) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      startDrag(event);
    }
    if (event.shiftKey && allowZoom) {
      onChange(clampCamera({ ...start.camera, panX: start.camera.panX + dx, panY: start.camera.panY + dy }, view));
      return;
    }
    const next = clampCamera({ ...start.camera, yaw: start.camera.yaw + dx * YAW_PER_PX, pitch: start.camera.pitch + dy * PITCH_PER_PX }, view);
    // 놓을 때 미끄러질 속도 (최근 움직임에 가중)
    const v = velocity.current;
    const dt = Math.max(1, event.timeStamp - v.at);
    v.yaw = 0.6 * ((next.yaw - v.lastYaw) / dt) + 0.4 * v.yaw;
    v.pitch = 0.6 * ((next.pitch - v.lastPitch) / dt) + 0.4 * v.pitch;
    v.at = event.timeStamp;
    v.lastYaw = next.yaw;
    v.lastPitch = next.pitch;
    onChange(next);
  };

  const glideFrom = (yaw: number, pitch: number) => {
    let vy = clamp(yaw, -GLIDE_MAX, GLIDE_MAX);
    let vp = clamp(pitch, -GLIDE_MAX, GLIDE_MAX) * 0.6;
    if (Math.hypot(vy, vp) < GLIDE_MIN * 4) return;
    let last: number | null = null;
    setGliding(true);
    glideStop.current = subscribeFrames((now) => {
      const dt = last === null ? 16 : Math.min(48, now - last);
      last = now;
      const { camera, view, onChange } = latest.current;
      onChange(clampCamera({ ...camera, yaw: camera.yaw + vy * dt, pitch: camera.pitch + vp * dt }, view));
      const decay = Math.exp(-dt / GLIDE_TAU);
      vy *= decay;
      vp *= decay;
      if (Math.hypot(vy, vp) < GLIDE_MIN) stopGlide();
    });
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      /* 이미 풀린 포인터 */
    }
    if (pointers.current.size) {
      begin();
      return;
    }
    gesture.current = null;
    setDragging(false);
    if (moved.current) {
      // 끌기 직후에 따라오는 누름(click)만 막고, 그다음 누름·키보드 Enter 는 그대로 받습니다.
      window.setTimeout(() => {
        if (!pointers.current.size) moved.current = false;
      }, 0);
      const v = velocity.current;
      // 놓기 직전 잠깐 멈춰 있었으면 미끄러지지 않습니다.
      if (latest.current.glide && event.type === "pointerup" && event.timeStamp - v.at < 80) glideFrom(v.yaw, v.pitch);
    }
  };

  const allowZoom = options.allowZoom;
  useEffect(() => {
    if (!element || !allowZoom) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const { camera, view, onChange } = latest.current;
      onChange(zoomAt(camera, view, Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [element, allowZoom]);

  return {
    ref: setElement,
    dragging,
    gliding,
    moved,
    stopGlide,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd },
  };
}

/** 터치 위주 화면인지 (누르는 자리를 넓힘) */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return coarse;
}

/* ── 키보드 이동 (분야 사이, 화면 공간 기준) ─────── */

export type NavKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End" | "PageUp" | "PageDown";

export function isNavKey(key: string): key is NavKey {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(key);
}

export interface NavTarget {
  id: string;
  x: number;
  y: number;
}

const DIRECTION: Record<"ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown", { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/**
 * 분야 사이의 이동 — 화살표: 화면에서 그 방향(±60°)에 있는 가장 가까운 분야, Home·End: 첫·마지막 분야,
 * PageUp·PageDown: 원본 순서의 이전·다음 분야(돌아감). 더 갈 곳이 없으면 지금 분야를 그대로 돌려줍니다.
 */
export function navigateDomains(graph: KnowledgeGraph, targets: Map<string, NavTarget>, currentId: string, key: NavKey): string {
  const visible = graph.domains.filter((domain) => targets.has(domain.key));
  if (!visible.length) return currentId;
  const index = visible.findIndex((domain) => domain.key === currentId);
  if (key === "Home") return visible[0].key;
  if (key === "End") return visible[visible.length - 1].key;
  if (key === "PageUp" || key === "PageDown") {
    if (index < 0) return visible[0].key;
    return visible[(index + (key === "PageDown" ? 1 : -1) + visible.length) % visible.length].key;
  }
  const from = targets.get(currentId);
  if (!from) return visible[0].key;
  const d = DIRECTION[key];
  let best = currentId;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const [id, target] of Array.from(targets.entries())) {
    if (id === currentId) continue;
    const vx = target.x - from.x;
    const vy = target.y - from.y;
    const along = vx * d.x + vy * d.y;
    if (along <= 0.5) continue;
    const across = Math.abs(vx * d.y - vy * d.x);
    if (across > along * Math.tan(Math.PI / 3)) continue;
    const score = Math.hypot(vx, vy) * (1 + across / Math.max(1, along));
    if (score < bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

/* ── 그리기 ─────────────────────────────────── */

function Glyph({ node, r }: { node: KNode; r: number }) {
  if (node.kind === "tech") {
    const half = r * 1.18;
    return <path className="kg3-dot" d={`M 0 ${fixed(-half)} L ${fixed(half)} 0 L 0 ${fixed(half)} L ${fixed(-half)} 0 Z`} />;
  }
  if (node.kind === "method" && node.status === "evidenced") {
    return (
      <>
        <circle className="kg3-dot" r={fixed(r)} />
        <circle className="kg3-pip" r={fixed(Math.max(0.9, r * 0.38))} />
      </>
    );
  }
  return <circle className="kg3-dot" r={fixed(r)} />;
}

function isFocusVisible(element: HTMLElement): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

export type CameraKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

export interface Graph3DCanvasProps {
  graph: KnowledgeGraph;
  layout: Layout3D;
  view: View3D;
  camera: Camera3D;
  variant: Canvas3DVariant;
  locale: Locale;
  /** 가운데에 쓰는 사람 이름 */
  identity: string;
  /** 미리 보거나 펼치는 중인 분야(domain:<id>), 또는 홈 목록에서 가리킨 작업(project:<slug>) */
  focusId: string | null;
  /** 지금 가리키거나 키보드 초점이 있는 분야(domain:<id>) */
  activeId?: string | null;
  /** 가리킨 별 (이름만 잠깐 보입니다) */
  starId?: string | null;
  /** 펼치는 동안 구에서 감출 분야 */
  hiddenDomain?: DomainId | null;
  depth?: number;
  emphasis?: Emphasis3D;
  rovingId?: string | null;
  /** false 면 단추 없이 그림만 (서랍의 미리보기, 펼친 분야 뒤에 숨은 구) */
  interactive?: boolean;
  /** 끌거나 시점을 옮기는 중 — 가리킴을 무시하고 전환 효과를 끕니다 */
  moving?: boolean;
  /** 은은한 움직임(숨쉬기·기울기·물결·연결 위의 빛)을 켤지 — 켬/끔 설정과 움직임 줄이기를 합친 값 */
  motion?: boolean;
  /** 넓게 보기가 레일을 가리거나 목록 보기·펼친 분야일 때 — 움직임을 멈춥니다 */
  paused?: boolean;
  density?: LabelDensity3D;
  coarse?: boolean;
  describedBy?: string;
  /** 끌기가 끝난 직후의 누름은 고르기로 치지 않습니다 */
  dragGuard?: MutableRefObject<boolean>;
  /** 가리킨 대상 — 분야(domain:<id>) 또는 별(노드 id) */
  onHover?: (id: string | null) => void;
  onKeyboardFocus?: (id: string | null) => void;
  /** 분야를 펼칩니다 — 별을 눌렀으면 그 지식을 고정합니다 */
  onOpen?: (domain: DomainId, pinnedId?: string | null) => void;
  onRove?: (id: string) => void;
  /** Shift+화살표 (돌리기·기울이기) */
  onCameraKey?: (key: CameraKey) => void;
  /** +/− (넓게 보기의 확대) */
  onZoomKey?: (direction: 1 | -1) => void;
}

/** 펼치는 동안처럼 구의 입력이 그대로일 때는 다시 그리지 않습니다 (펼친 그림만 프레임마다 바뀜). */
export const Graph3DCanvas = memo(function Graph3DCanvas({
  graph,
  layout,
  view,
  camera,
  variant,
  locale,
  identity,
  focusId,
  activeId = null,
  starId = null,
  hiddenDomain = null,
  depth = PREVIEW_DEPTH,
  emphasis = null,
  rovingId = null,
  interactive = true,
  moving = false,
  motion = false,
  paused = false,
  density = "quiet",
  coarse = false,
  describedBy,
  dragGuard,
  onHover,
  onKeyboardFocus,
  onOpen,
  onRove,
  onCameraKey,
  onZoomKey,
}: Graph3DCanvasProps) {
  const copy = graph3dCopy(locale);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const sides = useRef(new Map<string, Side3D>());
  const coreSize = useMemo(() => {
    const size = variant === "explorer" ? 24 : 18;
    return { width: size, height: size };
  }, [variant]);
  const scene = useMemo(
    () => computeScene3d({ graph, layout, view, camera, variant, focusId, depth, emphasis, density, starId, core: coreSize, hiddenDomain, previousSides: sides.current }),
    [graph, layout, view, camera, variant, focusId, depth, emphasis, density, starId, coreSize, hiddenDomain],
  );
  useEffect(() => {
    sides.current = new Map(Array.from(scene.labels.values(), (label) => [label.id, label.side]));
  }, [scene]);
  const animate = motion && interactive;
  const motionDriver = useCanvasMotion({ graph, layout, view, camera, scene, variant, enabled: animate, paused, interactive, pinnedId: null, activeId: starId ?? activeId, moving, coarse });
  const glowId = `kg3-glow-${useId().replace(/[^\w-]/g, "")}`;

  const fallbackRoving = graph.domains[0]?.key ?? null;
  const roving = rovingId && graph.domains.some((domain) => domain.key === rovingId) ? rovingId : fallbackRoving;
  const fontSize = labelFont3d(variant, view.width);
  const domainSize = domainFont3d(variant, view.width);
  const hit = interactive ? HIT[variant] * (coarse && variant === "explorer" ? COARSE_HIT : 1) : 0;
  const focusDomain = scene.hood?.kind === "domain" ? (scene.hood.domain ?? null) : null;
  // 미리 보는 분야의 실제 연결(분야 안)에만 빛이 한 번 지나갑니다. 미리 보는 분야가 바뀔 때만 다시 지나갑니다.
  const sparks =
    animate && focusDomain && !hiddenDomain
      ? scene.links
          .filter((link) => link.tier === "near" && !link.cross)
          .map((link) => ({ key: `${focusDomain}|${link.key}`, source: link.source, target: link.target, from: link.a, to: link.b, length: Math.hypot(link.b.x - link.a.x, link.b.y - link.a.y) }))
      : [];

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = (event.target as HTMLElement).closest<HTMLElement>("[data-target-id]")?.dataset.targetId;
    if (!current) return;
    if (event.shiftKey && onCameraKey && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      onCameraKey(event.key);
      return;
    }
    if (onZoomKey && (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_")) {
      event.preventDefault();
      onZoomKey(event.key === "-" || event.key === "_" ? -1 : 1);
      return;
    }
    if (!isNavKey(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const targets = new Map<string, NavTarget>();
    for (const item of scene.domains) if (item.domain.id !== hiddenDomain) targets.set(item.domain.key, { id: item.domain.key, x: item.x, y: item.y });
    const next = navigateDomains(graph, targets, current, event.key);
    if (next === current) return;
    buttons.current.get(next)?.focus();
    // 화살표로 옮긴 초점은 늘 키보드 초점입니다 (분야 미리 보기).
    onKeyboardFocus?.(next);
  };

  const register = (id: string) => (element: HTMLButtonElement | null) => {
    if (element) buttons.current.set(id, element);
    else buttons.current.delete(id);
  };

  const behind = scene.order.slice(0, scene.behind);
  const front = scene.order.slice(scene.behind);
  const renderNode = (id: string) => {
    const node = graph.byId.get(id)!;
    if (node.domain === hiddenDomain) return null;
    const point = scene.points.get(id)!;
    const state = scene.states.get(id) ?? "idle";
    const star = id === starId;
    const opacity = nodeOpacity(state, node, point.fog);
    return (
      <g
        key={id}
        className="kg3-node"
        data-id={id}
        data-kind={node.kind}
        data-status={node.status}
        data-state={state}
        data-active={star ? "true" : undefined}
        transform={`translate(${fixed(point.x)} ${fixed(point.y)})`}
        opacity={fixed(star ? Math.max(0.9, opacity) : opacity)}
      >
        {interactive && <circle className="kg3-glow" r={fixed(point.r + 9)} fill={`url(#${glowId})`} opacity="0" />}
        {star && <circle className="kg3-halo" r={fixed(point.r + 5)} />}
        {star && animate && <circle className="kg3-pulse" r={fixed(point.r + 5)} />}
        <Glyph node={node} r={point.r} />
      </g>
    );
  };

  return (
    <div
      ref={motionDriver.ref}
      className="kg3-canvas"
      data-variant={variant}
      data-moving={moving ? "true" : undefined}
      data-focus={scene.hood ? scene.hood.kind : undefined}
      data-motion={animate ? (motionDriver.running ? "on" : "paused") : "off"}
      style={{ width: view.width, height: view.height }}
      onPointerMove={interactive ? motionDriver.onPointerMove : undefined}
      onPointerLeave={interactive ? motionDriver.onPointerLeave : undefined}
    >
      <svg className="kg3-svg" width={view.width} height={view.height} viewBox={`0 0 ${view.width} ${view.height}`} aria-hidden="true" focusable="false">
        {interactive && (
          <defs>
            <radialGradient id={glowId}>
              <stop offset="0" stopColor="currentColor" stopOpacity="0.5" />
              <stop offset="0.6" stopColor="currentColor" stopOpacity="0.16" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
        )}
        <path className="kg3-equator" d={scene.equator} />
        <g className="kg3-spokes">
          {scene.spokes.map((spoke) =>
            spoke.domain === hiddenDomain ? null : (
              <line
                key={spoke.domain}
                className="kg3-spoke"
                data-domain={spoke.domain}
                data-state={spoke.state}
                x1={fixed(scene.core.x)}
                y1={fixed(scene.core.y)}
                x2={fixed(spoke.x)}
                y2={fixed(spoke.y)}
              />
            ),
          )}
        </g>
        <g className="kg3-halos">
          {scene.domains.map((item) =>
            item.domain.id === hiddenDomain ? null : (
              <circle
                key={item.domain.id}
                className="kg3-halo-region"
                data-domain={item.domain.id}
                data-state={item.state}
                cx={fixed(item.x)}
                cy={fixed(item.y)}
                r={fixed(item.r)}
                opacity={fixed(haloOpacity(item.state, item.fog))}
              />
            ),
          )}
        </g>
        <g className="kg3-links">
          {scene.links.map((link) =>
            hiddenDomain && (graph.byId.get(link.source)!.domain === hiddenDomain || graph.byId.get(link.target)!.domain === hiddenDomain) ? null : (
              <line
                key={link.key}
                className="kg3-link"
                data-key={link.key}
                data-source={link.source}
                data-target={link.target}
                data-tier={link.tier}
                data-cross={link.cross ? "true" : undefined}
                data-relation={link.relation}
                x1={fixed(link.a.x)}
                y1={fixed(link.a.y)}
                x2={fixed(link.b.x)}
                y2={fixed(link.b.y)}
                opacity={fixed(linkOpacity(link.tier, (link.a.fog + link.b.fog) / 2, link.cross))}
              />
            ),
          )}
        </g>
        {sparks.length > 0 && (
          <g className="kg3-sparks">
            {sparks.map((spark) => (
              <line
                key={spark.key}
                className="kg3-spark"
                data-source={spark.source}
                data-target={spark.target}
                x1={fixed(spark.from.x)}
                y1={fixed(spark.from.y)}
                x2={fixed(spark.to.x)}
                y2={fixed(spark.to.y)}
                strokeDasharray={`9 ${fixed(spark.length + 18)}`}
                style={{ "--kg3-spark-length": fixed(spark.length), "--kg3-spark-segment": 9 } as CSSProperties}
              />
            ))}
          </g>
        )}
        <g className="kg3-nodes" data-depth="behind">
          {behind.map(renderNode)}
        </g>
        <circle className="kg3-core-glow" cx={fixed(scene.core.x)} cy={fixed(scene.core.y)} r={fixed(scene.core.box.width / 2 + 6)} />
        <g className="kg3-nodes" data-depth="front">
          {front.map(renderNode)}
        </g>
      </svg>
      <div
        className="kg3-overlay"
        role={interactive ? "group" : undefined}
        aria-label={interactive ? copy.globeLabel(identity, graph.counts) : undefined}
        aria-describedby={interactive ? describedBy : undefined}
        aria-hidden={interactive ? undefined : "true"}
        onKeyDown={interactive ? handleKeyDown : undefined}
      >
        {/* 중심 구체: 가리키거나 키보드로 초점을 맞출 때만 이름을 표시합니다. */}
        <span
          className="kg3-core-label"
          role="img"
          aria-label="Me"
          tabIndex={interactive ? 0 : undefined}
          style={{
            left: fixed(scene.core.box.left),
            top: fixed(scene.core.box.top),
            width: fixed(scene.core.box.width),
            height: fixed(scene.core.box.height),
            zIndex: 15,
          }}
        >
          <b aria-hidden="true">Me</b>
        </span>
        {interactive &&
          scene.domains.map((item, index) =>
            item.domain.id === hiddenDomain ? null : (
              <span
                key={`region-${item.domain.id}`}
                className="kg3-region-hit"
                data-domain={item.domain.id}
                aria-hidden="true"
                style={{ left: fixed(item.x - item.r), top: fixed(item.y - item.r), width: fixed(item.r * 2), height: fixed(item.r * 2), zIndex: 2 + index }}
                onClick={(event) => {
                  if (event.detail !== 0 && dragGuard?.current) return;
                  onOpen?.(item.domain.id);
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType === "touch") return;
                  motionDriver.setPointerTarget(item.domain.key);
                  if (!moving) onHover?.(item.domain.key);
                }}
                onPointerLeave={() => {
                  motionDriver.setPointerTarget(null);
                  onHover?.(null);
                }}
              />
            ),
          )}
        {interactive &&
          graph.nodes.map((node) => {
            const point = scene.points.get(node.id);
            if (!point || node.domain === hiddenDomain) return null;
            return (
              <span
                key={node.id}
                className="kg3-star"
                data-node-id={node.id}
                data-domain={node.domain}
                aria-hidden="true"
                style={{ left: fixed(point.x), top: fixed(point.y), width: hit, height: hit, zIndex: 20 + (scene.rank.get(node.id) ?? 0) }}
                onClick={(event) => {
                  if (event.detail !== 0 && dragGuard?.current) return;
                  onOpen?.(node.domain, node.id);
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType === "touch") return;
                  motionDriver.setPointerTarget(node.id);
                  if (!moving) onHover?.(node.id);
                }}
                onPointerLeave={() => {
                  motionDriver.setPointerTarget(null);
                  onHover?.(null);
                }}
              />
            );
          })}
        {/* 지식 이름 (넓게 보기의 확대 · 가리킨 별) — 누르는 대상이 아니라 글자만 (아래의 별을 가리지 않음) */}
        {graph.nodes.map((node) => {
          const label = scene.labels.get(node.id);
          const point = scene.points.get(node.id);
          if (!label || !point) return null;
          const state = scene.states.get(node.id);
          const star = node.id === starId;
          return (
            <span
              key={`label-${node.id}`}
              className="kg3-label"
              data-node-id={node.id}
              data-kind={node.kind}
              data-status={node.status}
              data-state={state}
              data-active={star ? "true" : undefined}
              data-side={label.side}
              aria-hidden="true"
              style={{
                left: fixed(label.box.left),
                top: fixed(label.box.top),
                fontSize,
                zIndex: star ? 420 : 140,
                opacity: (state === "idle" || state === "emphasis") && !star ? fixed(0.55 + 0.45 * point.fog) : undefined,
              }}
            >
              {node.label}
            </span>
          );
        })}
        {scene.domains.map((item) => {
          // 펼치는 동안 감춘 분야도 단추는 남겨 둡니다 — 접고 돌아올 때 초점을 돌려줄 자리 (보이지 않고 누를 수 없음).
          if (item.domain.id === hiddenDomain && !interactive) return null;
          const label = item.domain.id === hiddenDomain ? undefined : scene.labels.get(item.domain.key);
          const style: CSSProperties | undefined = label
            ? {
                left: fixed(label.box.left),
                top: fixed(label.box.top),
                width: fixed(label.box.width),
                height: fixed(label.box.height),
                fontSize: domainSize,
                zIndex: item.state === "focus" ? 360 : 300 + Math.round(frontness(item.depth) * 10),
              }
            : undefined;
          const content = (
            <>
              <span className="kg3-domain-name">{item.domain.label}</span>
              <span className="kg3-domain-count">{item.domain.evidenced}</span>
            </>
          );
          if (!interactive) {
            return label ? (
              <span key={item.domain.id} className="kg3-domain kg3-static-domain" data-domain={item.domain.id} data-state={item.state} style={style}>
                {content}
              </span>
            ) : null;
          }
          // 이름표를 놓지 못한 분야도 키보드·화면 낭독기로 고를 수 있게 묶음 가운데에 작은 단추를 둡니다.
          const fallback: CSSProperties = { left: fixed(item.x - 7), top: fixed(item.y - 7), width: 14, height: 14, zIndex: 290 };
          return (
            <button
              key={item.domain.id}
              ref={register(item.domain.key)}
              type="button"
              className="kg3-domain"
              data-target-id={item.domain.key}
              data-domain={item.domain.id}
              data-state={item.state}
              data-labelled={label ? "true" : undefined}
              data-hidden={item.domain.id === hiddenDomain ? "true" : undefined}
              data-active={item.domain.key === activeId ? "true" : undefined}
              aria-label={copy.domainOpenName(item.domain)}
              tabIndex={item.domain.key === roving ? 0 : -1}
              style={style ?? fallback}
              onClick={(event) => {
                if (event.detail !== 0 && dragGuard?.current) return;
                onOpen?.(item.domain.id);
              }}
              onPointerEnter={(event) => {
                if (event.pointerType === "touch") return;
                motionDriver.setPointerTarget(item.domain.key);
                if (!moving) onHover?.(item.domain.key);
              }}
              onPointerLeave={() => {
                motionDriver.setPointerTarget(null);
                onHover?.(null);
              }}
              onFocus={(event) => {
                onRove?.(item.domain.key);
                if (isFocusVisible(event.currentTarget)) onKeyboardFocus?.(item.domain.key);
              }}
              onBlur={() => onKeyboardFocus?.(null)}
            >
              {label ? content : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});
