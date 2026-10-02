import { materializeKnowledge } from "@/content/knowledge";
/*
 * 3D 지식 지도 — /design/knowledge-graph-3d 미리보기 전용 모델 (공개 홈 "/"에서는 쓰지 않습니다)
 * ─────────────────────────────────────────────────────────────
 * knowledgeData.ts 의 원본 자료(분야 · 지식 노드 · 연결 · 근거)를 화면 언어로 풀고,
 *  - 근거마다 이 사이트 안에서 볼 수 있는 제목·상태·주소를 콘텐츠에서 찾아 붙이고,
 *  - 노드의 성격(구현 / 연구·실험 / 관심 / 스택 목록)을 근거에서만 계산하고,
 *  - 이웃(로컬 그래프 깊이), 분야 묶음, "이 작업이 근거가 된 지식"을 계산합니다.
 * 노드 id 는 언어와 관계없이 같아서 언어를 바꿔도 같은 자리에 같은 노드가 남습니다.
 */
import type { PortfolioContent } from "@/content";
import type { Locale } from "@/lib/i18nContent";
import type { Localized } from "@/components/capabilities/capabilityModel";
import {
  DOMAINS,
  EDGES,
  EVIDENCE_SOURCES,
  NODES,
  type ClaimMode,
  type DomainId,
  type EvidenceKind,
  type EvidenceSourceDef,
  type NodeKind,
  type Relation,
} from "./knowledgeData";

export type { DomainId, NodeKind, Relation } from "./knowledgeData";

/** 근거가 있는 지식 · 더 살펴보고 싶다고 적은 주제 · 기술 스택에만 적힌 항목 */
export type NodeStatus = "evidenced" | "interest" | "listed";

export interface KEvidence {
  id: string;
  kind: EvidenceKind;
  title: string;
  /** 분야를 펼친 층 그림의 근거 칸에 쓰는 짧은 이름 (전체 이름은 title) */
  short: string;
  /** 상태 문구 (예: KCI 게재 · 제1저자, IEEE Access 심사 중, 시뮬레이터 검증) */
  status: string;
  href?: string;
}

export interface KClaim {
  evidence: KEvidence;
  /** 원문(한국어) 문장 */
  quote: string;
  mode: ClaimMode;
}

export interface KNode {
  id: string;
  kind: NodeKind;
  domain: DomainId;
  label: string;
  title: string;
  what: string;
  did: string;
  status: NodeStatus;
  /** 직접 구현·제작한 근거가 있는지 */
  built: boolean;
  /** 실험·비교·논문으로 다룬 근거가 있는지 */
  studied: boolean;
  claims: KClaim[];
  /** 근거 출처 (중복 없이, 원본 순서) */
  sources: KEvidence[];
  /** 원본 자료 순서 */
  order: number;
}

export interface KDomain {
  id: DomainId;
  /** 포커스 id (domain:<id>) */
  key: string;
  label: string;
  title: string;
  summary: string;
  order: number;
  /** 원본 순서의 노드 id */
  members: string[];
  /** 근거가 있는 노드 수 */
  evidenced: number;
}

export interface KLink {
  key: string;
  source: string;
  target: string;
  relation: Relation;
  evidence: KEvidence;
  quote: string;
}

export interface KnowledgeGraph {
  domains: KDomain[];
  domainById: Map<DomainId, KDomain>;
  nodes: KNode[];
  byId: Map<string, KNode>;
  links: KLink[];
  /** 방향 없는 이웃 (원본 연결 순서) */
  neighbors: Map<string, string[]>;
  linksOf: Map<string, KLink[]>;
  /** 쓰인 근거 출처 */
  evidence: Map<string, KEvidence>;
  /** 근거 출처 → 그 근거로 뒷받침되는 노드 (노드 근거 + 연결의 양 끝) */
  evidenceNodes: Map<string, string[]>;
  counts: GraphCounts;
}

export interface GraphCounts {
  domains: number;
  evidenced: number;
  interest: number;
  listed: number;
  built: number;
  studied: number;
  links: number;
  kinds: Record<NodeKind, number>;
}

