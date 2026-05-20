import { describe, expect, it } from "vitest";
import type { PortfolioContent } from "@/content";
import { localizePortfolioContent, uiText, type EnglishTranslations } from "./i18nContent";

const content: PortfolioContent = {
  site: {
    title: "포트폴리오",
    description: "설명",
    url: "https://namuori.net",
    navigation: [
      { id: "about", label: "소개", icon: "user" },
      { id: "projects", label: "프로젝트", icon: "code" },
    ],
    images: { heroTree: "tree", ragDiagram: "rag", dotPattern: "dot" },
  },
  profile: {
    name: "김유석",
    romanizedName: "KIM YUSEOK",
    handle: "NAMUORI00",
    status: "구직 중",
    headline: "AI 연구자",
    summaryLead: "한국어 리드",
    summary: ["첫 문단", "둘째 문단"],
    contacts: [],
  },
  education: [{ degree: "석사", school: "학교", period: "2026", note: "노트", current: true }],
  research: [{ slug: "rag", title: "검색 증강 생성", desc: "검색 설명", status: "published", showDiagram: true, relatedNotes: [], body: "본문" }],
  projects: [{ slug: "portfolio", name: "포트폴리오", period: "2026", desc: "프로젝트 설명", metric: "성과", tags: ["React"], link: "", highlight: true, private: false, status: "published", relatedNotes: [], body: "프로젝트 본문" }],
  skills: [{ label: "언어", items: ["타입스크립트"] }],
  starred: [{ name: "vitejs/vite", stars: "75k", desc: "설명" }],
  notes: [{ slug: "note", title: "노트", status: "published", date: "2026-05-20", summary: "요약", tags: ["RAG"], relatedProjects: [], relatedResearch: [], body: "노트 본문" }],
};

const en: EnglishTranslations = {
  locale: "en",
  ui: { nav: { about: "About", projects: "Projects" }, labels: { contact: "CONTACT" } },
  profile: { status: "Open to work", headline: "AI Researcher", summaryLead: "English lead", summary: ["First paragraph"] },
  projects: { portfolio: { name: "Portfolio", desc: "Project description", tags: ["React"], body: "Project body" } },
  research: { rag: { title: "Retrieval-Augmented Generation" } },
  notes: { note: { title: "Note", summary: "Summary" } },
  skills: { "언어": { label: "Languages", items: ["TypeScript"] } },
  starred: { "vitejs/vite": { desc: "Frontend tooling" } },
  sourceHashes: {},
};

describe("localized portfolio content", () => {
  it("returns the Korean source unchanged for ko locale", () => {
    expect(localizePortfolioContent(content, en, "ko")).toBe(content);
  });

  it("overlays English translations while preserving missing Korean fallbacks", () => {
    const localized = localizePortfolioContent(content, en, "en");

    expect(localized.site.navigation.map((item) => item.label)).toEqual(["About", "Projects"]);
    expect(localized.profile.status).toBe("Open to work");
    expect(localized.profile.summary).toEqual(["First paragraph", "둘째 문단"]);
    expect(localized.projects[0].name).toBe("Portfolio");
    expect(localized.projects[0].metric).toBe("성과");
    expect(localized.research[0].title).toBe("Retrieval-Augmented Generation");
    expect(localized.skills[0]).toEqual({ label: "Languages", items: ["TypeScript"] });
    expect(localized.starred[0].desc).toBe("Frontend tooling");
  });

  it("looks up translated UI text with fallback", () => {
    expect(uiText(en, "contact", "연락처")).toBe("CONTACT");
    expect(uiText(en, "missing", "기본")).toBe("기본");
  });
});
