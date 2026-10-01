/*
 * 홈 프로젝트 자세히 보기의 작은 도식과 넓게 보기가 함께 쓰는 흐름 모델
 * ─────────────────────────────────────────────────────────────
 * 흐름은 세 종류로 나눕니다.
 *   recorded    : 실제 화면에 표시된 기록을 그대로 옮겨 재생하는 흐름 (출처·한계 표시 필수)
 *   code        : 저장소 코드에서 확인한 처리 순서·형식·이름만 담은 흐름 (실행 값·결과 없음)
 *   explanatory : 프로젝트 소개 글에 적힌 구성 요소만으로 그린 설명용 흐름 (수치·결과 없음)
 * 설명용 흐름은 capabilityArchitectures.ts 의 직선 도식을 그대로 변환합니다.
 * 코드로 확인한 흐름이 같은 내용을 더 정확히 그리면 해당 설명용 도식은 대신합니다.
 */
import type { Locale } from "@/lib/i18nContent";
import { pick, type Localized } from "./capabilityModel";
import { ARCHITECTURES, LANES, type ArchDiagram, type LaneId, type ProjectArchitecture } from "./capabilityArchitectures";
import { CODE_FLOWS, SUPERSEDED_DIAGRAMS } from "./capabilityCodeFlows";
import { RECORDED_FLOWS } from "./capabilityRecordedTraces";

export type FlowEvidence = "recorded" | "code" | "explanatory";

export interface FlowReading {
  label: Localized;
  value: string;
  unit: string;
  /** 품질이 의심되어 판단에서 뺀 값 */
  doubtful?: boolean;
}

/** 기록된 흐름에서 그 단계가 화면에 내놓은 실제 값 */
export type FlowBody =
  | { kind: "readings"; readings: FlowReading[]; note?: Localized }
  | { kind: "count"; value: string; label: Localized; note?: Localized; stamp?: { label: Localized; value: string } }
  | { kind: "quality"; good: number; doubtful: number; excluded: FlowReading; excludedTag: Localized }
  | { kind: "range"; reading: FlowReading; lower: number; upper: number; inRange: number; outside: number; noRange: number }
  | { kind: "note"; text: Localized; muted?: Localized }
  | { kind: "cross"; doubt: FlowReading; partners: FlowReading[]; neq: Localized; verdict: Localized; chip: Localized }
  | { kind: "marker"; place: Localized; pin: string; note?: Localized };

export interface FlowNode {
  id: string;
  lane: LaneId;
  title: Localized;
  /** 작은 요약 줄에 쓰는 짧은 이름 (없으면 title) */
  short?: Localized;
  /** 도식의 단계 상자에 쓰는 이름 — 좁은 칸에 맞춘 모듈 이름 (없으면 title) */
  label?: Localized;
  /** 단계가 켜질 때 읽어 주는 설명 */
  detail: Localized;
  tech?: string[];
  /** 예: "규칙" — 그 단계를 무엇이 계산하는지 */
  tag?: Localized;
  body?: FlowBody;
}

export interface FlowLink {
  from: string;
  to: string;
  /** 화살표가 나르는 것 */
  label?: Localized;
}

export interface FlowSourceItem {
  term: Localized;
  text: Localized;
}

export interface FlowSource {
  /** 한 줄 출처 표시 */
  summary: Localized;
  items: FlowSourceItem[];
  limits: Localized[];
}

export interface FlowView {
  key: string;
  slug: string;
  evidence: FlowEvidence;
  title?: Localized;
  caption?: Localized;
  /** 기록된 흐름: 화면을 확인한 날 (YYYY-MM-DD) */
  recordedOn?: string;
  /** 위에서 아래로 놓이는 역할 레인 순서 */
  lanes: LaneId[];
  /** 재생 순서대로 */
  nodes: FlowNode[];
  links: FlowLink[];
  source: FlowSource;
  scope: "detailed" | "overview";
  /** 도식 아래 한 줄 출처 표시 (없으면 흐름 종류의 기본 문구) */
  provenance?: Localized;
}