/** 화면 언어의 문구 (공개 홈의 지연 로딩 조각과 모듈을 나눠 갖지 않도록 이 파일에 둡니다) */
function pick(text: Localized, locale: Locale): string {
  return locale === "en" ? text.en : text.ko;
}

export const DOMAIN_PREFIX = "domain:";

export function domainKey(id: DomainId): string {
  return `${DOMAIN_PREFIX}${id}`;
}

export function linkKey(source: string, target: string): string {
  return `${source}>${target}`;
}

const STATUS_TEXT = {
  research: { ko: "연구 관심 분야 글", en: "Research interest note" },
  interestDid: {
    ko: "더 살펴보고 싶은 주제로 적어 둔 것입니다. 이 포트폴리오에 관련 작업 기록은 아직 없습니다.",
    en: "Listed as a topic to explore next; no work on it is documented in this portfolio yet.",
  },
  listedDid: {
    ko: "기술 스택 목록에 적혀 있지만, 이 포트폴리오에 연결된 작업 기록은 아직 없습니다.",
    en: "Listed in the technology stack, but no work using it is documented in this portfolio yet.",
  },
} as const;

/**
 * 프로젝트·연구 글의 짧은 이름 — 공개 홈의 층위형 지도(knowledgeMapModel 의 SHORT_LABELS)와 같은 이름입니다 (테스트가 확인).
 * 그 모듈을 여기서 불러오면 공개 홈 번들이 이름을 내보내도록 바뀌므로, 미리보기 안에 같은 값을 둡니다.
 */
export const EVIDENCE_SHORT: Record<string, Localized> = {
  "research:rag": { ko: "문서 검색", en: "Retrieval" },
  "research:video-qa": { ko: "영상 QA", en: "Video QA" },
  "research:sensor-operations": { ko: "센서 운영", en: "Sensor ops" },
  "research:edge-llm": { ko: "로컬 AI", en: "Local AI" },
  "research:audio-voice": { ko: "음원 분리", en: "Audio" },
  "research:agentic-workflow": { ko: "개발 자동화", en: "Automation" },
  "project:smartfarm-rag": { ko: "스마트팜 RAG", en: "SmartFarm RAG" },
  "project:mv-evirag": { ko: "MV-EviRAG", en: "MV-EviRAG" },
  "project:music-splitter-web": { ko: "음원 분리 웹", en: "Splitter web" },
  "project:golden-glove": { ko: "음악 장갑", en: "Music glove" },
  "project:food-scan": { ko: "음식 영양 앱", en: "Food scan app" },
  "project:tourism-data": { ko: "관광 데이터", en: "Tourism data" },
  "project:smart-home-2017": { ko: "스마트홈", en: "Smart home" },
  "project:unity-hackathon": { ko: "Unity 게임", en: "Unity game" },
  "project:hangul-clock": { ko: "한글시계", en: "Word clock" },
  "project:js-quiz-app": { ko: "퀴즈 앱", en: "Quiz app" },
  "project:aerospace-rag": { ko: "항공우주 RAG", en: "Aerospace RAG" },
  "project:good-price-jeju": { ko: "착한가격업소", en: "Business finder" },
  "project:cross-review-bridge": { ko: "AI 교차 리뷰", en: "AI cross-review" },
  "project:music-source-separation": { ko: "분리 모델 학습", en: "Separation training" },
  "project:mediamtx-installer": { ko: "MediaMTX 설치", en: "MediaMTX setup" },
  "project:introduce-cv-page": { ko: "PR 블로그", en: "PR blog" },
  "project:spring-community-board": { ko: "Spring 게시판", en: "Spring board" },
};

