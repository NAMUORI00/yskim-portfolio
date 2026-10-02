/*
 * 3D 지식 지도(전체 보기)의 배치·투영·이름표 — 순수 함수만 둡니다 (테스트 대상).
 * ─────────────────────────────────────────────────────────────
 * 사람을 가운데 둔 지식의 구(globe). 가운데(원점)는 "나"의 자리로 비워 두고, 분야 8곳이 그 둘레의 겉면에 별자리처럼 놓입니다.
 * 배치 (난수 없음 — 같은 콘텐츠면 늘 같은 모양, 언어와 관계없음)
 *  1) 분야 자리: 조금 세로로 긴 타원체 겉면에 피보나치 나선으로 고르게 자리를 내고, 분야 사이 연결이 짧아지도록
 *     분야를 자리에 배정합니다 (서로 많이 이어진 분야가 이웃).
 *  2) 노드: 자기 분야 자리 둘레에서 시작해, 연결은 용수철·가까운 점끼리는 밀어내기·자기 분야로 끌어당기기로 풀고,
 *     겉면 쪽으로 끌어 가운데를 비웁니다. 다른 분야와 많이 이어진 노드(예: Python)는 덜 끌려 분야 사이 겉면에 놓입니다.
 *  3) 원점(사람 자리)은 그대로 두고 가로 반지름을 1로 맞춥니다. 처음 시점은 분야 이름과 가운데 이름이 모든 레일 폭·두 언어에서
 *     다 들어가고, 분야 묶음이 가운데 이름을 가리지 않는 방향입니다.
 * 투영: 세로축을 도는 궤도 카메라(좌우 yaw · 내려다보는 pitch)와 원근 투영. 가까운 점은 크고 진하며 먼 점은 작고 흐립니다.
 * 점 크기는 노드 종류만 나타냅니다 (연결 수·숙련도가 아님). 가운데에서 분야로 가는 선은 정리(묶음)일 뿐 숙련도가 아닙니다.
 */
import { estimateTextWidth, type LabelBox, type LabelObstacle } from "@/components/knowledgeMap/knowledgeMapLayout";
import { DOMAINS, type DomainId } from "./knowledgeData";
import type { KnowledgeGraph, KNode, Neighborhood } from "./graph3dModel";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Layout3D {
  /** 정규화한 자리 — 가로(x·z) 반지름 1, 위쪽이 +y */
  positions: Map<string, Vec3>;
  /** 분야 묶음의 가운데 (구성 노드의 평균) */
  centers: Map<DomainId, Vec3>;
  /** 분야 묶음의 퍼짐 (구성 노드가 가운데에서 떨어진 거리의 제곱평균제곱근) */
  spread: Map<DomainId, number>;
  /** 처음 보여 줄 방향 (라디안) */
  yaw: number;
  /** 모든 점을 담는 공의 반지름 — 안개 단계에 씁니다 */
  radius: number;
  /** 분야 자리가 놓인 겉면의 가로 반지름 (정규화한 단위) — 적도 고리를 그릴 때 씁니다 */
  shell: number;
}

/* ── 배치 상수 (분야 자리 사이 거리 ≈ 1 단위) ── */

/** 분야 자리를 놓는 타원체의 세로 배율 — 구에 가깝게, 레일(세로가 조금 긴 캔버스)의 위아래 이름 자리를 남깁니다 */
const ANCHOR_Y_SCALE = 1.12;
/** 겉면(분야 자리가 놓인 타원체)으로 끄는 힘 */
const SHELL_STRENGTH = 0.09;
/** 가운데(사람 자리)에서 노드가 떨어져 있어야 하는 거리 (겉면 반지름 1 기준) */
export const CORE_CLEARANCE = 0.6;
const REST_IN = 0.2;
const REST_CROSS = 0.42;
const SPRING_IN = 0.7;
const SPRING_CROSS = 0.3;
const CHARGE = -0.006;
const CHARGE_RANGE = 0.45;
const CLUSTER_STRENGTH = 0.07;
/** 다른 분야와 이어진 비율만큼 자기 분야로 덜 끌립니다 */
const BRIDGE_RELEASE = 0.6;
const COLLIDE_RADIUS = 0.06;
const ITERATIONS = 320;
const START_ALPHA = 0.8;
const ALPHA_MIN = 0.002;
const VELOCITY_DECAY = 0.42;

/* ── 카메라 상수 ───────────────────────────── */

/** 카메라와 궤도 중심 사이 거리 (가로 반지름 1 기준) — 원근을 은은하게 */
export const CAMERA_DISTANCE = 4.8;
export const DEFAULT_PITCH = 0.34;
export const PITCH_LIMITS = [0.06, 0.62] as const;
export const ZOOM_LIMITS = [1, 2.8] as const;
/** 가장 먼 점의 진하기 = 1 - FOG_STRENGTH */
export const FOG_STRENGTH = 0.56;
/** 처음 한 번 살짝 돌아오며 입체감을 보여 주는 각도와 시간 */
export const INTRO_SWEEP = 0.55;
export const INTRO_MS = 1100;