const t = (ko: string, en: string): Localized => ({ ko, en });

/** 작은 요약 줄에 붙는 짧은 레인 이름 */
export const LANE_SHORT: Record<LaneId, Localized> = {
  user: t("화면", "Screen"),
  ai: t("AI", "AI"),
  server: t("서버", "Server"),
  data: t("데이터", "Data"),
  field: t("현장", "Field"),
  sim: t("시뮬", "Sim"),
  tool: t("도구", "Tool"),
  operator: t("운영자", "Operator"),
  external: t("외부", "External"),
  mywork: t("내 작업", "Mine"),
  team: t("팀", "Team"),
  outcome: t("결과", "Result"),
};

export function laneName(lane: LaneId, locale: Locale): string {
  return LANES[lane][locale];
}

/** edges[i] 는 nodes[i] → nodes[i+1] 입니다 (capabilityArchitectures.ts 규칙). */
export function linearLinks(diagram: ArchDiagram): FlowLink[] {
  return diagram.nodes.slice(0, -1).map((node, index) => ({
    from: node.id,
    to: diagram.nodes[index + 1].id,
    ...(diagram.edges[index] ? { label: diagram.edges[index] } : {}),
  }));
}

function explanatorySource(arch: ProjectArchitecture, diagram: ArchDiagram): FlowSource {
  const limits: Localized[] = [
    t("실행 기록이 아니므로 수치나 결과를 보여 주지 않습니다.", "Not a run record, so it shows no numbers or results."),
    t("단계 사이 재생 간격은 보기 쉽게 정한 속도이며 실제 처리 시간과 관계없습니다.", "The pace between steps is for viewing and has nothing to do with processing time."),
  ];
  if (arch.scope === "overview") {
    limits.push(t("소개 글이 짧아 개요 수준으로만 그렸습니다. 적혀 있지 않은 구성 요소는 덧붙이지 않았습니다.", "The write-up is short, so this is a high-level overview with nothing added that it does not mention."));
  }
  if (diagram.caption) limits.push(diagram.caption);
  if (arch.note) limits.push(arch.note);
  return {
    summary: t("프로젝트 소개 글을 바탕으로 그린 설명용 흐름", "Explanatory flow drawn from the project write-up"),
    items: [
      { term: t("근거", "Basis"), text: t("공개된 프로젝트 소개 글에 적힌 구성 요소와 순서만 사용했습니다.", "Uses only the components and order described in the published project write-up.") },
      { term: t("화살표 이름", "Arrow labels"), text: t("단계 사이에 오가는 데이터의 종류를 적은 것이며, 실제 값이 아닙니다.", "Name the kind of data passed between steps; they are not actual values.") },
    ],
    limits,
  };
}

export function explanatoryFlow(arch: ProjectArchitecture, diagram: ArchDiagram, index: number): FlowView {
  return {
    key: `${arch.slug}:diagram:${index}`,
    slug: arch.slug,
    evidence: "explanatory",
    title: diagram.title,
    caption: diagram.caption,
    lanes: diagram.lanes,
    nodes: diagram.nodes.map((node) => ({
      id: node.id,
      lane: node.lane,
      title: node.label,
      ...(node.box ? { label: node.box } : {}),
      detail: node.detail,
      ...(node.tech ? { tech: node.tech } : {}),
    })),
    links: linearLinks(diagram),
    source: explanatorySource(arch, diagram),
    scope: arch.scope,
  };
}

/** 프로젝트의 흐름 목록 — 기록된 흐름, 코드로 확인한 흐름, 설명용 흐름 순서입니다. */
export function flowViewsFor(slug: string): FlowView[] {
  const arch = ARCHITECTURES[slug];
  const recorded = RECORDED_FLOWS.filter((flow) => flow.slug === slug);
  const code = CODE_FLOWS.filter((flow) => flow.slug === slug);
  const replaced = SUPERSEDED_DIAGRAMS[slug] ?? [];
  const explanatory = arch ? arch.diagrams.flatMap((diagram, index) => (replaced.includes(index) ? [] : [explanatoryFlow(arch, diagram, index)])) : [];
  return [...recorded, ...code, ...explanatory];
}