/** 짧은 이름이 없을 때 — 첫 구절만 남기고, 그래도 길면 줄입니다. */
function shortTitle(title: string, max = 14): string {
  const head = title.split(/\s*(?:[:(—–]|\s-\s|와\s|과\s|\sand\s|\sfor\s|\swith\s)/)[0]?.trim() || title.trim();
  return head.length > max ? `${head.slice(0, max - 1)}…` : head;
}

/** 원문 파일 (테스트·관리용 — 화면에는 쓰지 않습니다) */
export function evidenceSourceDef(id: string): EvidenceSourceDef | null {
  if (id.startsWith("project:")) {
    const slug = id.slice("project:".length);
    return { id, kind: "project", files: [`content/projects/${slug}.mdx`], ref: slug, href: `/projects/${slug}` };
  }
  if (id.startsWith("research:")) {
    const slug = id.slice("research:".length);
    return { id, kind: "research", files: [`content/research/${slug}.mdx`], ref: slug, href: `/research/${slug}` };
  }
  return EVIDENCE_SOURCES.find((item) => item.id === id) ?? null;
}

function resolveEvidence(id: string, source: PortfolioContent, localized: PortfolioContent, locale: Locale): KEvidence | null {
  const timeline = source.education.find(e => e.id === id);
  const def = evidenceSourceDef(id) ?? (timeline ? {id, kind: timeline.type === "publication" ? "paper" as const : "work" as const, files:["content/education.json"], ref:timeline.degree} : null);
  if (!def) return null;
  const short = (title: string) => {
    const named = def.kind === "paper" || def.kind === "work" ? undefined : def.short ?? EVIDENCE_SHORT[id];
    return named ? pick(named, locale) : shortTitle(title);
  };
  if (def.kind === "project") {
    const original = source.projects.find((item) => item.slug === def.ref);
    if (!original || original.status !== "published") return null;
    const translated = localized.projects.find((item) => item.slug === def.ref) ?? original;
    // 상태 줄은 홈 목록과 같은 한 줄 성과(metric)를 그대로 씁니다 (예: IEEE Access 심사 중 · 2026.08 투고 · 제1저자).
    return { id, kind: "project", title: translated.name, short: short(translated.name), status: translated.metric || translated.period, href: def.href };
  }
  if (def.kind === "research") {
    const original = source.research.find((item) => item.slug === def.ref);
    if (!original || original.status !== "published") return null;
    const translated = localized.research.find((item) => item.slug === def.ref) ?? original;
    return { id, kind: "research", title: translated.title, short: short(translated.title), status: STATUS_TEXT.research[locale], href: def.href };
  }
  if (def.kind === "paper" || def.kind === "work") {
    const index = source.education.findIndex((item) => item.id === id || (!item.id && item.degree === def.ref));
    if (index < 0 || source.education[index].status !== "published") return null;
    const entry = localized.education[index] ?? source.education[index];
    const title = def.kind === "paper" ? entry.degree : `${entry.degree} · ${entry.school}`;
    return { id, kind: def.kind, title, short: short(title), status: [entry.school, entry.period, entry.note].filter(Boolean).join(" · "), href: def.href };
  }
  const title = def.title ? pick(def.title, locale) : id;
  return { id, kind: def.kind, title, short: short(title), status: def.status ? pick(def.status, locale) : "", href: def.href };
}

/** 노드의 성격 — 근거에서만 정합니다 (구현·연구가 하나라도 있으면 근거가 있는 지식). */
export function nodeStatusFrom(modes: ClaimMode[]): NodeStatus {
  if (modes.some((mode) => mode === "built" || mode === "studied")) return "evidenced";
  if (modes.includes("interest")) return "interest";
  return "listed";
}

export function buildKnowledgeGraph(source: PortfolioContent, localized: PortfolioContent, locale: Locale): KnowledgeGraph {
  const { nodes: definitions, edges: relationships } = materializeKnowledge(source);
  const evidence = new Map<string, KEvidence>();
  const evidenceOf = (id: string): KEvidence | null => {
    if (!evidence.has(id)) {
      const resolved = resolveEvidence(id, source, localized, locale);
      if (!resolved) return null;
      evidence.set(id, resolved);
    }
    return evidence.get(id)!;
  };

  const nodes: KNode[] = definitions.flatMap((def, order): KNode[] => {
    const claims = def.claims.flatMap((claim): KClaim[] => {
      const item = evidenceOf(claim.source);
      return item ? [{ evidence: item, quote: claim.quote, mode: claim.mode }] : [];
    });
    // 근거가 콘텐츠에서 사라지면 노드도 빠집니다 (억지로 남기지 않음).
    if (!claims.length) return [];
    const status = nodeStatusFrom(claims.map((claim) => claim.mode));
    const did = status === "evidenced" ? Array.from(new Set(claims.filter(c => c.mode === "built" || c.mode === "studied").map(c => c.quote))).join("\n") : status === "interest" ? STATUS_TEXT.interestDid[locale] : STATUS_TEXT.listedDid[locale];
    const sources = Array.from(new Map(claims.map((claim) => [claim.evidence.id, claim.evidence])).values());
    return [
      {
        id: def.id,
        kind: def.kind,
        domain: def.domain,
        label: pick(def.label, locale),
        title: pick(def.title ?? def.label, locale),
        what: pick(def.what, locale),
        did,
        status,
        built: claims.some((claim) => claim.mode === "built"),
        studied: claims.some((claim) => claim.mode === "studied"),
        claims,
        sources,
        order,
      },
    ];
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const links: KLink[] = relationships.flatMap((def): KLink[] => {
    const item = evidenceOf(def.source);
    if (!item || !byId.has(def.from) || !byId.has(def.to)) return [];
    return [{ key: linkKey(def.from, def.to), source: def.from, target: def.to, relation: def.relation, evidence: item, quote: def.quote }];
  });

  const neighbors = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  const linksOf = new Map<string, KLink[]>(nodes.map((node) => [node.id, []]));
  for (const link of links) {
    neighbors.get(link.source)!.push(link.target);
    neighbors.get(link.target)!.push(link.source);
    linksOf.get(link.source)!.push(link);
    linksOf.get(link.target)!.push(link);
  }

  const evidenceNodes = new Map<string, string[]>();
  const cite = (evidenceId: string, nodeId: string) => {
    const list = evidenceNodes.get(evidenceId) ?? [];
    if (!list.includes(nodeId)) list.push(nodeId);
    evidenceNodes.set(evidenceId, list);
  };
  for (const node of nodes) for (const claim of node.claims) cite(claim.evidence.id, node.id);
  for (const link of links) {
    cite(link.evidence.id, link.source);
    cite(link.evidence.id, link.target);
  }
  for (const [id, list] of Array.from(evidenceNodes.entries())) evidenceNodes.set(id, list.sort((a, b) => byId.get(a)!.order - byId.get(b)!.order));

  const domains: KDomain[] = DOMAINS.map((def, order) => {
    const members = nodes.filter((node) => node.domain === def.id).map((node) => node.id);
    return {
      id: def.id,
      key: domainKey(def.id),
      label: pick(def.label, locale),
      title: pick(def.title, locale),
      summary: pick(def.summary, locale),
      order,
      members,
      evidenced: members.filter((id) => byId.get(id)!.status === "evidenced").length,
    };
  }).filter((domain) => domain.members.length > 0);

  const kinds: Record<NodeKind, number> = { tech: 0, concept: 0, method: 0 };
  for (const node of nodes) if (node.status === "evidenced") kinds[node.kind] += 1;

  return {
    domains,
    domainById: new Map(domains.map((domain) => [domain.id, domain])),
    nodes,
    byId,
    links,
    neighbors,
    linksOf,
    evidence,
    evidenceNodes,
    counts: {
      domains: domains.length,
      evidenced: nodes.filter((node) => node.status === "evidenced").length,
      interest: nodes.filter((node) => node.status === "interest").length,
      listed: nodes.filter((node) => node.status === "listed").length,
      built: nodes.filter((node) => node.built).length,
      studied: nodes.filter((node) => node.studied).length,
      links: links.length,
      kinds,
    },
  };
}

/* ── 고른 대상 ─────────────────────────────── */

export type FocusKind = "node" | "domain" | "evidence";

/** 노드 · 분야(domain:<id>) · 근거(project:<slug> 등) 가운데 무엇인지 — 모르는 id 는 null */
export function focusKind(graph: KnowledgeGraph, id: string | null | undefined): FocusKind | null {
  if (!id) return null;
  if (graph.byId.has(id)) return "node";
  if (id.startsWith(DOMAIN_PREFIX) && graph.domainById.has(id.slice(DOMAIN_PREFIX.length) as DomainId)) return "domain";
  if (graph.evidenceNodes.has(id)) return "evidence";
  return null;
}

export function domainOfKey(graph: KnowledgeGraph, id: string): KDomain | null {
  return id.startsWith(DOMAIN_PREFIX) ? (graph.domainById.get(id.slice(DOMAIN_PREFIX.length) as DomainId) ?? null) : null;
}

/* ── 이웃 깊이 (Obsidian 의 로컬 그래프 깊이처럼 몇 걸음까지 볼지) ── */

export const DEPTH_OPTIONS = [1, 2, 3] as const;
export type GraphDepth = (typeof DEPTH_OPTIONS)[number];

export interface Neighborhood {
  kind: FocusKind;
  /** 고른 대상에서 몇 걸음인지 (고른 노드는 0, 분야·근거를 고르면 그 묶음이 1) */
  hops: Map<string, number>;
  /** 이웃 안의 연결 → 먼 쪽 끝의 걸음 수 (1 이면 고른 대상에 바로 붙은 연결) */
  links: Map<string, number>;
  /** 분야를 고른 경우 그 분야 */
  domain?: DomainId;
}

function grow(graph: KnowledgeGraph, hops: Map<string, number>, start: string[], from: number, depth: number) {
  let frontier = start;
  for (let hop = from + 1; hop <= depth && frontier.length; hop += 1) {
    const next: string[] = [];
    for (const current of frontier) {
      for (const other of graph.neighbors.get(current) ?? []) {
        if (hops.has(other)) continue;
        hops.set(other, hop);
        next.push(other);
      }
    }
    frontier = next;
  }
}

export function neighborhood(graph: KnowledgeGraph, id: string | null, depth: number): Neighborhood | null {
  const kind = focusKind(graph, id);
  if (!kind || !id) return null;
  const hops = new Map<string, number>();
  let domain: DomainId | undefined;
  if (kind === "node") {
    hops.set(id, 0);
    grow(graph, hops, [id], 0, depth);
  } else {
    const members = kind === "domain" ? domainOfKey(graph, id)!.members : (graph.evidenceNodes.get(id) ?? []);
    if (kind === "domain") domain = domainOfKey(graph, id)!.id;
    for (const member of members) hops.set(member, 1);
    grow(graph, hops, members, 1, depth);
  }
  const links = new Map<string, number>();
  for (const link of graph.links) {
    const a = hops.get(link.source);
    const b = hops.get(link.target);
    if (a === undefined || b === undefined) continue;
    // 같은 걸음끼리의 연결은 묶음 안(분야·근거)일 때만 밝힙니다.
    if (a === b && !(kind !== "node" && a === 1)) continue;
    links.set(link.key, Math.max(a, b));
  }
  return { kind, hops, links, domain };
}

/** 두 걸음 떨어진 노드마다 그 사이를 잇는 노드 (예: 같은 기술을 쓴 두 방법 → 그 기술) */
export function sharedVia(graph: KnowledgeGraph, focusId: string, otherId: string): string[] {
  const near = new Set(graph.neighbors.get(focusId) ?? []);
  return (graph.neighbors.get(otherId) ?? []).filter((id) => near.has(id));
}

/** 분야 사이 연결 수 (방향 없음, 분야 순서 쌍) */
export function domainLinkCounts(graph: KnowledgeGraph): Map<string, number> {
  const counts = new Map<string, number>();
  for (const link of graph.links) {
    const a = graph.byId.get(link.source)!.domain;
    const b = graph.byId.get(link.target)!.domain;
    if (a === b) continue;
    const key = [a, b].sort().join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** 원본 순서로 정렬한 노드 */
export function nodesInOrder(graph: KnowledgeGraph, ids: Iterable<string>): KNode[] {
  return Array.from(new Set(ids))
    .flatMap((id) => {
      const node = graph.byId.get(id);
      return node ? [node] : [];
    })
    .sort((a, b) => a.order - b.order);
}
