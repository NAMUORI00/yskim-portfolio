/*
 * 분야를 펼친 2.5D 층 그림의 배치 — 순수 함수만 둡니다 (테스트 대상).
 * ─────────────────────────────────────────────────────────────
 * 고른 분야 하나를 종류별 층으로 펼칩니다: 개념 → 구현한 방법 → 기술·도구 → 근거(프로젝트·논문·경력·코드 기록).
 *  - 층은 노드의 종류(kind)와 근거 출처로만 나눕니다. 위아래가 의존·포함 관계를 뜻하지 않고, 새 위계를 만들지 않습니다.
 *  - 선은 기록된 관계(EDGES)만 잇고 관계 이름(사용·구현·적용·뒷받침·바탕)을 그대로 씁니다. 근거 선은 노드의 근거(claims)입니다.
 *  - 다른 분야와의 연결은 층에 그리지 않고 따로 셉니다 (external) — 설명 칸과 분야 칩에 적습니다.
 *  - 관심·스택 목록 노드는 같은 층 끝에 "관심"·"스택 목록" 이름을 단 줄로 따로 둡니다 (경험처럼 보이지 않게).
 *  - 글자는 줄이지 않습니다 — 폭에 맞춰 줄을 바꾸고, 높이가 넘치면 그림을 스크롤합니다 (큰 분야도 읽을 수 있게).
 * 판은 뒤 모서리가 오른쪽으로 조금 밀린 평행사변형(2.5D)이고, 칩은 화면을 향한 가로 글자입니다.
 * 층 안의 순서는 위 층에서 이어진 노드들의 가로 위치 평균(무게중심)으로 정해 선이 덜 엇갈리게 합니다 (난수 없음).
 */
import { estimateTextWidth, type LabelBox } from "@/components/knowledgeMap/knowledgeMapLayout";
import type { ClaimMode, EvidenceKind } from "./knowledgeData";
import { nodesInOrder, type DomainId, type KEvidence, type KnowledgeGraph, type KNode, type Relation } from "./graph3dModel";

export type DetailTierKey = "concept" | "method" | "tech" | "evidence";
/** 위에서 아래로 그리는 층 순서 (비어 있는 층은 빠짐) */
export const DETAIL_TIERS: readonly DetailTierKey[] = ["concept", "method", "tech", "evidence"];

/** 층 안의 줄 묶음 — 근거가 있는 지식(main), 관심, 스택 목록, 그리고 근거의 종류 */
export type DetailGroupKey = "main" | "interest" | "listed" | "paper" | "project" | "research" | "work" | "trace" | "stack";
export type DetailGutterKey = Exclude<DetailGroupKey, "main">;

const EVIDENCE_GROUP: Record<EvidenceKind, DetailGroupKey> = {
  paper: "paper",
  project: "project",
  research: "research",
  work: "work",
  code: "trace",
  record: "trace",
  site: "trace",
  stack: "stack",
};
const GROUP_ORDER: DetailGroupKey[] = ["main", "interest", "listed", "paper", "project", "research", "work", "trace", "stack"];

export type DetailVariant = "rail" | "explorer";

export interface DetailMetrics {
  /** 칩 글자 크기 (px) */
  font: number;
  /** 줄 머리(관심·근거 종류) 글자 크기 */
  gutterFont: number;
  rowHeight: number;
  rowGap: number;
  chipHeight: number;
  chipGap: number;
  /** 칩 안에서 점 모양이 차지하는 폭 (글자 앞) */
  dotSpace: number;
  chipPadRight: number;
  padX: number;
  padY: number;
  /** 판 뒤 모서리가 오른쪽으로 밀리는 최대 폭과 판 높이에 대한 비율 */
  skewMax: number;
  skewRatio: number;
  titleHeight: number;
  titleGap: number;
  tierGap: number;
  slab: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  /** 근거 칩의 최대 폭 — 넘치면 줄임표 (전체 이름은 설명 칸·읽기용 이름에) */
  evidenceMax: number;
}

