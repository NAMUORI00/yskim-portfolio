/*
 * 층위형 지식 지도의 배치·투영·이름표·키보드 이동 — 순수 함수만 둡니다 (테스트 대상).
 * ─────────────────────────────────────────────────────────────
 * 세 층이 바닥 평면 하나(u, v ∈ [-1, 1])를 함께 씁니다. 연구 질문 바로 아래에 그 질문의 프로젝트를,
 * 프로젝트 아래에 그 기술을 놓아 층 사이 연결선이 거의 수직으로 떨어지게 합니다 (지층 단면처럼 읽힘).
 * 연구와 이어지지 않은 프로젝트는 앞쪽 띠에 사용 기술이 비슷한 것끼리 나란히 둡니다.
 * 화면에는 축측 투영(회전 yaw · 기울기 tilt)으로 판을 겹쳐 그립니다. 원근 왜곡이 없어 수직선은 늘 수직입니다.
 * 같은 콘텐츠면 늘 같은 배치가 나옵니다 (난수 없음).
 */
import { MAP_LAYERS, type KnowledgeMap, type MapLayer, type MapNode } from "./knowledgeMapModel";

export interface FloorPoint {
  u: number;
  v: number;
}

export type FloorPlan = Map<string, FloorPoint>;

/* ── 바닥 평면 배치 ───────────────────────────── */

const RESEARCH_U = 0.8;
const RESEARCH_BACK_V = -0.48;
const RESEARCH_FRONT_V = 0.2;
const STRIP_V = [0.62, 0.86] as const;
const BOUND_U = 0.93;
const BOUND_V = 0.9;
/** 화면에서 깊이 방향이 눌려 보이는 만큼 거리 계산에서 줄입니다 (이름표가 가로로 길어서 가로 간격이 더 중요함). */
const V_WEIGHT = 0.55;
const MIN_GAP: Record<MapLayer, number> = { research: 0, project: 0.28, tech: 0.23 };
const ITERATIONS = 480;
/** 여러 프로젝트가 함께 쓴 기술(예: Python)은 묶음을 정할 때 덜 셉니다. */
const COMMON_TECH_WEIGHT = 0.3;

