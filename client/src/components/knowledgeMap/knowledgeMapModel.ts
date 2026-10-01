/*
 * 층위형 지식 지도 — /design/knowledge-graph 미리보기 전용 모델 (공개 홈 "/"에서는 쓰지 않습니다)
 * ─────────────────────────────────────────────────────────────
 * 세 층으로 읽습니다: 연구 질문 → 그 질문을 뒷받침하는 프로젝트 → 프로젝트에서 사용한 기술
 * 원본은 content/ 입니다. 이 파일에는 연결을 고르는 규칙과 지도에 쓰는 짧은 이름(편집 레이어)만 둡니다.
 *  - 연구 → 프로젝트: 연구 본문의 '관련 프로젝트' 링크(/projects/<slug>)와, 연구 설명에 직접 적힌 프로젝트만 잇습니다.
 *  - 프로젝트 → 기술: 프로젝트 태그 가운데 기술 스택(skills.json)에 있는 항목만 잇습니다. 숙련도·점수는 만들지 않습니다.
 *  - 관심 오픈소스(GitHub 스타)는 직접 한 작업의 근거가 아니므로 지도에 넣지 않습니다.
 * 노드 id 는 원본(한국어) 기준이라 언어를 바꿔도 같은 자리에 같은 노드가 남습니다.
 */
import type { PortfolioContent } from "@/content";
import type { Locale } from "@/lib/i18nContent";

export type MapLayer = "research" | "project" | "tech";

export const MAP_LAYERS: readonly MapLayer[] = ["research", "project", "tech"];

export interface MapNode {
  id: string;
  layer: MapLayer;
  /** 연구·프로젝트는 slug, 기술은 원본(한국어) 이름 */
  key: string;
  /** 지도 위에 쓰는 짧은 이름 */
  label: string;
  /** 전체 이름 (현지화) — 설명 칸과 읽기용 이름에 씁니다 */
  title: string;
  /** 같은 층 안의 원본 순서 */
  order: number;
  /** 연구 질문의 배치 칸 (RESEARCH_SLOTS 순서) */
  slot?: number;
  /** 프로젝트 기간 */
  period?: string;
  /** 프로젝트의 한 줄 성과 (content 의 metric 그대로) */
  metric?: string;
  /** 대표 작업 (content 의 highlight) */
  featured?: boolean;
  /** 기술 스택 분야 이름 (현지화) */
  group?: string;
}

/** 위층 → 아래층 연결 (연구 → 프로젝트, 프로젝트 → 기술) */
export interface MapLink {
  source: string;
  target: string;
}

export interface KnowledgeMap {
  nodes: MapNode[];
  links: MapLink[];
  byId: Map<string, MapNode>;
  /** 아래층으로 이어진 노드 id */
  below: Map<string, string[]>;
  /** 위층으로 이어진 노드 id */
  above: Map<string, string[]>;
}

interface Localized {
  ko: string;
  en: string;
}

const t = (ko: string, en: string): Localized => ({ ko, en });