export const DETAIL_METRICS: Record<DetailVariant, DetailMetrics> = {
  rail: {
    font: 11,
    gutterFont: 10,
    rowHeight: 20,
    rowGap: 4,
    chipHeight: 18,
    chipGap: 4,
    dotSpace: 14,
    chipPadRight: 6,
    padX: 7,
    padY: 6,
    skewMax: 14,
    skewRatio: 0.3,
    titleHeight: 16,
    titleGap: 3,
    tierGap: 12,
    slab: 3,
    marginX: 4,
    marginTop: 6,
    marginBottom: 10,
    evidenceMax: 150,
  },
  explorer: {
    font: 12.5,
    gutterFont: 11.5,
    rowHeight: 28,
    rowGap: 6,
    chipHeight: 24,
    chipGap: 7,
    dotSpace: 17,
    chipPadRight: 9,
    padX: 14,
    padY: 11,
    skewMax: 34,
    skewRatio: 0.3,
    titleHeight: 20,
    titleGap: 5,
    tierGap: 24,
    slab: 4,
    marginX: 22,
    marginTop: 16,
    marginBottom: 20,
    evidenceMax: 240,
  },
};

export interface Pt {
  x: number;
  y: number;
}

export interface DetailItem {
  id: string;
  tier: DetailTierKey;
  group: DetailGroupKey;
  /** 근거가 있는 지식이 아님 (관심·스택 목록) — 점선으로 그립니다 */
  open: boolean;
  /** 칩에 보이는 글자 (근거는 짧은 이름, 넘치면 줄임표) */
  text: string;
  truncated: boolean;
  /** 고정폭 글자 (기술) */
  mono: boolean;
  /** 칩(누르는 자리) */
  box: LabelBox;
  /** 칩 앞의 점 모양 가운데 — 선이 여기서 나갑니다 */
  dot: Pt;
  /** 전체에서 몇 번째 줄인지 */
  row: number;
}

export interface DetailRow {
  tier: number;
  group: DetailGroupKey;
  y: number;
  items: string[];
  /** 묶음의 첫 줄에만 있는 줄 머리 (관심·스택 목록·근거 종류) */
  gutter?: { key: DetailGutterKey; box: LabelBox };
}

export interface DetailTier {
  key: DetailTierKey;
  items: string[];
  /** 근거가 있는 지식(또는 근거 출처) 수와 관심·스택 목록 수 */
  main: number;
  open: number;
  /** 판의 네 모서리: 뒤-왼쪽, 뒤-오른쪽, 앞-오른쪽, 앞-왼쪽 */
  corners: [Pt, Pt, Pt, Pt];
  /** 층 이름 자리 (판 뒤-왼쪽 모서리 위) */
  title: LabelBox;
  top: number;
  bottom: number;
}

export interface DetailLink {
  key: string;
  source: string;
  target: string;
  /** 기록된 관계, 또는 노드 → 근거 (claim) */
  relation: Relation | "claim";
  /** claim 일 때 근거의 성격 (구현·연구·관심·스택 목록) */
  modes?: ClaimMode[];
  /** SVG path */
  d: string;
  /** 관계 이름을 붙일 가운데 */
  mid: Pt;
}

export interface DomainDetailLayout {
  domain: DomainId;
  variant: DetailVariant;
  width: number;
  height: number;
  tiers: DetailTier[];
  rows: DetailRow[];
  items: Map<string, DetailItem>;
  /** 읽는 순서 (층 → 줄 → 왼쪽부터) — 키보드 이동과 화면 낭독 순서 */
  order: string[];
  /** 이 분야 안의 기록된 관계 */
  links: DetailLink[];
  /** 이 분야 노드 → 근거 */
  claims: DetailLink[];
  /** 이 분야 노드 → 다른 분야의 이웃 (층에 그리지 않음) */
  external: Map<string, string[]>;
}

export interface DetailLayoutInput {
  graph: KnowledgeGraph;
  domain: DomainId;
  width: number;
  variant: DetailVariant;
  /** 줄 머리 글자 (화면 언어) — 폭을 재는 데 씁니다 */
  gutterLabels: Record<DetailGutterKey, string>;
}

