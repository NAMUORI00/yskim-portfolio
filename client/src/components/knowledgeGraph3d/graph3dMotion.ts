/*
 * 3D 지식 지도의 은은한 움직임 — 순수 함수(테스트 대상)와, 모든 지도가 함께 쓰는 프레임 시계 하나, 움직임 켬/끔 설정.
 * ─────────────────────────────────────────────────────────────
 * 숨 쉬는 움직임 (난수 없음 — 노드·분야 id 의 해시로 주기와 위상을 정함)
 *  - 분야 묶음이 함께 천천히 떠다니고(13–19초 주기), 묶음이 숨 쉬듯 조금 부풀었다 줄어들고(7–10초),
 *    점마다 아주 작게 흔들립니다(5.5–9.5초). 모두 실제 3D 자리에 더한 뒤 같은 카메라로 투영합니다.
 *  - 크기는 화면에서 몇 px 로 묶입니다(레일 2.4px · 넓게 보기 4.5px, 원근 배율 전). 세기 0 이면 결정적인 기준 배치와 같습니다.
 *  - 살아 있는 지도라는 느낌만 줍니다. 연결이나 데이터가 실제로 흐르거나 실행된다는 뜻이 아닙니다.
 * 기울기(시차): 빈 곳을 가리키면 구가 그쪽으로 살짝(최대 6°, 화면에서 레일 10px · 넓게 보기 16px 안팎) 돕니다.
 *  사용자의 카메라(끌기·확대)에는 더하지 않고 그릴 때만 더하므로 쌓이거나 처음 시점을 바꾸지 않습니다.
 * 잠잠함: 가리킨 곳 근처의 점과 고른 점은 움직임이 0 으로 잦아들어, 누르려는 점이 달아나지 않습니다.
 */
import type { Canvas3DVariant } from "./Graph3DCanvas";
import { CAMERA_DISTANCE, clamp, projectPoint, type Camera3D, type Layout3D, type Vec3, type View3D } from "./graph3dLayout";
import type { DomainId, KnowledgeGraph } from "./graph3dModel";

/** 숨 쉬는 움직임의 최대 화면 이동 (px, 궤도 중심 깊이 기준) — 서랍의 작은 지도는 움직이지 않습니다 */
export const DRIFT_PX: Record<Canvas3DVariant, number> = { rail: 2.4, drawer: 0, explorer: 4.5 };
/** 빈 곳을 가리킬 때 구가 도는 최대 화면 이동 (px, 궤도 중심 깊이 기준) — 가리킨 쪽을 향해 은은하게 */
export const PARALLAX_PX: Record<Canvas3DVariant, number> = { rail: 10, drawer: 0, explorer: 16 };
/** 기울기 각도 상한 (6°) */
export const PARALLAX_MAX = (6 * Math.PI) / 180;
/** 위아래 기울기는 좌우의 60% 만 */
export const PARALLAX_PITCH_SHARE = 0.6;

/** 움직임 성분의 몫 — 합이 1 이라 어긋남의 길이가 세기를 넘지 않습니다 */
const SHARE = { drift: 0.45, breath: 0.3, wobble: 0.25 } as const;
const DRIFT_Y = 0.8;
const DRIFT_NORM = Math.sqrt(2 + DRIFT_Y * DRIFT_Y);
const SQRT3 = Math.sqrt(3);

