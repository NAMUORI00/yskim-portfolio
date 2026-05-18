import { describe, expect, it } from "vitest";
import type { PortfolioContent } from "@/content";
import { buildKnowledgeGraph } from "./knowledgeGraph";

const content: PortfolioContent = {
  site: {
    title: "김유석 | AI 연구 엔지니어 포트폴리오",
    description: "LLM 시스템과 RAG 아키텍처",
    url: "https://namuori.net",
    navigation: [],
    images: { heroTree: "x", ragDiagram: "x", dotPattern: "x" },
  },
  profile: {
    name: "김유석",
    romanizedName: "KIM YUSEOK",
    handle: "NAMUORI00",
    status: "구직 중",
    headline: "RAG와 LLM 시스템을 다루는 엔지니어",
    summaryLead: "검색 품질과 자동화 워크플로우를 연구합니다.",
    summary: ["Python, TypeScript, Cloudflare 기반 포트폴리오를 운영합니다."],
    contacts: [],
  },
  education: [],
  research: [
    {
      slug: "rag",
      title: "Retrieval-Augmented Generation",
      desc: "하이브리드 검색과 도메인 특화 문서 인덱싱",
      status: "published",
      showDiagram: true,
      body: "Dense retrieval, sparse retrieval, reranking, RAG evaluation",
      relatedNotes: ["rag-evaluation"],
    },
  ],
  projects: [
    {
      slug: "aerospace-rag",
      name: "aerospace-rag",
      period: "2026.05",
      desc: "항공우주 업무 문서 RAG 시스템",
      metric: "MRR +31%",
      tags: ["Python", "Qdrant", "RAG"],
      link: "https://github.com/NAMUORI00/aerospace-rag",
      highlight: true,
      private: false,
      status: "published",
      body: "Qdrant vector search and graph retrieval pipeline",
      relatedNotes: ["rag-evaluation"],
    },
    {
      slug: "draft-project",
      name: "draft project",
      period: "2026.05",
      desc: "초안",
      metric: "초안",
      tags: ["Invisible"],
      link: "",
      highlight: false,
      private: false,
      status: "draft",
      body: "Invisible draft content",
      relatedNotes: [],
    },
  ],
  skills: [
    { label: "핵심 언어", items: ["Python", "TypeScript"] },
    { label: "인프라", items: ["Cloudflare"] },
  ],
  starred: [{ name: "typst/typst", stars: "53.4k", desc: "마크업 기반 조판 시스템" }],
  notes: [
    {
      slug: "rag-evaluation",
      title: "RAG 평가 노트",
      status: "published",
      date: "2026-05-18",
      summary: "검색 품질 평가 기준",
      tags: ["RAG", "Evaluation"],
      relatedProjects: ["aerospace-rag"],
      relatedResearch: ["rag"],
      body: "Recall@5, MRR, answer faithfulness evaluation",
    },
  ],
};

describe("buildKnowledgeGraph", () => {
  it("builds content, skill, and term nodes from published portfolio content", () => {
    const graph = buildKnowledgeGraph(content);
    const ids = graph.nodes.map((node) => node.id);

    expect(ids).toContain("profile");
    expect(ids).toContain("project:aerospace-rag");
    expect(ids).toContain("research:rag");
    expect(ids).toContain("note:rag-evaluation");
    expect(ids).toContain("skill:python");
    expect(ids).toContain("term:rag");
    expect(ids).not.toContain("project:draft-project");
    expect(ids).not.toContain("term:시스템");
  });

  it("creates explicit relationship links and weighted natural-language term links", () => {
    const graph = buildKnowledgeGraph(content);

    expect(graph.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "project:aerospace-rag", target: "note:rag-evaluation", kind: "related" }),
        expect.objectContaining({ source: "research:rag", target: "note:rag-evaluation", kind: "related" }),
        expect.objectContaining({ source: "project:aerospace-rag", target: "term:rag", kind: "term" }),
      ]),
    );
    expect(graph.nodes.find((node) => node.id === "term:rag")?.weight).toBeGreaterThan(1);
  });

  it("keeps the graph compact enough for a fixed right rail", () => {
    const graph = buildKnowledgeGraph(content, { maxTerms: 8, maxLinks: 24 });

    expect(graph.nodes.length).toBeLessThanOrEqual(1 + 1 + 1 + 1 + 3 + 1 + 8 + 1);
    expect(graph.links.length).toBeLessThanOrEqual(24);
  });
});