interface Candidate {
  id: string;
  group: DetailGroupKey;
  open: boolean;
  text: string;
  mono: boolean;
  order: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 이 분야 노드들이 근거로 든 출처 (처음 나온 순서) */
export function domainEvidence(graph: KnowledgeGraph, members: KNode[]): KEvidence[] {
  const seen = new Map<string, KEvidence>();
  for (const node of members) for (const claim of node.claims) if (!seen.has(claim.evidence.id)) seen.set(claim.evidence.id, claim.evidence);
  return Array.from(seen.values());
}

function chipWidth(text: string, metrics: DetailMetrics, mono: boolean): number {
  return metrics.dotSpace + estimateTextWidth(text, metrics.font, mono) + metrics.chipPadRight;
}

/** 칩이 max 를 넘으면 글자를 줄여 줄임표를 붙입니다. */
function fitText(text: string, metrics: DetailMetrics, mono: boolean, max: number): { text: string; truncated: boolean } {
  if (chipWidth(text, metrics, mono) <= max) return { text, truncated: false };
  const chars = Array.from(text);
  for (let length = chars.length - 1; length > 1; length -= 1) {
    const candidate = `${chars.slice(0, length).join("").trimEnd()}…`;
    if (chipWidth(candidate, metrics, mono) <= max) return { text: candidate, truncated: true };
  }
  return { text: `${chars[0] ?? ""}…`, truncated: true };
}

function nodeGroup(node: KNode): DetailGroupKey {
  return node.status === "evidenced" ? "main" : node.status;
}

/** 두 점 사이의 선 — 같은 줄이면 위로 휘는 호, 다른 줄이면 위아래로 이어지는 S 곡선 */
export function detailPath(a: Pt, b: Pt, sameRow: boolean): { d: string; mid: Pt } {
  if (sameRow) {
    const lift = 9 + Math.abs(b.x - a.x) * 0.14;
    const cx = (a.x + b.x) / 2;
    const cy = Math.min(a.y, b.y) - lift;
    return {
      d: `M ${round(a.x)} ${round(a.y)} Q ${round(cx)} ${round(cy)} ${round(b.x)} ${round(b.y)}`,
      mid: { x: round(0.25 * a.x + 0.5 * cx + 0.25 * b.x), y: round(0.25 * a.y + 0.5 * cy + 0.25 * b.y) },
    };
  }
  const dy = b.y - a.y;
  const c1 = { x: a.x, y: a.y + dy * 0.45 };
  const c2 = { x: b.x, y: b.y - dy * 0.45 };
  return {
    d: `M ${round(a.x)} ${round(a.y)} C ${round(c1.x)} ${round(c1.y)} ${round(c2.x)} ${round(c2.y)} ${round(b.x)} ${round(b.y)}`,
    mid: { x: round((a.x + 3 * c1.x + 3 * c2.x + b.x) / 8), y: round((a.y + 3 * c1.y + 3 * c2.y + b.y) / 8) },
  };
}

export function layoutDomainDetail({ graph, domain, width, variant, gutterLabels }: DetailLayoutInput): DomainDetailLayout {
  const m = DETAIL_METRICS[variant];
  const def = graph.domainById.get(domain);
  const members = def ? nodesInOrder(graph, def.members) : [];
  const memberIds = new Set(members.map((node) => node.id));
  const evidence = domainEvidence(graph, members);
  const evidenceOrder = new Map(evidence.map((item, index) => [item.id, index]));

  const planeLeft = m.marginX;
  const planeWidth = Math.max(80, width - 2 * m.marginX - m.skewMax);
  const innerWidth = planeWidth - 2 * m.padX;

  const items = new Map<string, DetailItem>();
  const rows: DetailRow[] = [];
  const tiers: DetailTier[] = [];
  const order: string[] = [];

  // 위 층에서 이어진 것: 기록된 관계(이 분야 안)와, 근거는 그 근거를 든 노드
  const internal = graph.links.filter((link) => memberIds.has(link.source) && memberIds.has(link.target));
  const linkedAbove = (id: string): string[] => {
    if (memberIds.has(id)) return internal.flatMap((link) => (link.source === id ? [link.target] : link.target === id ? [link.source] : []));
    return members.filter((node) => node.claims.some((claim) => claim.evidence.id === id)).map((node) => node.id);
  };

  const candidatesFor = (tier: DetailTierKey): Candidate[] => {
    if (tier === "evidence") {
      return evidence.map((item) => ({ id: item.id, group: EVIDENCE_GROUP[item.kind], open: item.kind === "stack", text: item.short, mono: false, order: evidenceOrder.get(item.id) ?? 0 }));
    }
    return members.filter((node) => node.kind === tier).map((node) => ({ id: node.id, group: nodeGroup(node), open: node.status !== "evidenced", text: node.label, mono: node.kind === "tech", order: node.order }));
  };

  let y = m.marginTop;
  DETAIL_TIERS.forEach((tierKey) => {
    const candidates = candidatesFor(tierKey);
    if (!candidates.length) return;
    const tierIndex = tiers.length;
    // 무게중심: 이미 놓인(위 층) 이웃의 가로 위치 평균. 이웃이 없으면 원본 순서대로 뒤에 둡니다.
    const barycenter = (id: string): number | null => {
      const placed = linkedAbove(id).flatMap((other) => {
        const item = items.get(other);
        return item ? [item.dot.x] : [];
      });
      return placed.length ? placed.reduce((sum, value) => sum + value, 0) / placed.length : null;
    };
    const keyed = candidates.map((candidate) => ({ candidate, center: tierIndex === 0 ? null : barycenter(candidate.id) }));
    keyed.sort((a, b) => {
      const group = GROUP_ORDER.indexOf(a.candidate.group) - GROUP_ORDER.indexOf(b.candidate.group);
      if (group) return group;
      if (a.center !== null && b.center !== null && Math.abs(a.center - b.center) > 0.01) return a.center - b.center;
      if (a.center !== null && b.center === null) return -1;
      if (a.center === null && b.center !== null) return 1;
      return a.candidate.order - b.candidate.order;
    });

    // 줄 머리 폭은 층 안에서 같게 (칩이 같은 자리에서 시작하도록)
    const groups = Array.from(new Set(keyed.map((entry) => entry.candidate.group)));
    const gutterWidth = Math.max(
      0,
      ...groups.filter((group): group is DetailGutterKey => group !== "main").map((group) => estimateTextWidth(gutterLabels[group], m.gutterFont, false, true) + 8),
    );

    interface Line {
      group: DetailGroupKey;
      first: boolean;
      chips: Array<{ candidate: Candidate; text: string; truncated: boolean; width: number }>;
      used: number;
    }
    const lines: Line[] = [];
    for (const group of groups) {
      const offset = group === "main" ? 0 : gutterWidth;
      const room = innerWidth - offset;
      let line: Line = { group, first: true, chips: [], used: 0 };
      lines.push(line);
      for (const { candidate } of keyed.filter((entry) => entry.candidate.group === group)) {
        const limit = tierKey === "evidence" ? Math.min(m.evidenceMax, room) : room;
        const fitted = fitText(candidate.text, m, candidate.mono, limit);
        const chip = chipWidth(fitted.text, m, candidate.mono);
        if (line.chips.length && line.used + m.chipGap + chip > room) {
          line = { group, first: false, chips: [], used: 0 };
          lines.push(line);
        }
        line.used += (line.chips.length ? m.chipGap : 0) + chip;
        line.chips.push({ candidate, text: fitted.text, truncated: fitted.truncated, width: chip });
      }
    }

    const titleTop = y;
    const top = y + m.titleHeight + m.titleGap;
    const height = 2 * m.padY + lines.length * m.rowHeight + (lines.length - 1) * m.rowGap;
    const skew = Math.min(m.skewMax, height * m.skewRatio);
    const tierItems: string[] = [];
    lines.forEach((line, lineIndex) => {
      const center = top + m.padY + lineIndex * (m.rowHeight + m.rowGap) + m.rowHeight / 2;
      // 뒤(위) 줄일수록 오른쪽으로 — 판이 비스듬히 누운 것처럼
      const rowLeft = planeLeft + skew * (1 - (center - top) / height) + m.padX;
      const offset = line.group === "main" ? 0 : gutterWidth;
      const row: DetailRow = { tier: tierIndex, group: line.group, y: round(center), items: [] };
      if (line.first && line.group !== "main") {
        row.gutter = { key: line.group, box: { left: round(rowLeft), top: round(center - m.chipHeight / 2), width: round(gutterWidth - 6), height: m.chipHeight } };
      }
      let x = rowLeft + offset;
      for (const chip of line.chips) {
        const box = { left: round(x), top: round(center - m.chipHeight / 2), width: round(chip.width), height: m.chipHeight };
        items.set(chip.candidate.id, {
          id: chip.candidate.id,
          tier: tierKey,
          group: chip.candidate.group,
          open: chip.candidate.open,
          text: chip.text,
          truncated: chip.truncated,
          mono: chip.candidate.mono,
          box,
          dot: { x: round(x + m.dotSpace / 2 + 1), y: round(center) },
          row: rows.length,
        });
        row.items.push(chip.candidate.id);
        tierItems.push(chip.candidate.id);
        order.push(chip.candidate.id);
        x += chip.width + m.chipGap;
      }
      rows.push(row);
    });

    const bottom = top + height;
    tiers.push({
      key: tierKey,
      items: tierItems,
      main: candidates.filter((candidate) => !candidate.open).length,
      open: candidates.filter((candidate) => candidate.open).length,
      corners: [
        { x: round(planeLeft + skew), y: round(top) },
        { x: round(planeLeft + skew + planeWidth), y: round(top) },
        { x: round(planeLeft + planeWidth), y: round(bottom) },
        { x: round(planeLeft), y: round(bottom) },
      ],
      title: { left: round(planeLeft + skew + 1), top: round(titleTop), width: round(planeWidth - 1), height: m.titleHeight },
      top: round(top),
      bottom: round(bottom),
    });
    y = bottom + m.slab + m.tierGap;
  });

  const links: DetailLink[] = internal.flatMap((link) => {
    const a = items.get(link.source);
    const b = items.get(link.target);
    if (!a || !b) return [];
    return [{ key: link.key, source: link.source, target: link.target, relation: link.relation, ...detailPath(a.dot, b.dot, a.row === b.row) }];
  });

  const claimModes = new Map<string, { source: string; target: string; modes: ClaimMode[] }>();
  for (const node of members) {
    for (const claim of node.claims) {
      const key = `${node.id}>${claim.evidence.id}`;
      const entry = claimModes.get(key) ?? { source: node.id, target: claim.evidence.id, modes: [] };
      if (!entry.modes.includes(claim.mode)) entry.modes.push(claim.mode);
      claimModes.set(key, entry);
    }
  }
  const claims: DetailLink[] = Array.from(claimModes.entries()).flatMap(([key, entry]) => {
    const a = items.get(entry.source);
    const b = items.get(entry.target);
    if (!a || !b) return [];
    return [{ key, source: entry.source, target: entry.target, relation: "claim" as const, modes: entry.modes, ...detailPath(a.dot, b.dot, a.row === b.row) }];
  });

  const external = new Map<string, string[]>();
  for (const node of members) {
    const others = (graph.neighbors.get(node.id) ?? []).filter((id) => !memberIds.has(id));
    if (others.length) external.set(node.id, Array.from(new Set(others)));
  }

  const height = Math.ceil((tiers.length ? y - m.tierGap : m.marginTop) + m.marginBottom);
  return { domain, variant, width, height, tiers, rows, items, order, links, claims, external };
}

/* ── 키보드 이동 (층 그림) ─────────────────────── */

export type DetailNavKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "Home" | "End" | "PageUp" | "PageDown";

export function isDetailNavKey(key: string): key is DetailNavKey {
  return ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(key);
}

/**
 * ←→: 읽는 순서로 앞뒤, ↑↓: 바로 위·아래 줄에서 가로로 가장 가까운 칩, Home·End: 이 층의 처음·끝,
 * PageUp·PageDown: 이전·다음 층의 처음. 더 갈 곳이 없으면 지금 칩을 그대로 돌려줍니다.
 */
export function navigateDetail(layout: DomainDetailLayout, currentId: string, key: DetailNavKey): string {
  const item = layout.items.get(currentId);
  if (!item) return layout.order[0] ?? currentId;
  const index = layout.order.indexOf(currentId);
  const tier = layout.tiers.findIndex((entry) => entry.key === item.tier);
  if (key === "ArrowRight") return layout.order[Math.min(layout.order.length - 1, index + 1)] ?? currentId;
  if (key === "ArrowLeft") return layout.order[Math.max(0, index - 1)] ?? currentId;
  if (key === "Home") return layout.tiers[tier]?.items[0] ?? currentId;
  if (key === "End") return layout.tiers[tier]?.items[layout.tiers[tier].items.length - 1] ?? currentId;
  if (key === "PageUp" || key === "PageDown") {
    const next = layout.tiers[tier + (key === "PageDown" ? 1 : -1)];
    return next?.items[0] ?? currentId;
  }
  const row = layout.rows[item.row + (key === "ArrowDown" ? 1 : -1)];
  if (!row) return currentId;
  let best = currentId;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const id of row.items) {
    const gap = Math.abs(layout.items.get(id)!.dot.x - item.dot.x);
    if (gap < bestGap) {
      best = id;
      bestGap = gap;
    }
  }
  return best;
}
