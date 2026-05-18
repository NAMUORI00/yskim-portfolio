import { describe, expect, it } from "vitest";
import { validatePortfolioContent } from "./schema";

describe("validatePortfolioContent", () => {
  it("accepts the minimum editable portfolio shape", () => {
    const result = validatePortfolioContent({
      site: {
        title: "김유석 | AI 연구 엔지니어 포트폴리오",
        description: "LLM 시스템과 RAG 아키텍처를 다루는 포트폴리오",
        url: "https://namuori.net",
        navigation: [{ id: "about", label: "소개", icon: "user" }],
        images: {
          heroTree: "https://example.com/tree.webp",
          ragDiagram: "https://example.com/rag.webp",
          dotPattern: "https://example.com/dot.webp",
        },
      },
      profile: {
        name: "김유석",
        romanizedName: "KIM YUSEOK",
        handle: "NAMUORI00",
        status: "구직 중",
        headline: "AI 연구 · 엔지니어 지망",
        summaryLead: "효율적이고 확장 가능한 시스템을 구축하는 소프트웨어 엔지니어입니다.",
        summary: ["Python 기반 AI 실험부터 웹 프론트엔드까지 다룹니다."],
        contacts: [{ label: "github.com/NAMUORI00", href: "https://github.com/NAMUORI00", type: "github" }],
      },
      education: [
        {
          degree: "CS / AI 석사 과정",
          school: "진학 준비 중",
          period: "2025 — 예정",
          note: "LLM 시스템 연구 지향",
          current: true,
        },
      ],
      research: [
        {
          slug: "rag",
          title: "Retrieval-Augmented Generation (RAG)",
          desc: "하이브리드 검색과 도메인 특화 문서 인덱싱",
          status: "published",
          showDiagram: true,
          body: "## RAG\n\n검색과 생성을 연결합니다.",
          relatedNotes: ["rag-evaluation"],
        },
      ],
      projects: [
        {
          slug: "aerospace-rag",
          name: "aerospace-rag",
          period: "2026.05",
          desc: "항공우주 업무 문서를 대상으로 한 RAG 시스템",
          metric: "MRR +31%",
          tags: ["Python", "RAG"],
          link: "https://github.com/NAMUORI00/aerospace-rag",
          highlight: true,
          private: false,
          status: "published",
          body: "## aerospace-rag\n\n문서 검색 파이프라인입니다.",
          relatedNotes: ["rag-evaluation"],
        },
      ],
      skills: [{ label: "핵심 언어", items: ["Python", "TypeScript"] }],
      starred: [{ name: "typst/typst", stars: "53.4k", desc: "마크업 기반 조판 시스템" }],
      notes: [
        {
          slug: "rag-evaluation",
          title: "RAG 평가 노트",
          status: "published",
          date: "2026-05-18",
          summary: "검색 품질 평가 기준",
          tags: ["RAG"],
          relatedProjects: ["aerospace-rag"],
          relatedResearch: ["rag"],
          body: "## 평가\n\nRecall@5를 봅니다.",
        },
      ],
    });

    expect(result.projects[0].slug).toBe("aerospace-rag");
    expect(result.notes[0].relatedProjects).toEqual(["aerospace-rag"]);
  });

  it("rejects duplicate slugs", () => {
    expect(() =>
      validatePortfolioContent({
        site: {
          title: "x",
          description: "x",
          url: "https://example.com",
          navigation: [],
          images: { heroTree: "x", ragDiagram: "x", dotPattern: "x" },
        },
        profile: {
          name: "x",
          romanizedName: "x",
          handle: "x",
          status: "x",
          headline: "x",
          summaryLead: "x",
          summary: [],
          contacts: [],
        },
        education: [],
        research: [],
        projects: [
          {
            slug: "same",
            name: "A",
            period: "now",
            desc: "A",
            metric: "A",
            tags: [],
            link: "",
            highlight: false,
            private: false,
            status: "published",
            body: "",
            relatedNotes: [],
          },
          {
            slug: "same",
            name: "B",
            period: "now",
            desc: "B",
            metric: "B",
            tags: [],
            link: "",
            highlight: false,
            private: false,
            status: "published",
            body: "",
            relatedNotes: [],
          },
        ],
        skills: [],
        starred: [],
        notes: [],
      }),
    ).toThrow(/Duplicate project slug/);
  });
});