function hashFraction(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function centroid(points: FloorPoint[]): FloorPoint {
  const sum = points.reduce((acc, point) => ({ u: acc.u + point.u, v: acc.v + point.v }), { u: 0, v: 0 });
  return { u: sum.u / points.length, v: sum.v / points.length };
}

function nodesIn(map: KnowledgeMap, layer: MapLayer): MapNode[] {
  return map.nodes.filter((node) => node.layer === layer);
}

function techWeights(map: KnowledgeMap): Map<string, number> {
  const projects = Math.max(1, nodesIn(map, "project").length);
  return new Map(
    nodesIn(map, "tech").map((node) => [node.id, (map.above.get(node.id)?.length ?? 0) / projects > 0.4 ? COMMON_TECH_WEIGHT : 1]),
  );
}

function sharedWeight(map: KnowledgeMap, weights: Map<string, number>, left: string, right: string): number {
  const rightTech = new Set(map.below.get(right) ?? []);
  return (map.below.get(left) ?? []).reduce((sum, id) => sum + (rightTech.has(id) ? weights.get(id) ?? 1 : 0), 0);
}

/** 연구와 이어지지 않은 프로젝트의 앞쪽 띠 순서 — 사용 기술이 겹치는 것끼리 이웃하게 사슬로 잇습니다. */
function stripOrder(map: KnowledgeMap, loose: MapNode[], anchored: Map<string, FloorPoint>): MapNode[] {
  const weights = techWeights(map);
  const affinity = new Map<string, number>();
  for (const project of loose) {
    let total = 0;
    let weighted = 0;
    for (const [id, point] of Array.from(anchored.entries())) {
      const weight = sharedWeight(map, weights, project.id, id);
      total += weight;
      weighted += weight * point.u;
    }
    affinity.set(project.id, total > 0 ? weighted / total : 0);
  }
  const similarity = (a: MapNode, b: MapNode) => sharedWeight(map, weights, a.id, b.id);
  const totalSimilarity = (node: MapNode) => loose.reduce((sum, other) => sum + (other.id === node.id ? 0 : similarity(node, other)), 0);
  const remaining = [...loose];
  remaining.sort(
    (a, b) => (affinity.get(a.id) ?? 0) - (affinity.get(b.id) ?? 0) || totalSimilarity(b) - totalSimilarity(a) || a.order - b.order,
  );
  const chain: MapNode[] = [];
  let current = remaining.shift();
  while (current) {
    chain.push(current);
    const last: MapNode = current;
    remaining.sort(
      (a, b) =>
        similarity(last, b) - similarity(last, a) ||
        Math.abs((affinity.get(a.id) ?? 0) - (affinity.get(last.id) ?? 0)) - Math.abs((affinity.get(b.id) ?? 0) - (affinity.get(last.id) ?? 0)) ||
        a.order - b.order,
    );
    current = remaining.shift();
  }
  // 사슬 끝쪽이 왼쪽 연구 영역과 더 가까우면 뒤집습니다.
  const half = Math.floor(chain.length / 2);
  const mean = (items: MapNode[]) => items.reduce((sum, node) => sum + (affinity.get(node.id) ?? 0), 0) / Math.max(1, items.length);
  if (chain.length > 1 && mean(chain.slice(0, half)) > mean(chain.slice(chain.length - half))) chain.reverse();
  return chain;
}

export function layoutFloorPlan(map: KnowledgeMap): FloorPlan {
  const plan: FloorPlan = new Map();

  // 1) 연구 질문: 두 줄 격자 (뒷줄 → 앞줄), 줄마다 가운데 맞춤
  const research = nodesIn(map, "research").sort((a, b) => (a.slot ?? a.order) - (b.slot ?? b.order) || a.order - b.order);
  const columns = Math.max(1, Math.ceil(research.length / 2));
  const columnU = (index: number) => (columns <= 1 ? 0 : -RESEARCH_U + (2 * RESEARCH_U * index) / (columns - 1));
  research.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const rowSize = row === 0 ? Math.min(columns, research.length) : research.length - columns;
    const column = index - row * columns + (columns - rowSize) / 2;
    const v = research.length <= columns ? (RESEARCH_BACK_V + RESEARCH_FRONT_V) / 2 : row === 0 ? RESEARCH_BACK_V : RESEARCH_FRONT_V;
    plan.set(node.id, { u: columnU(column), v });
  });

  // 2) 프로젝트: 이어진 연구 질문들의 가운데, 없으면 앞쪽 띠
  const projects = nodesIn(map, "project");
  const anchored = new Map<string, FloorPoint>();
  for (const project of projects) {
    const parents = (map.above.get(project.id) ?? []).flatMap((id) => {
      const point = plan.get(id);
      return point ? [point] : [];
    });
    if (parents.length) anchored.set(project.id, centroid(parents));
  }
  const sameAnchor = new Map<string, string[]>();
  for (const [id, point] of Array.from(anchored.entries())) {
    const key = `${point.u.toFixed(3)}:${point.v.toFixed(3)}`;
    sameAnchor.set(key, [...(sameAnchor.get(key) ?? []), id]);
  }
  for (const ids of Array.from(sameAnchor.values())) {
    ids.forEach((id, index) => {
      const anchor = anchored.get(id)!;
      const offset = (index - (ids.length - 1) / 2) * MIN_GAP.project * 1.1;
      plan.set(id, { u: anchor.u + offset, v: anchor.v + (ids.length > 1 ? (index % 2 ? 0.05 : -0.05) : 0) });
    });
  }
  const strip = stripOrder(
    map,
    projects.filter((project) => !anchored.has(project.id)),
    anchored,
  );
  const stripRow = new Map<string, number>();
  strip.forEach((project, index) => {
    const u = strip.length <= 1 ? 0 : -BOUND_U * 0.94 + (2 * BOUND_U * 0.94 * index) / (strip.length - 1);
    stripRow.set(project.id, STRIP_V[index % 2]);
    plan.set(project.id, { u, v: STRIP_V[index % 2] });
  });

  // 3) 기술: 쓴 프로젝트들의 가운데에서 시작
  const techs = nodesIn(map, "tech");
  for (const tech of techs) {
    const users = (map.above.get(tech.id) ?? []).flatMap((id) => {
      const point = plan.get(id);
      return point ? [point] : [];
    });
    const start = users.length ? centroid(users) : { u: 0, v: 0 };
    plan.set(tech.id, {
      u: start.u + (hashFraction(`${tech.id}:u`) - 0.5) * 0.08,
      v: start.v + (hashFraction(`${tech.id}:v`) - 0.5) * 0.08,
    });
  }

  // 4) 완화: 연결은 끌어당기고 같은 층끼리는 밀어내 간격을 지킵니다.
  const movable = [...projects, ...techs];
  for (let step = 0; step < ITERATIONS; step += 1) {
    const cooling = 1 - step / ITERATIONS;
    const force = new Map<string, FloorPoint>(movable.map((node) => [node.id, { u: 0, v: 0 }]));
    const push = (id: string, du: number, dv: number) => {
      const current = force.get(id);
      if (current) force.set(id, { u: current.u + du, v: current.v + dv });
    };

    for (const project of projects) {
      const point = plan.get(project.id)!;
      const anchor = anchored.get(project.id);
      if (anchor) push(project.id, (anchor.u - point.u) * 0.12, (anchor.v - point.v) * 0.12);
      else push(project.id, 0, ((stripRow.get(project.id) ?? STRIP_V[0]) - point.v) * 0.1);
    }

    for (const link of map.links) {
      const source = map.byId.get(link.source);
      if (source?.layer !== "project") continue;
      const a = plan.get(link.source)!;
      const b = plan.get(link.target)!;
      push(link.target, (a.u - b.u) * 0.07, (a.v - b.v) * 0.07);
      const back = anchored.has(link.source) ? 0.004 : 0.02;
      push(link.source, (b.u - a.u) * back, 0);
    }

    // 기술은 판 가장자리에 몰리지 않게 가운데로 아주 약하게 끕니다.
    for (const tech of techs) push(tech.id, -plan.get(tech.id)!.u * 0.02, 0);

    for (const layer of ["project", "tech"] as const) {
      const members = layer === "project" ? projects : techs;
      const gap = MIN_GAP[layer];
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          const a = plan.get(members[i].id)!;
          const b = plan.get(members[j].id)!;
          let du = b.u - a.u;
          let dv = (b.v - a.v) * V_WEIGHT;
          let distance = Math.hypot(du, dv);
          if (distance >= gap) continue;
          if (distance < 1e-6) {
            const angle = hashFraction(`${members[i].id}|${members[j].id}`) * Math.PI * 2;
            du = Math.cos(angle);
            dv = Math.sin(angle);
            distance = 1;
          }
          const overlap = ((gap - Math.hypot(b.u - a.u, (b.v - a.v) * V_WEIGHT)) / 2) * 0.85;
          const nu = du / distance;
          const nv = dv / distance;
          push(members[i].id, -nu * overlap, (-nv * overlap) / V_WEIGHT);
          push(members[j].id, nu * overlap, (nv * overlap) / V_WEIGHT);
        }
      }
    }

    const rate = 0.35 + 0.65 * cooling;
    for (const node of movable) {
      const point = plan.get(node.id)!;
      const delta = force.get(node.id)!;
      plan.set(node.id, {
        u: clamp(point.u + clamp(delta.u * rate, -0.06, 0.06), -BOUND_U, BOUND_U),
        v: clamp(point.v + clamp(delta.v * rate, -0.06, 0.06), -BOUND_V, BOUND_V),
      });
    }
  }

  for (const [id, point] of Array.from(plan.entries())) {
    plan.set(id, { u: Number(point.u.toFixed(3)), v: Number(point.v.toFixed(3)) });
  }
  return plan;
}