/* ── 작은 도우미 ───────────────────────────── */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hash01(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/* ── 1) 분야 자리 ──────────────────────────── */

/** 피보나치 나선으로 고르게 낸 자리 — 위에서 아래로 */
export function anchorSlots(count: number): Vec3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = count === 1 ? 0 : 1 - (2 * (index + 0.5)) / count;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = index * golden;
    return { x: round(Math.cos(theta) * r), y: round(y * ANCHOR_Y_SCALE), z: round(Math.sin(theta) * r) };
  });
}

/** 분야 사이 연결 무게 — 설명용 바탕 관계는 절반으로 셉니다 */
export function domainAffinity(graph: KnowledgeGraph): Map<string, number> {
  const weights = new Map<string, number>();
  for (const link of graph.links) {
    const a = graph.byId.get(link.source)!.domain;
    const b = graph.byId.get(link.target)!.domain;
    if (a === b) continue;
    const key = [a, b].sort().join("|");
    weights.set(key, (weights.get(key) ?? 0) + (link.relation === "prerequisite" ? 0.5 : 1));
  }
  return weights;
}

/** 분야를 자리에 배정합니다 — 8개 이하는 모든 배정을 재어 연결 길이의 합이 가장 짧은 것을, 그보다 많으면 맞바꾸기로 줄입니다. */
export function domainAnchors(graph: KnowledgeGraph): Map<DomainId, Vec3> {
  const ids = graph.domains.map((domain) => domain.id);
  const count = ids.length;
  const slots = anchorSlots(count);
  const affinity = domainAffinity(graph);
  const weight = ids.map((a) => ids.map((b) => (a === b ? 0 : (affinity.get([a, b].sort().join("|")) ?? 0))));
  const gap = slots.map((p) => slots.map((q) => distance(p, q)));
  /** slotOf[i] = i 번째 분야의 자리 */
  const cost = (slotOf: number[]) => {
    let total = 0;
    for (let i = 0; i < count; i += 1) for (let j = i + 1; j < count; j += 1) total += weight[i][j] * gap[slotOf[i]][slotOf[j]];
    return total;
  };
  let best = ids.map((_, index) => index);
  let bestCost = cost(best);
  if (count <= 8) {
    const used = new Array<boolean>(count).fill(false);
    const current: number[] = [];
    const walk = () => {
      if (current.length === count) {
        const total = cost(current);
        if (total < bestCost - 1e-9) {
          bestCost = total;
          best = [...current];
        }
        return;
      }
      for (let slot = 0; slot < count; slot += 1) {
        if (used[slot]) continue;
        used[slot] = true;
        current.push(slot);
        walk();
        current.pop();
        used[slot] = false;
      }
    };
    walk();
  } else {
    for (let improved = true; improved; ) {
      improved = false;
      for (let i = 0; i < count; i += 1) {
        for (let j = i + 1; j < count; j += 1) {
          const trial = [...best];
          [trial[i], trial[j]] = [trial[j], trial[i]];
          const total = cost(trial);
          if (total < bestCost - 1e-9) {
            best = trial;
            bestCost = total;
            improved = true;
          }
        }
      }
    }
  }
  return new Map(ids.map((id, index) => [id, slots[best[index]]]));
}

/* ── 2) 노드 ────────────────────────────────── */

/** 다른 분야와 이어진 연결의 비율 (0이면 자기 분야 안에서만 이어짐) */
export function bridgeFraction(graph: KnowledgeGraph, id: string): number {
  const node = graph.byId.get(id);
  const others = graph.neighbors.get(id) ?? [];
  if (!node || !others.length) return 0;
  return others.filter((other) => graph.byId.get(other)!.domain !== node.domain).length / others.length;
}

export function initialPositions(graph: KnowledgeGraph, anchors: Map<DomainId, Vec3>): Map<string, Vec3> {
  const start = new Map<string, Vec3>();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (const domain of graph.domains) {
    const anchor = anchors.get(domain.id)!;
    const members = domain.members;
    const shell = 0.08 + 0.035 * Math.sqrt(members.length);
    members.forEach((id, index) => {
      const y = members.length === 1 ? 0 : 1 - (2 * (index + 0.5)) / members.length;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = index * golden + hash01(domain.id) * Math.PI * 2;
      let point = { x: anchor.x + Math.cos(theta) * r * shell, y: anchor.y + y * shell, z: anchor.z + Math.sin(theta) * r * shell };
      // 다른 분야와 이어진 노드는 그쪽으로 조금 옮겨 시작합니다.
      const others = (graph.neighbors.get(id) ?? []).map((other) => graph.byId.get(other)!.domain).filter((other) => other !== domain.id);
      if (others.length) {
        const mean = others.reduce((sum, other) => {
          const target = anchors.get(other)!;
          return { x: sum.x + target.x / others.length, y: sum.y + target.y / others.length, z: sum.z + target.z / others.length };
        }, { x: 0, y: 0, z: 0 });
        const pull = 0.3 * bridgeFraction(graph, id);
        point = { x: point.x + (mean.x - anchor.x) * pull, y: point.y + (mean.y - anchor.y) * pull, z: point.z + (mean.z - anchor.z) * pull };
      }
      start.set(id, point);
    });
  }
  return start;
}

