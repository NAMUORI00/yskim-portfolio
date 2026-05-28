import { describe, expect, it } from "vitest";
import type { EducationEntry, NoteEntry, PortfolioContent, ProfileContent, ProjectEntry, ResearchEntry, SkillGroup, StarredRepo } from "@/content";
import {
  applyTranslationValues,
  buildTranslationEntries,
  getTranslationValue,
  sourceHash,
  translationStats,
  type TranslationSource,
} from "./adminTranslation";
import { createEnglishTranslations } from "./i18nContent";

const profile: ProfileContent = {
  name: "김유석",
  romanizedName: "KIM YUSEOK",
  handle: "NAMUORI00",
  status: "구직 중",
  headline: "AI 연구자",
  summaryLead: "리드",
  summary: ["첫 문단"],
  contacts: [{ id: "blog", type: "external", label: "블로그", href: "https://blog.namuori.net" }],
};

const site: PortfolioContent["site"] = {
  title: "김유석 | AI 연구 엔지니어 포트폴리오",
  description: "CS/AI 석사 진학 중",
  url: "https://namuori.net",
  navigation: [
    { id: "about", label: "소개", icon: "user" },
    { id: "projects", label: "프로젝트", icon: "code" },
  ],
  images: { heroTree: "tree", ragDiagram: "rag", dotPattern: "dot" },
};

const project: ProjectEntry = {
  slug: "portfolio",
  name: "포트폴리오",
  period: "2026",
  desc: "설명",
  metric: "성과",
  category: "career",
  focus: "tool",
  proofLevel: "core",
  metrics: [{ label: "MRR", value: "+31%", baseline: "Dense-only", note: "80개 질의" }],
  evaluation: { baseline: "Dense-only", dataset: "도메인 질의 80개", method: "same corpus" },
  tags: ["React", "Cloudflare"],
  link: "",
  highlight: true,
  private: false,
  status: "published",
  relatedNotes: [],
  body: "본문",
};

const research: ResearchEntry = {
  slug: "rag",
  title: "검색 증강 생성",
  desc: "검색 설명",
  status: "published",
  showDiagram: true,
  relatedNotes: [],
  body: "연구 본문",
};

const note: NoteEntry = {
  slug: "note",
  title: "노트",
  status: "published",
  date: "2026-05-20",
  summary: "요약",
  tags: ["RAG"],
  relatedProjects: [],
  relatedResearch: [],
  body: "노트 본문",
};

const education: EducationEntry[] = [
  {
    type: "education",
    degree: "석사 과정",
    school: "한국대학",
    period: "2025 - 현재",
    startDate: "2025-03",
    endDate: "",
    note: "AI 연구실",
    current: true,
    status: "published",
    highlight: true,
    bullets: ["RAG 아키텍처 연구"],
    links: [{ label: "CV", href: "https://namuori.net/cv" }],
    relatedProjects: ["aerospace-rag"],
    relatedSkills: ["RAG"],
  },
];

const skills: SkillGroup[] = [
  { label: "핵심 언어", items: ["Python", "TypeScript"] },
];

const starred: StarredRepo[] = [
  {
    name: "ggerganov/llama.cpp",
    href: "https://github.com/ggerganov/llama.cpp",
    stars: "82k",
    desc: "LLM inference in C/C++",
  },
];