/** 같은 층 노드 사이의 가장 짧은 거리 (화면 비율을 반영한 바닥 평면 거리) */
export function minimumLayerGap(map: KnowledgeMap, plan: FloorPlan, layer: MapLayer): number {
  const members = nodesIn(map, layer);
  let minimum = Number.POSITIVE_INFINITY;
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const a = plan.get(members[i].id)!;
      const b = plan.get(members[j].id)!;
      minimum = Math.min(minimum, Math.hypot(b.u - a.u, (b.v - a.v) * V_WEIGHT));
    }
  }
  return minimum;
}

/* ── 투영 ───────────────────────────────────── */

export interface MapCamera {
  /** 세로축 회전 (라디안) — 양수면 판의 오른쪽 뒤가 올라갑니다 */
  yaw: number;
  /** 판이 눌려 보이는 정도 (위에서 내려다보는 각의 sin, 0.3–0.8) */
  tilt: number;
}

/** 오른쪽 레일: 살짝 돌려 판이 겹친 층임이 보이게 */
export const RAIL_CAMERA: MapCamera = { yaw: 0.28, tilt: 0.5 };
/** 넓게 보기의 기본 각도 */
export const EXPLORER_CAMERA: MapCamera = { yaw: 0.34, tilt: 0.52 };
/** 정면 보기: 회전 없이 층을 가로 띠로 (이름표 읽기가 가장 쉬움) */
export const FRONT_CAMERA: MapCamera = { yaw: 0, tilt: 0.56 };
export const CAMERA_LIMITS = { yaw: [-0.62, 0.62], tilt: [0.32, 0.8] } as const;