interface Body {
  id: string;
  anchor: Vec3;
  pull: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

/** d3-force 와 같은 방식을 3차원으로 (정확한 쌍별 계산, 난수 없음) */
export function relax(graph: KnowledgeGraph, anchors: Map<DomainId, Vec3>, start: Map<string, Vec3>, iterations = ITERATIONS): Map<string, Vec3> {
  const bodies: Body[] = graph.nodes.map((node) => {
    const point = start.get(node.id)!;
    return {
      id: node.id,
      anchor: anchors.get(node.domain)!,
      pull: CLUSTER_STRENGTH * (1 - BRIDGE_RELEASE * bridgeFraction(graph, node.id)),
      x: point.x,
      y: point.y,
      z: point.z,
      vx: 0,
      vy: 0,
      vz: 0,
    };
  });
  const byId = new Map(bodies.map((body) => [body.id, body]));
  const degree = (id: string) => Math.max(1, graph.neighbors.get(id)?.length ?? 1);
  const springs = graph.links.map((link) => {
    const same = graph.byId.get(link.source)!.domain === graph.byId.get(link.target)!.domain;
    const ds = degree(link.source);
    const dt = degree(link.target);
    return {
      source: byId.get(link.source)!,
      target: byId.get(link.target)!,
      distance: same ? REST_IN : REST_CROSS,
      strength: (same ? SPRING_IN : SPRING_CROSS) / Math.min(ds, dt),
      bias: ds / (ds + dt),
    };
  });
  let alpha = START_ALPHA;
  const decay = 1 - Math.pow(ALPHA_MIN / START_ALPHA, 1 / Math.max(1, iterations));

  for (let step = 0; step < iterations; step += 1) {
    alpha -= alpha * decay;

    for (const spring of springs) {
      const { source, target } = spring;
      let dx = target.x + target.vx - source.x - source.vx;
      let dy = target.y + target.vy - source.y - source.vy;
      let dz = target.z + target.vz - source.z - source.vz;
      const length = Math.hypot(dx, dy, dz) || 1e-6;
      const k = ((length - spring.distance) / length) * alpha * spring.strength;
      dx *= k;
      dy *= k;
      dz *= k;
      target.vx -= dx * spring.bias;
      target.vy -= dy * spring.bias;
      target.vz -= dz * spring.bias;
      source.vx += dx * (1 - spring.bias);
      source.vy += dy * (1 - spring.bias);
      source.vz += dz * (1 - spring.bias);
    }

    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const squared = Math.max(dx * dx + dy * dy + dz * dz, 0.0004);
        if (squared > CHARGE_RANGE * CHARGE_RANGE) continue;
        const w = (CHARGE * alpha) / squared;
        a.vx += dx * w;
        a.vy += dy * w;
        a.vz += dz * w;
        b.vx -= dx * w;
        b.vy -= dy * w;
        b.vz -= dz * w;
      }
    }

    for (const body of bodies) {
      body.vx += (body.anchor.x - body.x) * body.pull * alpha;
      body.vy += (body.anchor.y - body.y) * body.pull * alpha;
      body.vz += (body.anchor.z - body.z) * body.pull * alpha;
      // 겉면 쪽으로: 가운데(사람 자리)를 비우고, 분야 사이 다리 노드도 겉면을 따라 놓이게 합니다.
      const shell = shellRadius(body);
      if (shell > 1e-6) {
        const radial = ((1 - shell) * SHELL_STRENGTH * alpha) / shell;
        body.vx += body.x * radial;
        body.vy += body.y * radial;
        body.vz += body.z * radial;
      }
      body.vx *= 1 - VELOCITY_DECAY;
      body.vy *= 1 - VELOCITY_DECAY;
      body.vz *= 1 - VELOCITY_DECAY;
      body.x += body.vx;
      body.y += body.vy;
      body.z += body.vz;
    }

    // 겹친 점은 바로 떼어 놓습니다.
    const minimum = COLLIDE_RADIUS * 2;
    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dz = b.z - a.z;
        let gap = Math.hypot(dx, dy, dz);
        if (gap >= minimum) continue;
        if (gap < 1e-6) {
          const angle = hash01(`${a.id}|${b.id}`) * Math.PI * 2;
          dx = Math.cos(angle);
          dy = 0;
          dz = Math.sin(angle);
          gap = 1;
        }
        const push = ((minimum - Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)) / 2) * 0.7;
        a.x -= (dx / gap) * push;
        a.y -= (dy / gap) * push;
        a.z -= (dz / gap) * push;
        b.x += (dx / gap) * push;
        b.y += (dy / gap) * push;
        b.z += (dz / gap) * push;
      }
    }

    // 가운데는 사람 자리로 비워 둡니다 — 너무 안쪽으로 들어온 점은 바로 바깥으로 옮깁니다.
    for (const body of bodies) {
      const shell = shellRadius(body);
      if (shell >= CORE_CLEARANCE) continue;
      if (shell < 1e-6) {
        const angle = hash01(body.id) * Math.PI * 2;
        body.x = Math.cos(angle) * CORE_CLEARANCE;
        body.y = 0;
        body.z = Math.sin(angle) * CORE_CLEARANCE;
        continue;
      }
      const scale = CORE_CLEARANCE / shell;
      body.x *= scale;
      body.y *= scale;
      body.z *= scale;
    }
  }
  return new Map(bodies.map((body) => [body.id, { x: body.x, y: body.y, z: body.z }]));
}

