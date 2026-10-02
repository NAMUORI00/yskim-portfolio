import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { localizePortfolioContent } from "@/lib/i18nContent";
import { SHORT_LABELS } from "@/components/knowledgeMap/knowledgeMapModel";
import { EDGES, NODES } from "./knowledgeData";
import { buildKnowledgeGraph, domainKey, domainLinkCounts, EVIDENCE_SHORT, focusKind, neighborhood, sharedVia } from "./graph3dModel";

const english = localizePortfolioContent(portfolioContent, englishTranslations, "en");
const ko = buildKnowledgeGraph(portfolioContent, portfolioContent, "ko");
const en = buildKnowledgeGraph(portfolioContent, english, "en");

describe("buildKnowledgeGraph", () => {
  it("keeps every curated node and edge, identical in both languages", () => {
    expect(ko.nodes.map((node) => node.id)).toEqual(NODES.map((node) => node.id));
    expect(ko.links).toHaveLength(EDGES.length);
    expect(en.nodes.map((node) => node.id)).toEqual(ko.nodes.map((node) => node.id));
    expect(en.links.map((link) => `${link.key}:${link.relation}`)).toEqual(ko.links.map((link) => `${link.key}:${link.relation}`));
    expect(en.byId.get("channel-control")!.title).toBe("Query-adaptive retrieval channel control");
    expect(ko.byId.get("channel-control")!.title).toBe("질의 적응형 검색 채널 제어");
  });

  it("counts real knowledge separately from interest-only and stack-only items (the numbers the preview notes cite)", () => {
    expect(ko.counts).toMatchObject({ domains: 8, evidenced: 84, built: 80, studied: 16, interest: 5, listed: 9, links: 101 });
    expect(EDGES).toHaveLength(101);
    const relations = ko.links.reduce<Record<string, number>>((acc, link) => ({ ...acc, [link.relation]: (acc[link.relation] ?? 0) + 1 }), {});
    expect(relations).toEqual({ uses: 49, implements: 8, applies: 9, supports: 22, prerequisite: 13 });
    // 분야 사이 연결 32개가 14쌍의 분야를 잇습니다 (예: 영상·음원 ↔ AI·ML 11개).
    const cross = domainLinkCounts(ko);
    expect(Array.from(cross.values()).reduce((sum, value) => sum + value, 0)).toBe(32);
    expect(cross.size).toBe(14);
    expect(cross.get("media|ml")).toBe(11);
    // 근거 출처 35곳: 프로젝트 17 · 연구 글 6 · 논문 3 · 경력 4 · 코드로 확인한 흐름 2 · 화면 기록 1 · 이 사이트 1 · 기술 스택 목록 1
    expect(ko.evidence.size).toBe(35);
    expect(ko.domains.map((domain) => [domain.id, domain.evidenced, domain.members.length])).toEqual([
      ["ml", 12, 15],
      ["retrieval", 11, 14],
      ["media", 12, 12],
      ["backend", 10, 10],
      ["frontend", 13, 14],
      ["data", 5, 7],
      ["device", 9, 10],
      ["infra", 12, 16],
    ]);
    expect(ko.counts.kinds).toEqual({ tech: 41, concept: 23, method: 20 });
    for (const domain of ko.domains) expect(domain.evidenced, domain.id).toBeGreaterThanOrEqual(3);
    expect(ko.domains.reduce((sum, domain) => sum + domain.members.length, 0)).toBe(ko.nodes.length);
    // 성격은 근거에서만 나옵니다: 구현 근거, 연구·실험 근거, 둘 다
    expect(ko.byId.get("spring-boot")).toMatchObject({ status: "evidenced", built: true, studied: false });
    expect(ko.byId.get("evidence-tracing")).toMatchObject({ status: "evidenced", built: false, studied: true });
    expect(ko.byId.get("channel-control")).toMatchObject({ built: true, studied: true });
    expect(ko.byId.get("rag-eval")).toMatchObject({ status: "interest", built: false, studied: false });
    expect(ko.byId.get("docker")).toMatchObject({ status: "listed", built: false, studied: false });
    expect(ko.byId.get("docker")!.did).toContain("작업 기록은 아직 없습니다");
    expect(en.byId.get("rag-eval")!.did).toContain("no work on it is documented");
  });

  it("names evidence the way a visitor reads it — titles, status and links inside this site, never file paths", () => {
    const evidence = Array.from(ko.evidence.values());
    for (const item of [...evidence, ...Array.from(en.evidence.values())]) {
      expect(`${item.title} ${item.status} ${item.href ?? ""}`, item.id).not.toMatch(/content\/|\.mdx|\.json|\.ts\b|client\/src|README/);
      expect(item.title.trim().length, item.id).toBeGreaterThan(0);
    }
    expect(ko.evidence.get("project:mv-evirag")).toMatchObject({ title: "다중 시점 감시 영상의 질의응답과 선택적 응답", status: "IEEE Access 심사 중 · 2026.08 투고 · 제1저자", href: "/projects/mv-evirag" });
    expect(ko.evidence.get("paper:ieee")!.status).toContain("IEEE Access · 심사 중 · 제1저자");
    expect(en.evidence.get("paper:ieee")!.status).toContain("IEEE Access · Under review · First author");
    expect(ko.evidence.get("paper:kci")!.status).toContain("한국정보기술학회논문지 · KCI 게재 · 제1저자");
    expect(ko.evidence.get("paper:kiit")!.status).toContain("발표");
    expect(ko.evidence.get("project:smartfarm-rag")!.status).toBe("관련 KCI 논문 1편 게재");
    expect(ko.evidence.get("record:smartfarm")!.status).toContain("실제 농장 아님");
    expect(ko.evidence.get("project:music-source-separation")!.status).toBe("Hydra 설정 기반 음원 분리 모델 학습 실험 관리");
    expect(en.evidence.get("research:rag")).toMatchObject({ title: "Question-adaptive Retrieval and Grounded Answers", href: "/research/rag" });
    expect(en.evidence.get("work:kakao")!.title).toBe("AI Development Intern · Kakao · Kakao Track field placement");
  });

  it("gives evidence the same short names as the approved layered map, without changing any status", () => {
    // 공개 홈의 층위형 지도와 같은 짧은 이름 (미리보기가 공개 번들 모듈을 불러오지 않도록 값을 복사해 둠)
    for (const [id, short] of Object.entries(EVIDENCE_SHORT)) expect(short, id).toEqual(SHORT_LABELS[id]);
    for (const id of Object.keys(SHORT_LABELS).filter((key) => key.startsWith("project:") || key.startsWith("research:"))) expect(EVIDENCE_SHORT[id], id).toBeDefined();
    for (const item of [...Array.from(ko.evidence.values()), ...Array.from(en.evidence.values())]) {
      expect(item.short.trim().length, item.id).toBeGreaterThan(0);
      expect(item.short, item.id).not.toMatch(/게재|accepted|published/i);
    }
    expect(ko.evidence.get("paper:ieee")!.short).toContain("Role");
    expect(en.evidence.get("paper:ieee")!.short).toContain("Role");
    expect(ko.evidence.get("project:smartfarm-rag")!.short).toBe("스마트팜 RAG");
  });

  it("maps every project in the home list to the knowledge it supports", () => {
    for (const project of portfolioContent.projects) {
      const id = `project:${project.slug}`;
      expect(focusKind(ko, id), id).toBe("evidence");
      expect(ko.evidenceNodes.get(id)!.length, id).toBeGreaterThan(0);
    }
    expect(ko.evidenceNodes.get("project:music-splitter-web")).toEqual(
      expect.arrayContaining(["python", "spleeter", "source-separation", "fastapi", "spring-boot", "spring-security", "java", "api-integration", "upload-pipeline", "auth"]),
    );
    expect(ko.evidenceNodes.get("project:music-splitter-web")).not.toContain("arduino");
  });
});