function hash01(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

interface Wave {
  omega: number;
  phase: number;
}

function wave(seed: string, minSeconds: number, maxSeconds: number): Wave {
  const period = minSeconds + (maxSeconds - minSeconds) * hash01(`${seed}:period`);
  return { omega: (Math.PI * 2) / period, phase: hash01(`${seed}:phase`) * Math.PI * 2 };
}

function sinAt(item: Wave, t: number): number {
  return Math.sin(item.omega * t + item.phase);
}

/* ── 움직임 모델 (배치마다 한 번) ───────────────── */

export interface MotionModel {
  nodes: Map<string, { domain: DomainId; /** 분야 가운데에서의 방향 (묶음 가장자리가 길이 1) */ radial: Vec3; wobble: [Wave, Wave, Wave] }>;
  domains: Map<DomainId, { drift: [Wave, Wave, Wave]; breath: Wave; /** 분야 가운데에서 가장 먼 구성 노드까지 */ reach: number }>;
}

export function buildMotionModel(graph: KnowledgeGraph, layout: Pick<Layout3D, "positions" | "centers">): MotionModel {
  const domains: MotionModel["domains"] = new Map();
  for (const domain of graph.domains) {
    const center = layout.centers.get(domain.id);
    if (!center) continue;
    const reach = Math.max(
      1e-6,
      ...domain.members.map((id) => {
        const point = layout.positions.get(id);
        return point ? Math.hypot(point.x - center.x, point.y - center.y, point.z - center.z) : 0;
      }),
    );
    domains.set(domain.id, {
      drift: [wave(`${domain.id}:x`, 13, 19), wave(`${domain.id}:y`, 13, 19), wave(`${domain.id}:z`, 13, 19)],
      breath: wave(`${domain.id}:breath`, 7, 10),
      reach,
    });
  }
  const nodes: MotionModel["nodes"] = new Map();
  for (const node of graph.nodes) {
    const point = layout.positions.get(node.id);
    const center = layout.centers.get(node.domain);
    const reach = domains.get(node.domain)?.reach;
    if (!point || !center || !reach) continue;
    nodes.set(node.id, {
      domain: node.domain,
      radial: { x: (point.x - center.x) / reach, y: (point.y - center.y) / reach, z: (point.z - center.z) / reach },
      wobble: [wave(`${node.id}:x`, 5.5, 9.5), wave(`${node.id}:y`, 5.5, 9.5), wave(`${node.id}:z`, 5.5, 9.5)],
    });
  }
  return { nodes, domains };
}

/** 분야 묶음이 함께 떠다니는 방향 (길이 1 이하) */
export function domainDrift(model: MotionModel, domain: DomainId, t: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const item = model.domains.get(domain);
  out.x = item ? sinAt(item.drift[0], t) / DRIFT_NORM : 0;
  out.y = item ? (DRIFT_Y * sinAt(item.drift[1], t)) / DRIFT_NORM : 0;
  out.z = item ? sinAt(item.drift[2], t) / DRIFT_NORM : 0;
  return out;
}

/** 묶음의 숨쉬기 (-1 … 1) */
export function domainBreath(model: MotionModel, domain: DomainId, t: number): number {
  const item = model.domains.get(domain);
  return item ? sinAt(item.breath, t) : 0;
}

const scratch: Vec3 = { x: 0, y: 0, z: 0 };

/** 노드가 기준 자리에서 벗어나는 방향과 크기 (길이 1 이하 — 세기를 곱해 씁니다) */
export function nodeDrift(model: MotionModel, id: string, t: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const item = model.nodes.get(id);
  if (!item) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return out;
  }
  const drift = domainDrift(model, item.domain, t, scratch);
  const breath = domainBreath(model, item.domain, t);
  const [wx, wy, wz] = item.wobble;
  out.x = SHARE.drift * drift.x + SHARE.breath * item.radial.x * breath + (SHARE.wobble * sinAt(wx, t)) / SQRT3;
  out.y = SHARE.drift * drift.y + SHARE.breath * item.radial.y * breath + (SHARE.wobble * sinAt(wy, t)) / SQRT3;
  out.z = SHARE.drift * drift.z + SHARE.breath * item.radial.z * breath + (SHARE.wobble * sinAt(wz, t)) / SQRT3;
  return out;
}

/* ── 세기 · 기울기 · 잠잠함 ───────────────── */

/** 배치 1 단위가 화면에서 몇 px 인지 (궤도 중심 깊이) */
export function pxPerUnit(view: Pick<View3D, "focal">, camera: Pick<Camera3D, "zoom">): number {
  return (view.focal * camera.zoom) / CAMERA_DISTANCE;
}