export const PLANE_HALF_DEPTH = 0.75;

export function clampCamera(camera: MapCamera): MapCamera {
  return {
    yaw: clamp(camera.yaw, CAMERA_LIMITS.yaw[0], CAMERA_LIMITS.yaw[1]),
    tilt: clamp(camera.tilt, CAMERA_LIMITS.tilt[0], CAMERA_LIMITS.tilt[1]),
  };
}

export interface ViewportSpec {
  width: number;
  /** 넘지 않을 높이 — 없으면 너비에 맞춥니다 */
  maxHeight?: number;
  camera: MapCamera;
  padX: number;
  padTop: number;
  padBottom: number;
  /** 위 판의 아래 끝과 아래 판 사이에 비워 둘 높이 (층 제목 자리) */
  clearance: number;
  /** 0 이면 판이 거의 겹쳐 있고 1 이면 다 펼쳐짐 (처음 한 번 펼치는 움직임) */
  unfold?: number;
  /** 판의 화면 너비 상한 (넓은 화면에서 너무 커지지 않게) */
  maxScale?: number;
}

export interface Viewport {
  width: number;
  height: number;
  scale: number;
  cx: number;
  centers: Record<MapLayer, number>;
  /** 위·아래 판 중심 사이 거리 (다 펼쳤을 때) */
  spacing: number;
  camera: MapCamera;
  cos: number;
  sin: number;
  tilt: number;
  /** 세로로 선 길이가 화면에 보이는 비율 (cos β) — 정면에서 내려다볼수록 0 */
  rise: number;
}

function planeExtents(camera: MapCamera) {
  const cos = Math.cos(camera.yaw);
  const sin = Math.abs(Math.sin(camera.yaw));
  return {
    halfWidth: cos + PLANE_HALF_DEPTH * sin,
    halfHeight: (sin + PLANE_HALF_DEPTH * cos) * camera.tilt,
    // 판 가운데를 지나는 세로줄이 판을 가로지르는 길이 (돌릴수록 비스듬해져 길어짐)
    depthSpan: (2 * PLANE_HALF_DEPTH * camera.tilt) / cos,
  };
}

