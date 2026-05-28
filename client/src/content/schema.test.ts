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
        contacts: [{ id: "github", label: "github.com/NAMUORI00", href: "https://github.com/NAMUORI00", type: "github" }],
      },
      education: [
        {
          type: "education",
          degree: "CS / AI 석사 과정",
          school: "진학 준비 중",
          period: "2025 — 예정",
          startDate: "2025-03",
          endDate: "2027-02",
          note: "LLM 시스템 연구 지향",
          current: true,
          status: "published",
          highlight: true,
          bullets: ["RAG 아키텍처 연구", "경량 추론 실험"],
          links: [{ label: "CV", href: "https://namuori.net/cv" }],
          relatedProjects: ["aerospace-rag"],
          relatedSkills: ["Python", "RAG"],
        },
      ],
      research: [
        {
          slug: "rag",
          title: "Retrieval-Augmented Generation (RAG)",
          desc: "하이브리드 검색과 도메인 특화 문서 인덱싱",
          status: "published",
          coverImage: "/uploads/research/rag.webp",
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
          category: "career",
          focus: "research",
          proofLevel: "core",
          metrics: [{ label: "MRR", value: "+31%", baseline: "Dense-only", note: "80개 질의" }],
          evaluation: { baseline: "Dense-only retrieval", dataset: "항공우주 질의 80개", method: "same corpus / top-k" },
          tags: ["Python", "RAG"],
          link: "https://github.com/NAMUORI00/aerospace-rag",
          highlight: true,
          private: false,
          status: "published",
          coverImage: "/uploads/projects/aerospace-rag.webp",
          body: "## aerospace-rag\n\n문서 검색 파이프라인입니다.",
          relatedNotes: ["rag-evaluation"],
        },
      ],
      skills: [{ label: "핵심 언어", items: ["Python", "TypeScript"] }],
      starred: [
        {
          name: "typst/typst",
          href: "https://github.com/typst/typst",
          stars: "53.4k",
          desc: "마크업 기반 조판 시스템",
        },
      ],
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
    expect(result.projects[0].category).toBe("career");
    expect(result.projects[0].focus).toBe("research");
    expect(result.projects[0].proofLevel).toBe("core");
    expect(result.projects[0].metrics[0]).toMatchObject({ label: "MRR", value: "+31%" });
    expect(result.projects[0].evaluation.dataset).toBe("항공우주 질의 80개");
    expect(result.projects[0].coverImage).toBe("/uploads/projects/aerospace-rag.webp");
    expect(result.research[0].coverImage).toBe("/uploads/research/rag.webp");
    expect(result.notes[0].relatedProjects).toEqual(["aerospace-rag"]);
    expect(result.profile.avatarUrl).toBeUndefined();
    expect(result.education[0].type).toBe("education");
    expect(result.education[0].bullets).toEqual(["RAG 아키텍처 연구", "경량 추론 실험"]);
    expect(result.education[0].links[0]).toEqual({ label: "CV", href: "https://namuori.net/cv" });
    expect(result.starred[0]).toMatchObject({ href: "https://github.com/typst/typst" });
  });

  it("normalizes older education entries into timeline entries", () => {
    const result = validatePortfolioContent({
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
      education: [{ degree: "학사", school: "학교", period: "2017 — 2024", note: "", current: false }],
      research: [],
      projects: [],
      skills: [],
      starred: [],
      notes: [],
    });

    expect(result.education[0]).toMatchObject({
      type: "education",
      status: "published",
      highlight: true,
      bullets: [],
      links: [],
      relatedProjects: [],
      relatedSkills: [],
    });
  });

  it("normalizes older project entries into C-3-lite project evidence fields", () => {
    const result = validatePortfolioContent({
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
          slug: "legacy-rag",
          name: "legacy-rag",
          period: "2026",
          desc: "RAG",
          metric: "MRR +31%",
          tags: ["RAG"],
          link: "",
          highlight: true,
          private: false,
          status: "published",
          body: "",
          relatedNotes: [],
        },
      ],
      skills: [],
      starred: [],
      notes: [],
    });

    expect(result.projects[0]).toMatchObject({
      category: "career",
      focus: "research",
      proofLevel: "core",
      metrics: [],
      evaluation: {},
    });
  });

  it("accepts an editable profile avatar URL", () => {
    const result = validatePortfolioContent({
      site: {
        title: "김유석 | AI 연구 엔지니어 포트폴리오",
        description: "LLM 시스템과 RAG 아키텍처를 다루는 포트폴리오",
        url: "https://namuori.net",
        navigation: [{ id: "about", label: "소개", icon: "user" }],
        images: { heroTree: "x", ragDiagram: "x", dotPattern: "x" },
      },
      profile: {
        name: "김유석",
        romanizedName: "KIM YUSEOK",
        handle: "NAMUORI00",
        status: "구직 중",
        avatarUrl: "https://github.com/NAMUORI00.png",
        headline: "AI 연구 · 엔지니어 지망",
        summaryLead: "효율적이고 확장 가능한 시스템을 구축하는 소프트웨어 엔지니어입니다.",
        summary: [],
        contacts: [],
      },
      education: [],
      research: [],
      projects: [],
      skills: [],
      starred: [],
      notes: [],
    });

    expect(result.profile.avatarUrl).toBe("https://github.com/NAMUORI00.png");
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