/** 숨 쉬는 움직임의 크기 (배치 단위) — 확대해도 화면에서의 크기는 같습니다 */
export function driftAmplitude(variant: Canvas3DVariant, view: Pick<View3D, "focal">, camera: Pick<Camera3D, "zoom">): number {
  return DRIFT_PX[variant] / Math.max(1e-6, pxPerUnit(view, camera));
}

/** 빈 곳을 가리킬 때 기울일 수 있는 최대 각도 (라디안) — 3° 와, 가장 먼 점이 PARALLAX_PX 만큼 움직이는 각도 가운데 작은 쪽 */
export function parallaxLimit(variant: Canvas3DVariant, view: Pick<View3D, "focal">, camera: Pick<Camera3D, "zoom">, layout: Pick<Layout3D, "radius">): number {
  const px = PARALLAX_PX[variant];
  if (px <= 0) return 0;
  return Math.min(PARALLAX_MAX, px / Math.max(1e-6, pxPerUnit(view, camera) * layout.radius));
}

export interface Parallax {
  yaw: number;
  pitch: number;
}

/** 가리킨 자리 → 기울기 목표 (캔버스 가운데면 0, 가장자리면 상한). 가리키지 않으면 0 으로 돌아갑니다. */
export function parallaxTarget(pointer: { x: number; y: number } | null, view: Pick<View3D, "width" | "height">, limit: number): Parallax {
  if (!pointer || limit <= 0) return { yaw: 0, pitch: 0 };
  const nx = clamp((pointer.x - view.width / 2) / Math.max(1, view.width / 2), -1, 1);
  const ny = clamp((pointer.y - view.height / 2) / Math.max(1, view.height / 2), -1, 1);
  return { yaw: nx * limit, pitch: ny * limit * PARALLAX_PITCH_SHARE };
}

/** 목표로 지수적으로 다가갑니다 (tau ms 마다 남은 거리의 1/e) — 넘치거나 흔들리지 않습니다 */
export function approach(current: number, target: number, dt: number, tau: number): number {
  if (tau <= 0) return target;
  return target + (current - target) * Math.exp(-Math.max(0, dt) / tau);
}