export function computeViewport(spec: ViewportSpec): Viewport {
  const camera = spec.camera;
  const { halfWidth, halfHeight, depthSpan } = planeExtents(camera);
  const pads = spec.padTop + spec.padBottom + 2 * spec.clearance;
  let scale = Math.max(1, (spec.width - 2 * spec.padX) / (2 * halfWidth));
  if (spec.maxHeight) scale = Math.min(scale, Math.max(1, (spec.maxHeight - pads) / (2 * halfHeight + 2 * depthSpan)));
  if (spec.maxScale) scale = Math.min(scale, spec.maxScale);
  const spacing = depthSpan * scale + spec.clearance;
  const height = Math.ceil(spec.padTop + spec.padBottom + 2 * halfHeight * scale + 2 * spacing);
  const middle = spec.padTop + halfHeight * scale + spacing;
  const unfold = clamp(spec.unfold ?? 1, 0, 1);
  const gap = spacing * (0.28 + 0.72 * unfold);
  return {
    width: spec.width,
    height,
    scale,
    cx: spec.width / 2,
    centers: { research: middle - gap, project: middle, tech: middle + gap },
    spacing,
    camera,
    cos: Math.cos(camera.yaw),
    sin: Math.sin(camera.yaw),
    tilt: camera.tilt,
    rise: Math.sqrt(Math.max(0, 1 - camera.tilt * camera.tilt)),
  };
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export function projectPoint(view: Viewport, layer: MapLayer, point: FloorPoint, lift = 0): ScreenPoint {
  const x0 = point.u;
  const z0 = point.v * PLANE_HALF_DEPTH;
  const xr = x0 * view.cos + z0 * view.sin;
  const zr = -x0 * view.sin + z0 * view.cos;
  return { x: view.cx + xr * view.scale, y: view.centers[layer] + zr * view.tilt * view.scale - lift * view.rise };
}

/** 판의 네 모서리: 뒤-왼쪽, 뒤-오른쪽, 앞-오른쪽, 앞-왼쪽 */
export function planeCorners(view: Viewport, layer: MapLayer): ScreenPoint[] {
  return [
    { u: -1, v: -1 },
    { u: 1, v: -1 },
    { u: 1, v: 1 },
    { u: -1, v: 1 },
  ].map((corner) => projectPoint(view, layer, corner));
}

/* ── 고른 노드의 경로 ───────────────────────── */

export interface FocusPath {
  nodes: Set<string>;
  links: Set<string>;
}

export function linkKey(source: string, target: string): string {
  return `${source}>${target}`;
}

/**
 * 고른 노드에서 위·아래로 이어진 경로만 남깁니다.
 * 연구 질문 → 그 프로젝트 → 그 기술 / 프로젝트 → 위의 연구 질문과 아래의 기술 / 기술 → 쓴 프로젝트 → 그 연구 질문
 */
export function focusPath(map: KnowledgeMap, id: string | null): FocusPath | null {
  if (!id || !map.byId.has(id)) return null;
  const nodes = new Set<string>([id]);
  const links = new Set<string>();
  const walk = (direction: "above" | "below") => {
    const stack = [id];
    while (stack.length) {
      const current = stack.pop()!;
      for (const next of map[direction].get(current) ?? []) {
        links.add(direction === "below" ? linkKey(current, next) : linkKey(next, current));
        if (!nodes.has(next)) {
          nodes.add(next);
          stack.push(next);
        }
      }
    }
  };
  walk("below");
  walk("above");
  return { nodes, links };
}

/* ── 이름표 배치 ─────────────────────────────── */

export type LabelSide = "right" | "left" | "above" | "below";

export interface LabelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface LabelRequest {
  id: string;
  x: number;
  y: number;
  /** 점의 반지름 */
  radius: number;
  width: number;
  height: number;
  priority: number;
  sides: LabelSide[];
  /** 자리가 없어도 겹침이 가장 적은 곳에 놓습니다 (고른 노드) */
  force?: boolean;
}

export interface PlacedLabel {
  id: string;
  side: LabelSide;
  box: LabelBox;
}

export interface LabelObstacle {
  id: string;
  x: number;
  y: number;
  r: number;
}

const LABEL_GAP = 4;

function sideBox(request: LabelRequest, side: LabelSide): LabelBox {
  const { x, y, radius, width, height } = request;
  if (side === "right") return { left: x + radius + LABEL_GAP, top: y - height / 2, width, height };
  if (side === "left") return { left: x - radius - LABEL_GAP - width, top: y - height / 2, width, height };
  if (side === "above") return { left: x - width / 2, top: y - radius - LABEL_GAP - height, width, height };
  return { left: x - width / 2, top: y + radius + LABEL_GAP, width, height };
}

function fitBox(box: LabelBox, side: LabelSide, bounds: LabelBox, anchorX: number): LabelBox | null {
  const right = bounds.left + bounds.width;
  const bottom = bounds.top + bounds.height;
  if (box.top < bounds.top || box.top + box.height > bottom) return null;
  if (side === "left" || side === "right") {
    return box.left < bounds.left || box.left + box.width > right ? null : box;
  }
  // 위·아래 이름표는 점을 덮는 범위 안에서 옆으로 밀어 넣습니다.
  const left = clamp(box.left, bounds.left, right - box.width);
  if (left > anchorX - 2 || left + box.width < anchorX + 2) return null;
  return { ...box, left };
}

function overlapArea(a: LabelBox, b: LabelBox, pad = 0.5): number {
  const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left) + pad;
  const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) + pad;
  return width > 0 && height > 0 ? width * height : 0;
}