export function hasRecordedFlow(slug: string): boolean {
  return RECORDED_FLOWS.some((flow) => flow.slug === slug);
}

export function findFlow(slug: string, key: string | null | undefined): FlowView | null {
  const flows = flowViewsFor(slug);
  return flows.find((flow) => flow.key === key) ?? flows[0] ?? null;
}

export function nodeIndex(flow: FlowView, id: string): number {
  return flow.nodes.findIndex((node) => node.id === id);
}

export function incomingLinks(flow: FlowView, id: string): FlowLink[] {
  return flow.links.filter((link) => link.to === id);
}

export function outgoingLinks(flow: FlowView, id: string): FlowLink[] {
  return flow.links.filter((link) => link.from === id);
}

/** 흐름을 한 문장으로 — 화면 읽기 프로그램과 작은 요약에 씁니다. */
export function flowSentence(flow: FlowView, locale: Locale): string {
  return flow.nodes.map((node) => pick(node.short ?? node.title, locale)).join(" → ");
}

/** 도식의 단계 상자에 쓰는 이름 */
export function nodeLabel(node: FlowNode, locale: Locale): string {
  return pick(node.label ?? node.title, locale);
}

/** 흐름에 적어 둔 한 줄 출처가 없을 때 쓰는 종류별 문구 */
const DEFAULT_PROVENANCE: Record<FlowEvidence, Localized> = {
  recorded: t("화면에서 옮긴 기록", "Copied from a screen record"),
  code: t("저장소 코드에서 확인 · 실행 기록 아님", "Traced in repository code · not a run record"),
  explanatory: t("프로젝트 소개 글 기준 · 실제 값 없음", "From the project write-up · no real values"),
};

/** 도식 아래에 두는 한 줄 출처 (개요 수준 도식은 그 사실도 덧붙입니다) */
export function flowProvenance(flow: FlowView, locale: Locale): string {
  const base = pick(flow.provenance ?? DEFAULT_PROVENANCE[flow.evidence], locale);
  return flow.scope === "overview" ? `${base} · ${locale === "en" ? "high-level overview" : "개요 수준"}` : base;
}

/* ────────────────────────────────────────────
   연결선 경로 (자세히 보기와 넓게 보기의 레인 도식)
   한 열에는 한 단계만 놓이므로, 빈 칸을 따라가는 경로를 고릅니다.
──────────────────────────────────────────── */

/** row: 레인 순서(위→아래), col: 단계 순서(왼→오) */
export interface GridCell {
  id: string;
  row: number;
  col: number;
}

/**
 * straight : 같은 레인을 따라 곧게
 * across   : 보내는 레인을 따라 받는 상자의 열까지 간 뒤, 위·아래로 꺾어 상자에 닿음
 * rise     : 보내는 상자의 위·아래로 나와 받는 레인까지 간 뒤, 그 레인을 따라 상자 옆에 닿음
 * gap      : 두 상자 사이의 좁은 틈에서 꺾음 (이름표를 붙일 자리가 없음)
 */
export type RouteKind = "straight" | "across" | "rise" | "gap";