/** 가리킨 곳과의 거리 → 움직임 배율 (inner 안은 0, outer 밖은 1, 사이는 부드럽게) */
export function calmFactor(distance: number, inner: number, outer: number): number {
  if (outer <= inner) return distance <= inner ? 0 : 1;
  const t = clamp((distance - inner) / (outer - inner), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 가리킨 곳 가까운 점의 은은한 빛 (0 … 1) */
export function glowStrength(distance: number, radius: number): number {
  if (radius <= 0) return 0;
  const t = clamp(1 - distance / radius, 0, 1);
  return t * t;
}

/* ── 한 프레임의 화면 자리 ───────────────── */

export interface ScreenXY {
  x: number;
  y: number;
}

export interface MotionFrame {
  nodes: Map<string, ScreenXY>;
  /** 분야 묶음 가운데와 묶음 원의 숨쉬기 배율 */
  domains: Map<DomainId, ScreenXY & { scale: number }>;
}

export interface MotionFrameInput {
  model: MotionModel;
  layout: Layout3D;
  view: View3D;
  /** 사용자의 카메라 — 바꾸지 않고, 기울기는 그릴 때만 더합니다 */
  camera: Camera3D;
  /** 움직임 시계 (초) */
  time: number;
  /** 어긋남의 최대 길이 (배치 단위) — 0 이면 기준 자리 */
  amplitude: number;
  parallax: Parallax;
  /** 노드마다 움직임 배율 (가리킨 곳 근처·고른 점은 0 쪽) */
  calm?: Map<string, number>;
  domainCalm?: Map<DomainId, number>;
}

/**
 * 점·분야 묶음의 이번 프레임 화면 자리. 점 모양·이름표 단추·연결선 끝·분야 이름이 모두 이 값 하나에서 나옵니다.
 * out 을 주면 그 안의 객체를 다시 씁니다 (프레임마다 새로 만들지 않음).
 */
export function motionFrame(input: MotionFrameInput, out?: MotionFrame): MotionFrame {
  const { model, layout, view, time, amplitude, calm, domainCalm } = input;
  const frame = out ?? { nodes: new Map(), domains: new Map() };
  const camera: Camera3D = { ...input.camera, yaw: input.camera.yaw + input.parallax.yaw, pitch: input.camera.pitch + input.parallax.pitch };
  const offset: Vec3 = { x: 0, y: 0, z: 0 };
  const point: Vec3 = { x: 0, y: 0, z: 0 };
  layout.positions.forEach((base, id) => {
    const k = amplitude * (calm?.get(id) ?? 1);
    if (k > 0) nodeDrift(model, id, time, offset);
    point.x = base.x + (k > 0 ? offset.x * k : 0);
    point.y = base.y + (k > 0 ? offset.y * k : 0);
    point.z = base.z + (k > 0 ? offset.z * k : 0);
    const projected = projectPoint(view, camera, layout, point);
    const slot = frame.nodes.get(id);
    if (slot) {
      slot.x = projected.x;
      slot.y = projected.y;
    } else frame.nodes.set(id, { x: projected.x, y: projected.y });
  });
  layout.centers.forEach((center, domain) => {
    const k = amplitude * (domainCalm?.get(domain) ?? 1);
    if (k > 0) domainDrift(model, domain, time, offset);
    point.x = center.x + (k > 0 ? offset.x * k * SHARE.drift : 0);
    point.y = center.y + (k > 0 ? offset.y * k * SHARE.drift : 0);
    point.z = center.z + (k > 0 ? offset.z * k * SHARE.drift : 0);
    const projected = projectPoint(view, camera, layout, point);
    // 묶음 원은 구성 노드가 숨 쉬는 만큼 커졌다 작아집니다 (가장자리 노드의 바깥쪽 이동 ÷ 묶음 반지름).
    const reach = model.domains.get(domain)?.reach ?? 1;
    const scale = k > 0 ? 1 + (k * SHARE.breath * domainBreath(model, domain, time)) / reach : 1;
    const slot = frame.domains.get(domain);
    if (slot) {
      slot.x = projected.x;
      slot.y = projected.y;
      slot.scale = scale;
    } else frame.domains.set(domain, { x: projected.x, y: projected.y, scale });
  });
  return frame;
}

/* ── 프레임 시계 (모든 지도가 requestAnimationFrame 하나를 함께 씀) ── */

type FrameCallback = (now: number) => void;
const frameSubscribers = new Set<FrameCallback>();
let frameHandle = 0;

function runFrame(now: number) {
  frameHandle = 0;
  for (const callback of Array.from(frameSubscribers)) callback(now);
  if (frameSubscribers.size && !frameHandle) frameHandle = requestAnimationFrame(runFrame);
}

/** 다음 프레임부터 매 프레임 부릅니다. 돌려받은 함수로 그만 받고, 받는 쪽이 없으면 시계도 멈춥니다. */
export function subscribeFrames(callback: FrameCallback): () => void {
  frameSubscribers.add(callback);
  if (!frameHandle && typeof requestAnimationFrame === "function") frameHandle = requestAnimationFrame(runFrame);
  return () => {
    frameSubscribers.delete(callback);
    if (!frameSubscribers.size && frameHandle) {
      cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    }
  };
}

/** 지금 프레임을 받고 있는 수 (테스트에서 멈춤·하나의 시계를 확인) */
export function activeFrameSubscribers(): number {
  return frameSubscribers.size;
}

/* ── 움직임 켬/끔 (레일·넓게 보기·서랍이 함께 씀 — 이 미리보기 안에서만) ── */

export type MotionChoice = "on" | "off";
let motionChoice: MotionChoice = "on";
const choiceListeners = new Set<() => void>();

export function getMotionChoice(): MotionChoice {
  return motionChoice;
}

export function setMotionChoice(next: MotionChoice) {
  if (next === motionChoice) return;
  motionChoice = next;
  for (const listener of Array.from(choiceListeners)) listener();
}

export function subscribeMotionChoice(listener: () => void): () => void {
  choiceListeners.add(listener);
  return () => {
    choiceListeners.delete(listener);
  };
}