function hitsCircle(box: LabelBox, circle: LabelObstacle): boolean {
  const nearestX = clamp(circle.x, box.left, box.left + box.width);
  const nearestY = clamp(circle.y, box.top, box.top + box.height);
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.r + 1;
}

/**
 * 우선순위가 높은 이름표부터 겹치지 않는 자리에 놓습니다. 자리가 없으면 그 이름표는 숨기고
 * (노드는 그대로 보이고 설명 칸 목록에 이름이 남음), force 인 이름표만 겹침이 가장 적은 곳에 놓습니다.
 * reserved 는 층 제목처럼 이름표가 덮으면 안 되는 자리입니다.
 */
export function placeLabels(
  requests: LabelRequest[],
  bounds: LabelBox,
  obstacles: LabelObstacle[],
  reserved: LabelBox[] = [],
): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>();
  // 같은 우선순위는 왼쪽부터 놓아 한 줄에 여러 이름표가 차례로 들어차게 합니다.
  const ordered = [...requests].sort((a, b) => b.priority - a.priority || a.x - b.x || a.id.localeCompare(b.id));
  for (const request of ordered) {
    let best: { side: LabelSide; box: LabelBox; cost: number } | null = null;
    const blockers = [...reserved, ...Array.from(placed.values(), (item) => item.box)];
    const consider = (side: LabelSide, sideIndex: number, box: LabelBox | null) => {
      if (!box || (best && best.cost === 0)) return;
      let cost = 0;
      for (const other of blockers) cost += overlapArea(box, other) * 10;
      for (const obstacle of obstacles) if (obstacle.id !== request.id && hitsCircle(box, obstacle)) cost += 400;
      const ranked = cost === 0 ? 0 : cost + sideIndex;
      if (!best || ranked < best.cost) best = { side, box, cost: ranked };
    };
    request.sides.forEach((side, sideIndex) => {
      const centered = sideBox(request, side);
      consider(side, sideIndex, fitBox(centered, side, bounds, request.x));
      if (side === "left" || side === "right") {
        // 옆 이름표는 점 높이를 벗어나지 않는 만큼 위아래로 비켜 봅니다.
        const nudge = request.height / 2 - 1;
        consider(side, sideIndex, fitBox({ ...centered, top: centered.top - nudge }, side, bounds, request.x));
        consider(side, sideIndex, fitBox({ ...centered, top: centered.top + nudge }, side, bounds, request.x));
        return;
      }
      // 가운데 자리가 막히면 막은 이름표 바로 옆으로 밀어 봅니다 (점을 덮는 범위 안에서).
      for (const other of blockers) {
        const shared = Math.min(centered.top + centered.height, other.top + other.height) - Math.max(centered.top, other.top);
        if (shared <= 0) continue;
        consider(side, sideIndex, fitBox({ ...centered, left: other.left + other.width + 2 }, side, bounds, request.x));
        consider(side, sideIndex, fitBox({ ...centered, left: other.left - centered.width - 2 }, side, bounds, request.x));
      }
    });
    const chosen = best as { side: LabelSide; box: LabelBox; cost: number } | null;
    if (chosen && (chosen.cost === 0 || request.force)) placed.set(request.id, { id: request.id, side: chosen.side, box: chosen.box });
  }
  return placed;
}