describe("admin translation helpers", () => {
  it("builds translation entries for editable content", () => {
    expect(buildTranslationEntries({ kind: "profile", value: profile }).map((entry) => entry.key)).toEqual([
      "profile.name",
      "profile.status",
      "profile.headline",
      "profile.summaryLead",
      "profile.summary.0",
      "profile.contacts.blog.label",
    ]);

    expect(buildTranslationEntries({ kind: "site", value: site } as any).map((entry) => entry.key)).toEqual([
      "site.title",
      "site.description",
      "site.navigation.about.label",
      "site.navigation.projects.label",
    ]);

    expect(buildTranslationEntries({ kind: "project", value: project }).map((entry) => entry.key)).toEqual(expect.arrayContaining([
      "projects.portfolio.body",
      "projects.portfolio.metrics.0.label",
      "projects.portfolio.metrics.0.value",
      "projects.portfolio.metrics.0.baseline",
      "projects.portfolio.metrics.0.note",
      "projects.portfolio.evaluation.baseline",
      "projects.portfolio.evaluation.dataset",
      "projects.portfolio.evaluation.method",
    ]));
    expect(buildTranslationEntries({ kind: "research", value: research }).map((entry) => entry.key)).toContain("research.rag.title");
    expect(buildTranslationEntries({ kind: "note", value: note }).map((entry) => entry.key)).toContain("notes.note.date");
    expect(buildTranslationEntries({ kind: "education", value: education }).map((entry) => entry.key)).toEqual([
      "education.0.degree",
      "education.0.school",
      "education.0.period",
      "education.0.note",
      "education.0.bullets.0",
      "education.0.links.0.label",
    ]);
    expect(buildTranslationEntries({ kind: "skills", value: skills }).map((entry) => entry.key)).toEqual([
      "skills.%ED%95%B5%EC%8B%AC%20%EC%96%B8%EC%96%B4.label",
      "skills.%ED%95%B5%EC%8B%AC%20%EC%96%B8%EC%96%B4.items.0",
      "skills.%ED%95%B5%EC%8B%AC%20%EC%96%B8%EC%96%B4.items.1",
    ]);
    expect(buildTranslationEntries({ kind: "starred", value: starred }).map((entry) => entry.key)).toEqual([
      "starred.ggerganov%2Fllama%2Ecpp.desc",
    ]);
  });

  it("applies translated values and records source hashes", () => {
    const entries = buildTranslationEntries({ kind: "project", value: project });
    const translated = applyTranslationValues(createEnglishTranslations(), entries, {
      "projects.portfolio.name": "Portfolio",
      "projects.portfolio.tags.1": "Cloudflare",
      "projects.portfolio.metrics.0.baseline": "Dense-only",
      "projects.portfolio.evaluation.dataset": "80 domain queries",
      "projects.portfolio.body": "Body",
    });

    expect(getTranslationValue(translated, "projects.portfolio.name")).toBe("Portfolio");
    expect(getTranslationValue(translated, "projects.portfolio.tags.1")).toBe("Cloudflare");
    expect(getTranslationValue(translated, "projects.portfolio.metrics.0.baseline")).toBe("Dense-only");
    expect(getTranslationValue(translated, "projects.portfolio.evaluation.dataset")).toBe("80 domain queries");
    expect(translated.sourceHashes?.["projects.portfolio.body"]).toBe(sourceHash("본문"));
  });

  it("allows manual translations to be cleared", () => {
    const entries = buildTranslationEntries({ kind: "project", value: project });
    const translated = applyTranslationValues(createEnglishTranslations(), entries, {
      "projects.portfolio.name": "Portfolio",
    });
    const cleared = applyTranslationValues(translated, entries, {
      "projects.portfolio.name": "",
    });

    expect(getTranslationValue(cleared, "projects.portfolio.name")).toBe("");
    expect(cleared.sourceHashes?.["projects.portfolio.name"]).toBeUndefined();
  });

  it("applies translations for education, skills, and starred repositories", () => {
    const entries = [
      ...buildTranslationEntries({ kind: "education", value: education }),
      ...buildTranslationEntries({ kind: "skills", value: skills }),
      ...buildTranslationEntries({ kind: "starred", value: starred }),
    ];
    const translated = applyTranslationValues(createEnglishTranslations(), entries, {
      "education.0.degree": "M.S. candidate",
      "education.0.bullets.0": "RAG architecture research",
      "education.0.links.0.label": "CV",
      "skills.%ED%95%B5%EC%8B%AC%20%EC%96%B8%EC%96%B4.label": "Core languages",
      "skills.%ED%95%B5%EC%8B%AC%20%EC%96%B8%EC%96%B4.items.0": "Python",
      "starred.ggerganov%2Fllama%2Ecpp.desc": "LLM inference in C/C++",
    });

    expect(getTranslationValue(translated, "education.0.degree")).toBe("M.S. candidate");
    expect(getTranslationValue(translated, "education.0.bullets.0")).toBe("RAG architecture research");
    expect(getTranslationValue(translated, "education.0.links.0.label")).toBe("CV");
    expect(getTranslationValue(translated, "skills.%ED%95%B5%EC%8B%AC%20%EC%96%B8%EC%96%B4.label")).toBe("Core languages");
    expect(getTranslationValue(translated, "skills.%ED%95%B5%EC%8B%AC%20%EC%96%B8%EC%96%B4.items.0")).toBe("Python");
    expect(getTranslationValue(translated, "starred.ggerganov%2Fllama%2Ecpp.desc")).toBe("LLM inference in C/C++");
  });

  it("applies translations for site, profile names, contact labels, and note dates", () => {
    const entries = [
      ...buildTranslationEntries({ kind: "site", value: site } as any),
      ...buildTranslationEntries({ kind: "profile", value: profile }),
      ...buildTranslationEntries({ kind: "note", value: note }),
    ];
    const translated = applyTranslationValues(createEnglishTranslations(), entries, {
      "site.title": "Kim Yuseok | AI Research Engineer Portfolio",
      "site.navigation.about.label": "About",
      "profile.name": "Kim Yuseok",
      "profile.contacts.blog.label": "Blog",
      "notes.note.date": "May 20, 2026",
    });

    expect(getTranslationValue(translated, "site.title")).toBe("Kim Yuseok | AI Research Engineer Portfolio");
    expect(getTranslationValue(translated, "site.navigation.about.label")).toBe("About");
    expect(getTranslationValue(translated, "profile.name")).toBe("Kim Yuseok");
    expect(getTranslationValue(translated, "profile.contacts.blog.label")).toBe("Blog");
    expect(getTranslationValue(translated, "notes.note.date")).toBe("May 20, 2026");
  });

  it("reports stale translations when Korean source changes", () => {
    const source: TranslationSource = { kind: "profile", value: profile };
    const translated = applyTranslationValues(createEnglishTranslations(), buildTranslationEntries(source), {
      "profile.headline": "AI Researcher",
    });
    const changed = { ...profile, headline: "LLM 연구자" };

    expect(translationStats(translated, source)).toEqual({ total: 6, translated: 1, stale: 0 });
    expect(translationStats(translated, { kind: "profile", value: changed })).toEqual({ total: 6, translated: 1, stale: 1 });
  });
});