/** 분야 자리가 놓인 타원체(겉면 반지름 1)를 기준으로 잰 원점에서의 거리 */
function shellRadius(point: Vec3): number {
  return Math.hypot(point.x, point.y / ANCHOR_Y_SCALE, point.z);
}

/* ── 3) 정규화 ──────────────────────────────── */

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/** 배치의 가로 반지름 (원점 = 사람 자리에서 가장 먼 점까지) */
function horizontalReach(graph: KnowledgeGraph, raw: Map<string, Vec3>): number {
  return Math.max(1e-6, ...graph.nodes.map((node) => Math.hypot(raw.get(node.id)!.x, raw.get(node.id)!.z)));
}

/** 가로 반지름을 1로 맞춥니다. 원점(사람 자리)은 옮기지 않고, 방향은 분야 자리에서 이미 정해져 있어 돌리지 않습니다. */
export function normalizeLayout(graph: KnowledgeGraph, raw: Map<string, Vec3>): Map<string, Vec3> {
  const radius = horizontalReach(graph, raw);
  return new Map(
    graph.nodes.map((node) => {
      const point = raw.get(node.id)!;
      return [node.id, { x: round(point.x / radius), y: round(point.y / radius), z: round(point.z / radius) }];
    }),
  );
}

export function domainGeometry(graph: KnowledgeGraph, positions: Map<string, Vec3>) {
  const centers = new Map<DomainId, Vec3>();
  const spread = new Map<DomainId, number>();
  for (const domain of graph.domains) {
    const points = domain.members.map((id) => positions.get(id)!);
    const center = { x: round(mean(points.map((p) => p.x))), y: round(mean(points.map((p) => p.y))), z: round(mean(points.map((p) => p.z))) };
    centers.set(domain.id, center);
    spread.set(domain.id, round(Math.sqrt(mean(points.map((p) => distance(p, center) ** 2)))));
  }
  return { centers, spread };
}

/* ── 투영 ───────────────────────────────────── */

export interface Camera3D {
  yaw: number;
  /** 내려다보는 각 (라디안) */
  pitch: number;
  zoom: number;
  /** 확대한 뒤 옮긴 거리 (px) */
  panX: number;
  panY: number;
}

export function defaultCamera(layout: Pick<Layout3D, "yaw">): Camera3D {
  return { yaw: layout.yaw, pitch: DEFAULT_PITCH, zoom: 1, panX: 0, panY: 0 };
}

/** 카메라 공간: x 오른쪽, y 위, z 카메라 쪽 (클수록 가까움) */
export function toCamera(point: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = point.x * cy + point.z * sy;
  const z1 = -point.x * sy + point.z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return { x: x1, y: point.y * cp - z1 * sp, z: point.y * sp + z1 * cp };
}

export interface View3D {
  width: number;
  height: number;
  /** 깊이 1 에서의 px 배율 */
  focal: number;
  cx: number;
  cy: number;
}

export interface FitPadding {
  padX: number;
  padTop: number;
  padBottom: number;
}

/**
 * 캔버스 크기에 맞춥니다. 모든 방향(24곳)과 각도 범위의 양 끝을 미리 재어, 돌리거나 기울여도 그림이 캔버스를 벗어나지 않고
 * 배율이 바뀌지 않게 합니다.
 */
export function fitView(layout: Pick<Layout3D, "positions">, width: number, height: number, padding: FitPadding): View3D {
  const points = Array.from(layout.positions.values());
  let maxX = 1e-6;
  let maxY = -Infinity;
  let minY = Infinity;
  for (const pitch of [PITCH_LIMITS[0], DEFAULT_PITCH, PITCH_LIMITS[1]]) {
    for (let step = 0; step < 24; step += 1) {
      const yaw = (step / 24) * Math.PI * 2;
      for (const point of points) {
        const c = toCamera(point, yaw, pitch);
        const s = 1 / (CAMERA_DISTANCE - c.z);
        maxX = Math.max(maxX, Math.abs(c.x * s));
        maxY = Math.max(maxY, c.y * s);
        minY = Math.min(minY, c.y * s);
      }
    }
  }
  const innerWidth = Math.max(1, width - 2 * padding.padX);
  const innerHeight = Math.max(1, height - padding.padTop - padding.padBottom);
  const focal = Math.max(1, Math.min(innerWidth / (2 * maxX), innerHeight / Math.max(1e-6, maxY - minY)));
  const slack = innerHeight - (maxY - minY) * focal;
  return { width, height, focal, cx: width / 2, cy: padding.padTop + slack / 2 + maxY * focal };
}

export interface Projected {
  x: number;
  y: number;
  /** 궤도 중심 깊이를 1 로 한 원근 배율 (가까울수록 큼) */
  scale: number;
  /** 카메라에서의 거리 */
  depth: number;
  /** 진하기 (가까울수록 1) */
  fog: number;
}