/** 글자 폭 어림 — 한글은 글자 크기만큼, 영문·숫자는 그보다 좁게 셉니다 (고정폭은 0.6em). */
export function estimateTextWidth(text: string, fontSize: number, mono = false, bold = false): number {
  let em = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const wide = (code >= 0x1100 && code <= 0x11ff) || (code >= 0x3000 && code <= 0x9fff) || (code >= 0xac00 && code <= 0xd7a3);
    if (wide) em += mono ? 1 : 0.94;
    else if (mono) em += 0.6;
    else if (char === " ") em += 0.28;
    else if (/[A-Z]/.test(char)) em += 0.66;
    else if (/[a-z]/.test(char)) em += 0.54;
    else if (/[0-9]/.test(char)) em += 0.58;
    else if (/[.,:;·'|!]/.test(char)) em += 0.3;
    else em += 0.45;
  }
  return Math.ceil(em * fontSize * (bold ? 1.04 : 1));
}

export type LabelDensity = "quiet" | "rich";

export interface LabelContext {
  path: FocusPath | null;
  focusId: string | null;
  /** 지금 읽는 홈 섹션에 맞춰 살짝 드러낼 층 */
  emphasis: MapLayer | null;
  /** quiet: 레일·서랍 (연구 질문 이름만), rich: 넓게 보기 (프로젝트 이름까지) */
  density: LabelDensity;
}

/**
 * 이름표를 보일지와 그 우선순위 — null 이면 점만 둡니다.
 * 고른 것이 없으면 연구 질문 이름만 보이고, 읽는 섹션에 맞춰 대표 작업이나 여러 프로젝트가 함께 쓴 기술만 더합니다.
 * 고르면 그 경로의 이름표만 보이고 나머지 연구 질문 이름은 흐리게 남겨 위치를 잃지 않게 합니다.
 */
export function labelPriority(map: KnowledgeMap, node: MapNode, context: LabelContext): number | null {
  const { path, focusId, emphasis, density } = context;
  const uses = node.layer === "tech" ? (map.above.get(node.id)?.length ?? 0) : 0;
  if (path && focusId) {
    if (node.id === focusId) return 1000;
    if (path.nodes.has(node.id)) {
      const direct = (map.above.get(focusId) ?? []).includes(node.id) || (map.below.get(focusId) ?? []).includes(node.id);
      if (node.layer === "research") return 700;
      if (node.layer === "project") return 500 + (direct ? 50 : 0) + (node.featured ? 10 : 0);
      return 300 + (direct ? 50 : 0) + uses;
    }
    return node.layer === "research" ? 100 : null;
  }
  if (node.layer === "research") return 800;
  if (node.layer === "project") {
    if (node.featured && (emphasis === "project" || density === "rich")) return 420;
    return density === "rich" ? 200 : null;
  }
  if (uses >= 3 && (emphasis === "tech" || density === "rich")) return 350 + uses;
  return density === "rich" && uses >= 2 ? 150 + uses : null;
}

/** x 위치에서 판 윗변의 화면 y (판 밖이면 null) */
export function planeTopAt(corners: ScreenPoint[], x: number): number | null {
  let top: number | null = null;
  corners.forEach((a, index) => {
    const b = corners[(index + 1) % corners.length];
    const low = Math.min(a.x, b.x);
    const high = Math.max(a.x, b.x);
    if (x < low - 0.01 || x > high + 0.01) return;
    const y = high - low < 0.01 ? Math.min(a.y, b.y) : a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    top = top === null ? y : Math.min(top, y);
  });
  return top;
}

/** 층 제목 자리 — 판의 왼쪽 끝 모서리 위, 판 윗변에 닿지 않게 붙입니다. */
export function layerTitleBox(view: Viewport, layer: MapLayer, width: number, height: number): LabelBox {
  const corners = planeCorners(view, layer);
  const leftmost = corners.reduce((best, corner) => (corner.x < best.x ? corner : best), corners[0]);
  const left = Math.max(2, leftmost.x - 2);
  const right = left + width;
  const samples = [left, right, ...corners.map((corner) => corner.x).filter((x) => x > left && x < right)];
  const tops = samples.flatMap((x) => {
    const y = planeTopAt(corners, x);
    return y === null ? [] : [y];
  });
  const bottom = (tops.length ? Math.min(...tops) : leftmost.y) - 3;
  return { left, top: bottom - height, width, height };
}

/** 판 사이에 층 제목이 들어갈 높이 — 판이 많이 돌아갈수록 윗변이 비스듬해져 더 비웁니다. */
export function titleClearance(camera: MapCamera, titleWidth: number, titleHeight: number): number {
  const slope = Math.abs(Math.tan(camera.yaw)) * camera.tilt;
  return Math.ceil(titleHeight + 8 + slope * titleWidth);
}

/* ── 키보드 이동 ─────────────────────────────── */

export type MapKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End";

export function isMapKey(key: string): key is MapKey {
  return key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown" || key === "Home" || key === "End";
}

/**
 * ←→: 같은 층에서 화면 왼쪽·오른쪽 순서로, ↑↓: 위·아래 층으로 (이어진 노드가 있으면 그중 가까운 것), Home·End: 층의 처음·끝.
 * 더 갈 곳이 없으면 지금 노드를 그대로 돌려줍니다.
 */
export function navigateMap(map: KnowledgeMap, positions: Map<string, ScreenPoint>, currentId: string, key: MapKey): string {
  const node = map.byId.get(currentId);
  const from = positions.get(currentId);
  if (!node || !from) return currentId;
  const ordered = (layer: MapLayer) =>
    map.nodes
      .filter((item) => item.layer === layer && positions.has(item.id))
      .sort((a, b) => positions.get(a.id)!.x - positions.get(b.id)!.x || positions.get(a.id)!.y - positions.get(b.id)!.y);
  const row = ordered(node.layer);
  const index = row.findIndex((item) => item.id === currentId);
  if (key === "ArrowLeft") return row[Math.max(0, index - 1)]?.id ?? currentId;
  if (key === "ArrowRight") return row[Math.min(row.length - 1, index + 1)]?.id ?? currentId;
  if (key === "Home") return row[0]?.id ?? currentId;
  if (key === "End") return row[row.length - 1]?.id ?? currentId;
  const target = MAP_LAYERS[MAP_LAYERS.indexOf(node.layer) + (key === "ArrowUp" ? -1 : 1)];
  if (!target) return currentId;
  const connected = (map[key === "ArrowUp" ? "above" : "below"].get(currentId) ?? []).filter((id) => positions.has(id));
  const candidates = connected.length ? connected : ordered(target).map((item) => item.id);
  let best = currentId;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const id of candidates) {
    const point = positions.get(id)!;
    const distance = Math.abs(point.x - from.x) + 0.35 * Math.abs(point.y - from.y);
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}