export function routeKind(a: GridCell, b: GridCell, cells: GridCell[]): RouteKind {
  if (a.row === b.row) return "straight";
  const taken = (row: number, col: number) => cells.some((cell) => cell.id !== a.id && cell.id !== b.id && cell.row === row && cell.col === col);
  const lo = Math.min(a.row, b.row);
  const hi = Math.max(a.row, b.row);
  const rowsBetween: number[] = [];
  for (let row = lo + 1; row < hi; row += 1) rowsBetween.push(row);
  const freeAlong = (row: number, from: number, to: number) => {
    for (let col = from; col <= to; col += 1) if (taken(row, col)) return false;
    return true;
  };
  const freeDown = (col: number, rows: number[]) => rows.every((row) => !taken(row, col));
  if (b.col === a.col + 1 && freeAlong(a.row, b.col, b.col) && freeDown(b.col, rowsBetween)) return "across";
  if (freeDown(a.col, [...rowsBetween, b.row]) && freeAlong(b.row, a.col, b.col - 1)) return "rise";
  if (freeAlong(a.row, a.col + 1, b.col) && freeDown(b.col, rowsBetween)) return "across";
  return "gap";
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoutedPath {
  d: string;
  /** 이름표를 놓을 가로 구간의 가운데와 그 길이 (자리가 없으면 null) */
  label: { x: number; y: number; room: number } | null;
}

const round = (value: number) => Math.round(value * 10) / 10;

export function routePath(kind: RouteKind, a: Box, b: Box, radius = 8): RoutedPath {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  const up = bcy < acy;
  if (kind === "straight") {
    const x1 = round(a.x + a.w);
    const x2 = round(b.x);
    const y = round(acy);
    return { d: `M${x1} ${y}H${x2}`, label: { x: round((x1 + x2) / 2), y, room: round(x2 - x1) } };
  }
  if (kind === "across") {
    const x1 = round(a.x + a.w);
    const y1 = round(acy);
    const x2 = round(bcx);
    const y2 = round(up ? b.y + b.h : b.y);
    const r = Math.max(0, Math.min(radius, Math.abs(y2 - y1) / 2, (x2 - x1) / 2));
    const dy = up ? -r : r;
    return {
      d: `M${x1} ${y1}H${round(x2 - r)}Q${x2} ${y1} ${x2} ${round(y1 + dy)}V${y2}`,
      label: { x: round((x1 + x2 - r) / 2), y: y1, room: round(x2 - r - x1) },
    };
  }
  if (kind === "rise") {
    const x1 = round(acx);
    const y1 = round(up ? a.y : a.y + a.h);
    const x2 = round(b.x);
    const y2 = round(bcy);
    const r = Math.max(0, Math.min(radius, Math.abs(y2 - y1) / 2, (x2 - x1) / 2));
    const dy = up ? -r : r;
    return {
      d: `M${x1} ${y1}V${round(y2 - dy)}Q${x1} ${y2} ${round(x1 + r)} ${y2}H${x2}`,
      label: { x: round((x1 + r + x2) / 2), y: y2, room: round(x2 - x1 - r) },
    };
  }
  const x1 = round(a.x + a.w);
  const y1 = round(acy);
  const x2 = round(b.x);
  const y2 = round(bcy);
  if (Math.abs(y2 - y1) < 1) return { d: `M${x1} ${y1}H${x2}`, label: null };
  const xm = round(x2 - Math.min(14, (x2 - x1) / 2));
  const r = Math.max(0, Math.min(radius, Math.abs(y2 - y1) / 2, xm - x1, x2 - xm));
  const dy = y2 > y1 ? r : -r;
  return {
    d: `M${x1} ${y1}H${round(xm - r)}Q${xm} ${y1} ${xm} ${round(y1 + dy)}V${round(y2 - dy)}Q${xm} ${y2} ${round(xm + r)} ${y2}H${x2}`,
    label: null,
  };
}

/** 이름표 글자 폭 어림값 (0.8125rem = 13px 고정폭 글꼴: 한글 약 13px, 그 밖 약 7.8px) */
export function estimateLabelWidth(text: string): number {
  let width = 0;
  for (const char of text) width += /[ㄱ-힝]/.test(char) ? 13 : 7.8;
  return Math.round(width);
}

/** 이름표 알약의 좌우 여백 합 (안쪽 여백 + 테두리 + 연결선과의 틈) */
export const LABEL_CHROME_PX = 24;

/** 이름표 알약이 차지할 수 있는 최대 너비 (화면에 그릴 때 max-width) */
export function labelMaxWidth(room: number): number {
  return Math.max(40, room - 8);
}

/** 이름표를 연결선 위에 둘 수 있는지 — 두 줄까지 접을 수 있다고 봅니다. */
export function labelFits(text: string, room: number): boolean {
  if (!text) return false;
  const usable = room - LABEL_CHROME_PX;
  if (usable < 30) return false;
  return estimateLabelWidth(text) <= usable * 2;
}