export function projectPoint(view: View3D, camera: Camera3D, layout: Pick<Layout3D, "radius">, point: Vec3): Projected {
  const c = toCamera(point, camera.yaw, camera.pitch);
  const depth = CAMERA_DISTANCE - c.z;
  const s = (view.focal * camera.zoom) / depth;
  const t = clamp((depth - (CAMERA_DISTANCE - layout.radius)) / (2 * layout.radius), 0, 1);
  return {
    x: view.cx + camera.panX + c.x * s,
    y: view.cy + camera.panY - c.y * s,
    scale: CAMERA_DISTANCE / depth,
    depth,
    fog: 1 - FOG_STRENGTH * t,
  };
}

/** 적도 고리 — 분야 자리가 놓인 겉면의 가로 원(y = 0)을 투영한 닫힌 선 (구의 기울기와 회전을 보여 줍니다) */
export function equatorPath(view: View3D, camera: Camera3D, layout: Pick<Layout3D, "radius" | "shell">, segments = 48): string {
  let d = "";
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const point = projectPoint(view, camera, layout, { x: Math.cos(angle) * layout.shell, y: 0, z: Math.sin(angle) * layout.shell });
    d += `${index === 0 ? "M" : "L"} ${Math.round(point.x * 10) / 10} ${Math.round(point.y * 10) / 10} `;
  }
  return `${d}Z`;
}

/** 각도·확대 범위를 지키고, 확대한 만큼만 옮길 수 있게 합니다. */
export function clampCamera(camera: Camera3D, view?: Pick<View3D, "width" | "height">): Camera3D {
  const zoom = clamp(camera.zoom, ZOOM_LIMITS[0], ZOOM_LIMITS[1]);
  const limitX = view ? (view.width / 2) * (zoom - 1) : 0;
  const limitY = view ? (view.height / 2) * (zoom - 1) : 0;
  return {
    yaw: camera.yaw,
    pitch: clamp(camera.pitch, PITCH_LIMITS[0], PITCH_LIMITS[1]),
    zoom,
    panX: limitX > 0 ? clamp(camera.panX, -limitX, limitX) : 0,
    panY: limitY > 0 ? clamp(camera.panY, -limitY, limitY) : 0,
  };
}

/** (px, py) 아래의 점이 그대로 있도록 확대합니다 (휠·두 손가락). */
export function zoomAt(camera: Camera3D, view: View3D, factor: number, px: number, py: number): Camera3D {
  const zoom = clamp(camera.zoom * factor, ZOOM_LIMITS[0], ZOOM_LIMITS[1]);
  const ratio = zoom / camera.zoom;
  return clampCamera(
    {
      ...camera,
      zoom,
      panX: px - view.cx - (px - view.cx - camera.panX) * ratio,
      panY: py - view.cy - (py - view.cy - camera.panY) * ratio,
    },
    view,
  );
}

/* ── 이름표 배치 ─────────────────────────────── */

export type Side3D = "right" | "left" | "above" | "below" | "center";

export interface LabelRequest3D {
  id: string;
  x: number;
  y: number;
  /** 점(또는 분야 묶음 가운데)에서 이름표까지 띄울 거리 */
  radius: number;
  width: number;
  height: number;
  priority: number;
  sides: Side3D[];
  /** 자리가 없어도 겹침이 가장 적은 곳에 놓습니다 (고른 대상) */
  force?: boolean;
  /** 다른 점을 덮을 때의 비용 — 기본은 덮지 않음, 아무것도 고르지 않은 분야 이름은 0 (지도처럼 묶음 위에 씀) */
  dotCost?: number;
}

export interface PlacedLabel3D {
  id: string;
  side: Side3D;
  box: LabelBox;
}

const LABEL_GAP = 4;

function overlapArea(a: LabelBox, b: LabelBox, pad = 0.5): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left) + pad;
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) + pad;
  return width > 0 && height > 0 ? width * height : 0;
}

function hitsDot(box: LabelBox, dot: LabelObstacle): boolean {
  const nearestX = clamp(dot.x, box.left, box.left + box.width);
  const nearestY = clamp(dot.y, box.top, box.top + box.height);
  return Math.hypot(dot.x - nearestX, dot.y - nearestY) < dot.r + 1;
}

/** 한 방향에서 놓아 볼 자리들 — 가운데부터, 반 줄·한 줄씩 비켜 봅니다 */
function candidateBoxes(request: LabelRequest3D, side: Side3D): LabelBox[] {
  const { x, y, radius, width, height } = request;
  if (side === "center") {
    const left = x - width / 2;
    const top = y - height / 2;
    return [0, -(height * 0.75), height * 0.75].map((shift) => ({ left, top: top + shift, width, height }));
  }
  if (side === "right" || side === "left") {
    const left = side === "right" ? x + radius + LABEL_GAP : x - radius - LABEL_GAP - width;
    const middle = y - height / 2;
    // 점 높이에서 반 줄·한 줄·한 줄 반까지 비켜 봅니다 (이름표 끝이 늘 점 옆에 붙어 있음).
    return [0, -(height / 2 - 1), height / 2 - 1, -(height - 2), height - 2, -(height * 1.5 - 3), height * 1.5 - 3].map((shift) => ({
      left,
      top: middle + shift,
      width,
      height,
    }));
  }
  const top = side === "above" ? y - radius - LABEL_GAP - height : y + radius + LABEL_GAP;
  return [x - width / 2, x - 8, x - width + 8, x - width / 2 - width / 3, x - width / 2 + width / 3].map((left) => ({ left, top, width, height }));
}