/** 지도에 쓰는 짧은 이름 — 전체 이름은 설명 칸과 읽기용 이름(aria-label)에 그대로 씁니다. 없으면 제목을 줄여 씁니다. */
export const SHORT_LABELS: Record<string, Localized> = {
  "research:rag": t("문서 검색", "Retrieval"),
  "research:video-qa": t("영상 QA", "Video QA"),
  "research:sensor-operations": t("센서 운영", "Sensor ops"),
  "research:edge-llm": t("로컬 AI", "Local AI"),
  "research:audio-voice": t("음원 분리", "Audio"),
  "research:agentic-workflow": t("개발 자동화", "Automation"),
  "project:smartfarm-rag": t("스마트팜 RAG", "SmartFarm RAG"),
  "project:mv-evirag": t("MV-EviRAG", "MV-EviRAG"),
  "project:music-splitter-web": t("음원 분리 웹", "Splitter web"),
  "project:golden-glove": t("음악 장갑", "Music glove"),
  "project:food-scan": t("음식 영양 앱", "Food scan app"),
  "project:tourism-data": t("관광 데이터", "Tourism data"),
  "project:smart-home-2017": t("스마트홈", "Smart home"),
  "project:unity-hackathon": t("Unity 게임", "Unity game"),
  "project:hangul-clock": t("한글시계", "Word clock"),
  "project:js-quiz-app": t("퀴즈 앱", "Quiz app"),
  "project:aerospace-rag": t("항공우주 RAG", "Aerospace RAG"),
  "project:good-price-jeju": t("착한가격업소", "Business finder"),
  "project:cross-review-bridge": t("AI 교차 리뷰", "AI cross-review"),
  "project:music-source-separation": t("분리 모델 학습", "Separation training"),
  "project:mediamtx-installer": t("MediaMTX 설치", "MediaMTX setup"),
  "project:introduce-cv-page": t("PR 블로그", "PR blog"),
  "project:spring-community-board": t("Spring 게시판", "Spring board"),
  "tech:데이터-전처리": t("데이터 전처리", "Data prep"),
  "tech:시각화": t("시각화", "Data viz"),
};

/** 연구 질문의 배치 순서 — 뒷줄 왼쪽부터 채웁니다. 같은 프로젝트를 나누는 질문끼리 위아래로 붙이고, 목록에 없는 분야는 뒤에 이어 붙습니다. */
export const RESEARCH_SLOTS = ["rag", "video-qa", "edge-llm", "sensor-operations", "agentic-workflow", "audio-voice"];

/**
 * 연구 설명에 직접 적힌 프로젝트 — anchor 문구가 원본(한국어) 연구 설명이나 본문에 있을 때만 잇습니다.
 * 설명에서 문구가 사라지면 연결도 함께 빠집니다.
 */
export const MENTIONED_PROJECTS: Record<string, Array<{ slug: string; anchor: string }>> = {
  rag: [{ slug: "aerospace-rag", anchor: "항공우주 문서" }],
  "audio-voice": [{ slug: "music-source-separation", anchor: "음원 분리 학습 실험" }],
  "agentic-workflow": [{ slug: "mediamtx-installer", anchor: "영상 스트리밍 서버 설치 스크립트" }],
};

export function normalizeTech(value: string): string {
  return value.trim().toLowerCase();
}

export function techNodeId(key: string): string {
  return `tech:${key.replace(/\s+/g, "-")}`;
}

/** 본문의 '관련 프로젝트' 링크에서 프로젝트 slug 를 꺼냅니다. */
export function linkedProjectSlugs(body: string): string[] {
  return Array.from(body.matchAll(/\]\(\/projects\/([a-z0-9-]+)\)/g), (match) => match[1]);
}