describe("neighborhood (local graph depth)", () => {
  it("grows one hop at a time from a node and keeps only links between consecutive hops", () => {
    const one = neighborhood(ko,"lora", 1)!;
    expect(Array.from(one.hops.keys()).sort()).toEqual(["abstention", "lora", "training"]);
    const two = neighborhood(ko,"lora", 2)!;
    expect(two.hops.get("python")).toBe(2);
    expect(two.hops.get("mv-video-qa")).toBe(2);
    for (const [key, hop] of Array.from(two.links.entries())) {
      const [a, b] = key.split(">");
      expect(Math.abs(two.hops.get(a)! - two.hops.get(b)!)).toBe(1);
      expect(hop).toBe(Math.max(two.hops.get(a)!, two.hops.get(b)!));
    }
    const three = neighborhood(ko,"lora", 3)!;
    expect(three.hops.size).toBeGreaterThan(two.hops.size);
    for (const [id, hop] of Array.from(two.hops.entries())) expect(three.hops.get(id)).toBe(hop);
  });

  it("selects a whole field or the knowledge behind one project, and ignores unknown ids", () => {
    const field = neighborhood(ko,domainKey("retrieval"), 2)!;
    expect(field.kind).toBe("domain");
    for (const id of ko.domainById.get("retrieval")!.members) expect(field.hops.get(id)).toBe(1);
    expect(field.hops.get("python")).toBe(2);
    expect(field.links.get("hybrid>rag")).toBe(1);
    const project = neighborhood(ko,"project:aerospace-rag", 1)!;
    expect(project.kind).toBe("evidence");
    expect(Array.from(project.hops.keys()).sort()).toEqual(
      ["grounded-answer", "hybrid", "lexical", "ollama", "qdrant", "rag", "semantic", "graph-retrieval"].sort(),
    );
    expect(neighborhood(ko,null, 2)).toBeNull();
    expect(neighborhood(ko,"project:missing", 2)).toBeNull();
    expect(neighborhood(ko,"domain:unknown", 2)).toBeNull();
  });

  it("names what two-step neighbours share", () => {
    expect(sharedVia(ko, "channel-control", "lexical")).toEqual(["hybrid"]);
    expect(sharedVia(ko, "preprocessing", "training").sort()).toEqual(["python"]);
  });
});