/**
 * 이름표 배치 — 겹치지 않음 · 캔버스 안 · 순위 순서. 자리가 없으면 그 이름표만 숨기고(점과 설명 칸은 남음),
 * force 인 이름표(고른 대상)만 겹침이 가장 적은 곳에 놓습니다. fixed 는 이미 놓인 이름표 자리입니다 (그 위에 더할 때).
 * hard 는 어떤 이름표도, 고른 대상의 이름표도 덮지 않는 자리입니다 (가운데 이름 — 사람 자리).
 */
export function placeLabels3d(requests: LabelRequest3D[], bounds: LabelBox, obstacles: LabelObstacle[], fixed: LabelBox[] = [], hard: LabelBox[] = []): Map<string, PlacedLabel3D> {
  const placed = new Map<string, PlacedLabel3D>();
  const right = bounds.left + bounds.width;
  const bottom = bounds.top + bounds.height;
  const ordered = [...requests].sort((a, b) => b.priority - a.priority || a.x - b.x || a.id.localeCompare(b.id));
  for (const request of ordered) {
    const blockers = [...fixed, ...Array.from(placed.values(), (item) => item.box)];
    const dotCost = request.dotCost ?? 400;
    let best = null as { side: Side3D; box: LabelBox; cost: number } | null;
    for (let sideIndex = 0; sideIndex < request.sides.length && best?.cost !== 0; sideIndex += 1) {
      const side = request.sides[sideIndex];
      const boxes = candidateBoxes(request, side);
      for (let index = 0; index < boxes.length && best?.cost !== 0; index += 1) {
        const box = boxes[index];
        if (box.left < bounds.left || box.left + box.width > right || box.top < bounds.top || box.top + box.height > bottom) continue;
        if (hard.some((other) => overlapArea(box, other, 0) > 0)) continue;
        let cost = 0;
        for (const other of blockers) cost += overlapArea(box, other) * 10;
        if (dotCost > 0) for (const dot of obstacles) if (dot.id !== request.id && hitsDot(box, dot)) cost += dotCost;
        const ranked = cost === 0 ? 0 : cost + sideIndex * 4 + index;
        if (!best || ranked < best.cost) best = { side, box, cost: ranked };
      }
    }
    if (best && (best.cost === 0 || request.force)) placed.set(request.id, { id: request.id, side: best.side, box: best.box });
  }
  return placed;
}

/* ── 분야 이름표 ─────────────────────────────── */

export const DOMAIN_FONT = 12;
export const DOMAIN_LABEL_HEIGHT = 18;
/** 분야 이름 뒤의 개수 (고정폭 글자) */
export const DOMAIN_COUNT_FONT = 10.5;

/** 분야 이름표의 폭 — 이름 + 근거가 있는 지식 수 (.kg3-domain 의 여백과 같음) */
export function domainLabelWidth(name: string, count: number, fontSize = DOMAIN_FONT): number {
  return estimateTextWidth(name, fontSize, false, true) + 5 + estimateTextWidth(String(count), DOMAIN_COUNT_FONT, true) + 12;
}

/** 언어와 관계없이 같은 방향을 고르도록 분야 이름표 폭은 한국어·영어 가운데 넓은 쪽으로 잽니다. */
export function domainLabelWidthAnyLocale(id: DomainId, count: number, fontSize = DOMAIN_FONT): number {
  const def = DOMAINS.find((item) => item.id === id);
  const names = def ? [def.label.ko, def.label.en] : [id];
  return Math.max(...names.map((name) => domainLabelWidth(name, count, fontSize)));
}

/** 분야 이름표를 놓아 볼 자리 — 묶음 위(가운데)부터, 겹치면 묶음 위·아래·옆으로 */
export const DOMAIN_SIDES: Side3D[] = ["center", "above", "below", "right", "left"];

/* ── 처음 시점 고르기 ──────────────────────── */

/** 레일 캔버스 여백 — 캔버스와 처음 시점 고르기가 함께 씁니다 */
export const RAIL_PADDING: FitPadding = { padX: 6, padTop: 12, padBottom: 6 };
/** 레일의 캔버스 높이 비율 (CSS .kg3-frame 의 aspect-ratio 5 / 6 과 같음) */
export const RAIL_ASPECT = 6 / 5;
/** 레일 캔버스 폭의 범위 — 레일 폭 clamp(236px, 20vw, 312px) 에서 좌우 여백을 뺀 값 (1181px 화면 ≈ 205px, 넓은 화면 ≈ 274px) */
export const RAIL_WIDTHS = [205, 240, 274];
/** 가장 좁은 레일에서는 분야 이름을 11px 로 줄입니다. */
export function domainLabelFont(width: number): number {
  return width < 216 ? 11 : DOMAIN_FONT;
}

function railProbeViews(layout: Pick<Layout3D, "positions">): View3D[] {
  return RAIL_WIDTHS.map((width) => fitView(layout, width, Math.round(width * RAIL_ASPECT), RAIL_PADDING));
}