/** 짧은 이름이 없을 때 — 첫 구절만 남기고, 그래도 길면 줄입니다. */
export function shortLabel(title: string, max = 14): string {
  const head = title.split(/\s*(?:[:(—–]|\s-\s|와\s|과\s|\sand\s|\sfor\s|\swith\s)/)[0]?.trim() || title.trim();
  return head.length > max ? `${head.slice(0, max - 1)}…` : head;
}

function label(id: string, title: string, locale: Locale): string {
  return SHORT_LABELS[id]?.[locale] ?? (id.startsWith("tech:") ? title : shortLabel(title));
}

export function buildKnowledgeMap(source: PortfolioContent, localized: PortfolioContent, locale: Locale): KnowledgeMap {
  const localizedResearch = new Map(localized.research.map((item) => [item.slug, item]));
  const localizedProjects = new Map(localized.projects.map((item) => [item.slug, item]));
  const research = source.research.filter((item) => item.status === "published");
  const projects = source.projects.filter((item) => item.status === "published");
  const projectSlugs = new Set(projects.map((project) => project.slug));

  // 기술 스택의 첫 등장 위치로 현지화된 이름과 분야를 찾습니다 (번역은 같은 위치의 항목입니다).
  const stack = new Map<string, { label: string; group: string; rank: number }>();
  source.skills.forEach((group, groupIndex) => {
    const localizedGroup = localized.skills[groupIndex];
    group.items.forEach((item, itemIndex) => {
      const key = normalizeTech(item);
      if (!key || stack.has(key)) return;
      stack.set(key, {
        label: localizedGroup?.items[itemIndex] ?? item,
        group: localizedGroup?.label ?? group.label,
        rank: groupIndex * 1000 + itemIndex,
      });
    });
  });

  const links: MapLink[] = [];
  const linkKeys = new Set<string>();
  const connect = (from: string, to: string) => {
    const key = `${from}>${to}`;
    if (linkKeys.has(key)) return;
    linkKeys.add(key);
    links.push({ source: from, target: to });
  };

  for (const item of research) {
    const mentioned = (MENTIONED_PROJECTS[item.slug] ?? [])
      .filter((mention) => item.desc.includes(mention.anchor) || item.body.includes(mention.anchor))
      .map((mention) => mention.slug);
    for (const slug of [...linkedProjectSlugs(item.body), ...mentioned]) {
      if (projectSlugs.has(slug)) connect(`research:${item.slug}`, `project:${slug}`);
    }
  }

  const usedTech = new Map<string, string>();
  for (const project of projects) {
    for (const tag of project.tags) {
      const key = normalizeTech(tag);
      if (!stack.has(key)) continue;
      usedTech.set(key, tag.trim());
      connect(`project:${project.slug}`, techNodeId(key));
    }
  }

  const slotOf = (slug: string, order: number) => {
    const curated = RESEARCH_SLOTS.indexOf(slug);
    return curated >= 0 ? curated : RESEARCH_SLOTS.length + order;
  };

  const nodes: MapNode[] = [
    ...research.map((item, order): MapNode => {
      const id = `research:${item.slug}`;
      const title = localizedResearch.get(item.slug)?.title || item.title;
      return { id, layer: "research", key: item.slug, label: label(id, title, locale), title, order, slot: slotOf(item.slug, order) };
    }),
    ...projects.map((item, order): MapNode => {
      const id = `project:${item.slug}`;
      const translated = localizedProjects.get(item.slug) ?? item;
      return {
        id,
        layer: "project",
        key: item.slug,
        label: label(id, translated.name, locale),
        title: translated.name,
        order,
        period: translated.period || undefined,
        metric: translated.metric || undefined,
        featured: item.highlight,
      };
    }),
    ...Array.from(usedTech.entries())
      .sort(([left], [right]) => (stack.get(left)?.rank ?? 0) - (stack.get(right)?.rank ?? 0))
      .map(([key, name], order): MapNode => {
        const id = techNodeId(key);
        const entry = stack.get(key);
        const title = entry?.label ?? name;
        return { id, layer: "tech", key: name, label: label(id, title, locale), title, order, group: entry?.group };
      }),
  ];

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const below = new Map<string, string[]>();
  const above = new Map<string, string[]>();
  for (const link of links) {
    below.set(link.source, [...(below.get(link.source) ?? []), link.target]);
    above.set(link.target, [...(above.get(link.target) ?? []), link.source]);
  }

  return { nodes, links, byId, below, above };
}

/** 노드가 속한 층의 노드 수 */
export function layerCounts(map: KnowledgeMap): Record<MapLayer, number> {
  const counts: Record<MapLayer, number> = { research: 0, project: 0, tech: 0 };
  for (const node of map.nodes) counts[node.layer] += 1;
  return counts;
}

/** 이 기술을 쓴 프로젝트 수 (이 포트폴리오에 실린 프로젝트 기준의 사실, 숙련도가 아님) */
export function projectCount(map: KnowledgeMap, techId: string): number {
  return map.above.get(techId)?.length ?? 0;
}