/** 분야 묶음 가운데를 화면에 투영한 자리와 반지름 */
export function projectDomains(graph: KnowledgeGraph, layout: Omit<Layout3D, "yaw">, view: View3D, camera: Camera3D) {
  return graph.domains.map((domain) => {
    const center = layout.centers.get(domain.id)!;
    const point = projectPoint(view, camera, layout, center);
    return { domain, point, r: (layout.spread.get(domain.id) ?? 0.2) * ((view.focal * camera.zoom) / point.depth) };
  });
}

/* ── 가운데 (사람 자리) ─────────────────────── */

/** 가운데 이름표(이름 + "나의 지식")의 크기 — 처음 시점을 고를 때는 언어와 관계없이 넉넉한 폭(영어 이름 기준)으로 잽니다 */
export const CORE_LABEL = { width: 88, height: 33 } as const;

/** 가운데 이름표 자리 — 원점(사람 자리)의 화면 위치를 가운데로 둡니다 (돌려도 움직이지 않음) */
export function coreLabelBox(view: Pick<View3D, "cx" | "cy">, camera: Pick<Camera3D, "panX" | "panY">, width: number, height: number): LabelBox {
  return { left: view.cx + camera.panX - width / 2, top: view.cy + camera.panY - height / 2, width, height };
}

/** 이 방향에서 아무것도 고르지 않은 레일에 분야 이름표를 다 놓지 못하는 수 (가장 좁은 레일부터 넓은 레일까지, 가운데 이름 자리는 비움) */
export function domainLabelMisses(graph: KnowledgeGraph, layout: Omit<Layout3D, "yaw">, yaw: number, views: View3D[] = railProbeViews(layout)): number {
  const camera: Camera3D = { yaw, pitch: DEFAULT_PITCH, zoom: 1, panX: 0, panY: 0 };
  let misses = 0;
  for (const view of views) {
    const fontSize = domainLabelFont(view.width);
    const requests: LabelRequest3D[] = projectDomains(graph, layout, view, camera).map(({ domain, point, r }) => ({
      id: domain.key,
      x: point.x,
      y: point.y,
      radius: r * 0.5,
      width: domainLabelWidthAnyLocale(domain.id, domain.evidenced, fontSize),
      height: DOMAIN_LABEL_HEIGHT,
      priority: 900 + (point.scale - 1) * 30,
      sides: DOMAIN_SIDES,
      dotCost: 0,
    }));
    const core = coreLabelBox(view, camera, CORE_LABEL.width, CORE_LABEL.height);
    misses += requests.length - placeLabels3d(requests, { left: 2, top: 1, width: view.width - 4, height: view.height - 2 }, [], [], [core]).size;
  }
  return misses;
}

/** 분야 묶음 가운데가 화면에서 서로, 그리고 가운데 이름(사람 자리)과 너무 붙은 정도 (작을수록 묶음이 갈라져 보임) */
export function domainCrowding(graph: KnowledgeGraph, layout: Omit<Layout3D, "yaw">, yaw: number, pitch = DEFAULT_PITCH): number {
  const screen = graph.domains.map((domain) => {
    const c = toCamera(layout.centers.get(domain.id)!, yaw, pitch);
    const s = CAMERA_DISTANCE / (CAMERA_DISTANCE - c.z);
    return { x: c.x * s, y: -c.y * s };
  });
  let penalty = 0;
  for (let i = 0; i < screen.length; i += 1) {
    for (let j = i + 1; j < screen.length; j += 1) {
      const gap = Math.hypot(screen[i].x - screen[j].x, screen[i].y - screen[j].y);
      if (gap < 0.5) penalty += (0.5 - gap) ** 2;
    }
    const core = Math.hypot(screen[i].x, screen[i].y);
    if (core < CORE_GAP) penalty += 4 * (CORE_GAP - core) ** 2;
  }
  return penalty;
}

/** 분야 묶음 가운데가 화면에서 가운데 이름과 떨어져 있었으면 하는 거리 (가로 반지름 1 기준) */
const CORE_GAP = 0.34;

/** 처음 시점 — 36방향 가운데 분야 이름표가 레일에 모두 들어가고, 그중 분야 묶음이 가장 잘 갈라져 보이는 방향 */
export function chooseYaw(graph: KnowledgeGraph, layout: Omit<Layout3D, "yaw">): number {
  const views = railProbeViews(layout);
  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let step = 0; step < 36; step += 1) {
    const yaw = round((step / 36) * Math.PI * 2);
    const score = 100 * domainLabelMisses(graph, layout, yaw, views) + domainCrowding(graph, layout, yaw);
    if (score < bestScore - 1e-9) {
      best = yaw;
      bestScore = score;
    }
  }
  return best;
}

/* ── 배치 한 번에 ───────────────────────────── */

const cache = new Map<string, Layout3D>();

function structureKey(graph: KnowledgeGraph): string {
  return `${graph.nodes.map((node) => `${node.id}@${node.domain}`).join(",")}|${graph.links.map((link) => `${link.key}:${link.relation}`).join(",")}`;
}

export function layoutGraph3D(graph: KnowledgeGraph): Layout3D {
  const key = structureKey(graph);
  const cached = cache.get(key);
  if (cached) return cached;
  let positions = new Map<string, Vec3>();
  let shell = 1;
  if (graph.nodes.length) {
    const anchors = domainAnchors(graph);
    const raw = relax(graph, anchors, initialPositions(graph, anchors));
    positions = normalizeLayout(graph, raw);
    shell = round(1 / horizontalReach(graph, raw));
  }
  const points = Array.from(positions.values());
  const { centers, spread } = domainGeometry(graph, positions);
  const base = {
    positions,
    centers,
    spread,
    radius: Math.max(0.5, ...points.map((point) => Math.hypot(point.x, point.y, point.z))),
    shell,
  };
  const layout: Layout3D = { ...base, yaw: graph.nodes.length ? chooseYaw(graph, base) : 0 };
  if (cache.size > 6) cache.clear();
  cache.set(key, layout);
  return layout;
}

/* ── 분야를 앞으로 (펼치기 전) ─────────────────── */

/** 분야를 펼치기 전에 앞으로 데려올 때의 확대 배율 */
export const FORWARD_ZOOM = 1.3;

/**
 * 고른 분야의 묶음 가운데가 화면 가운데·카메라 쪽으로 오는 시점 — 펼치기 직전에 이 시점으로 부드럽게 돌립니다.
 * 사용자가 돌리는 범위(PITCH_LIMITS)와 달리 아래쪽 분야를 위해 올려다보는 각도도 씁니다 (전환 중에만).
 */
export function forwardCamera(layout: Pick<Layout3D, "centers">, domain: DomainId, zoom = FORWARD_ZOOM): Camera3D {
  const center = layout.centers.get(domain);
  if (!center) return { yaw: 0, pitch: DEFAULT_PITCH, zoom, panX: 0, panY: 0 };
  const flat = Math.max(1e-6, Math.hypot(center.x, center.z));
  return { yaw: Math.atan2(-center.x, center.z), pitch: clamp(Math.atan2(center.y, flat) * 0.9, -1, 1.1), zoom, panX: 0, panY: 0 };
}

/* ── 점 크기 · 상태 · 이름표 순위 ───────────── */

/**
 * 점 크기 (px, 궤도 중심 깊이 기준) — 노드 종류만 나타냅니다. 연결 수나 근거 수로 키우지 않습니다 (숙련도처럼 읽히지 않게).
 * 개념·방법은 원, 기술은 마름모, 관심·스택 목록은 점선 테두리로 그립니다.
 */
export function nodeRadius(node: Pick<KNode, "kind" | "status">): number {
  if (node.status !== "evidenced") return 2.5;
  return node.kind === "tech" ? 2.6 : 3.2;
}

export type NodeState3D = "idle" | "emphasis" | "focus" | "near" | "far" | "dim";

/** 읽고 있는 홈 섹션에 맞춰 살짝 드러낼 노드 — 기술 스택: 기술, 연구·경력: 연구·실험 근거가 있는 지식 */
export type Emphasis3D = "tech" | "studied" | null;

export function matchesEmphasis(node: Pick<KNode, "kind" | "status" | "studied">, emphasis: Emphasis3D): boolean {
  if (emphasis === "tech") return node.kind === "tech" && node.status === "evidenced";
  if (emphasis === "studied") return node.studied;
  return false;
}

export function nodeState(node: KNode, hood: Neighborhood | null, emphasis: Emphasis3D): NodeState3D {
  if (!hood) return matchesEmphasis(node, emphasis) ? "emphasis" : "idle";
  const hop = hood.hops.get(node.id);
  if (hop === 0) return "focus";
  if (hop === 1) return "near";
  return hop === undefined ? "dim" : "far";
}

export type LabelDensity3D = "quiet" | "rich";

export interface LabelContext3D {
  hood: Neighborhood | null;
  emphasis: Emphasis3D;
  density: LabelDensity3D;
  zoom: number;
}

const KIND_RANK = { concept: 2, method: 2, tech: 1 } as const;

/**
 * 노드 이름표를 보일지와 그 순위 — null 이면 점만 둡니다 (Obsidian 의 이름표 문턱처럼, 확대할수록 더 많이 보임).
 * 고른 것이 없으면 분야 이름만(레일). 넓게 보기에서는 개념·방법 → 기술 → 관심·스택 목록 순서로 확대에 따라 더해집니다.
 * 고르면 고른 대상과 바로 이웃의 이름이 먼저입니다. 순위는 연결 수가 아니라 종류와 원본 순서로만 정합니다.
 */
export function labelPriority3d(node: KNode, context: LabelContext3D): number | null {
  const { hood, emphasis, density, zoom } = context;
  const tail = -node.order * 0.01;
  if (hood) {
    const hop = hood.hops.get(node.id);
    if (hop === 0) return 1000;
    if (hop === 1) return 700 + KIND_RANK[node.kind] * 10 + tail;
    if (hop !== undefined && density === "rich") return 260 - 40 * hop + KIND_RANK[node.kind] * 5 + tail;
    return null;
  }
  if (density === "quiet") return matchesEmphasis(node, emphasis) ? 400 + KIND_RANK[node.kind] * 10 + tail : null;
  if (node.status !== "evidenced") return zoom >= 1.9 ? 120 + tail : null;
  if (node.kind === "tech") return zoom >= 1.35 ? 220 + tail : null;
  return 320 + tail;
}
