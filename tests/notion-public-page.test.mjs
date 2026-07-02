import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPublicPageBlocks } from "../scripts/notion-public-page.mjs";

function row(overrides = {}) {
  return {
    id: overrides.id ?? overrides.key ?? overrides.title ?? crypto.randomUUID?.() ?? "row",
    section: "projects",
    locale: "ko",
    title: "",
    key: "",
    summary: "",
    summaryLead: "",
    headline: "",
    availability: "",
    school: "",
    period: "",
    tags: "",
    items: "",
    metric: "",
    proof: "",
    href: "",
    link: "",
    url: "",
    stars: "",
    order: 9999,
    highlight: false,
    private: false,
    status: "Published",
    ...overrides,
  };
}

function blockText(block) {
  const payload = block?.[block.type];
  const richText = payload?.rich_text ?? [];
  return richText.map((item) => item?.text?.content ?? "").join("").trim();
}

test("buildPublicPageBlocks emits the editorial snapshot layout", () => {
  const blocks = buildPublicPageBlocks([
    row({
      section: "profile",
      locale: "ko",
      title: "김유석",
      key: "profile",
      headline: "CS/AI 석사 진학 중 AI 연구 · 엔지니어 지망",
      summaryLead: "일상부터 업무에 효율적이고 확장 가능한 시스템을 구축하는 사람입니다.",
      summary: "LLM 시스템, RAG 아키텍처, 경량 추론 분야를 중심으로 연구/개발합니다.",
    }),
    row({
      section: "site",
      locale: "ko",
      title: "김유석 | AI 연구 엔지니어 포트폴리오",
      key: "site",
      summary: "이 페이지는 섹션별 포트폴리오 DB를 기준으로 자동 렌더링되는 공개 포트폴리오입니다.",
    }),
    row({
      section: "site",
      locale: "en",
      title: "Kim Yuseok | AI Research Engineer Portfolio",
      key: "site",
      summary: "Public portfolio rendered from portfolio category databases.",
    }),
    row({ section: "contacts", locale: "ko", title: "namuori00@namuori.net", key: "email", href: "mailto:namuori00@namuori.net", order: 1 }),
    row({ section: "contacts", locale: "ko", title: "github.com/NAMUORI00", key: "github", href: "https://github.com/NAMUORI00", order: 2 }),
    row({
      section: "projects",
      locale: "ko",
      title: "aerospace-rag",
      key: "aerospace-rag",
      summary: "항공우주 문서를 대상으로 한 RAG 시스템.",
      tags: "Python, Qdrant, Ollama",
      metric: "MRR +31%",
      proof: "core",
      link: "https://github.com/NAMUORI00/aerospace-rag",
      order: 1,
      highlight: true,
    }),
    row({
      section: "projects",
      locale: "ko",
      title: "cross-review-bridge",
      key: "cross-review-bridge",
      summary: "인간 승인 기반 크로스 리뷰 워크플로우.",
      tags: "PowerShell, AI",
      metric: "리뷰 사이클 70% 단축",
      proof: "supporting",
      link: "https://github.com/NAMUORI00/cross-review-bridge",
      order: 2,
      highlight: true,
    }),
    row({
      section: "projects",
      locale: "ko",
      title: "IntroduceCvPage (namu-log)",
      key: "introduce-cv-page",
      summary: "블로그 + CV 시스템.",
      tags: "TypeScript, Next.js",
      link: "https://github.com/NAMUORI00/IntroduceCvPage",
      order: 10,
    }),
    row({
      section: "projects",
      locale: "ko",
      title: "private-project",
      key: "private-project",
      summary: "비공개 프로젝트.",
      link: "https://github.com/NAMUORI00/private-project",
      order: 3,
      highlight: true,
      private: true,
    }),
    row({
      section: "projects",
      locale: "en",
      title: "aerospace-rag",
      key: "aerospace-rag",
      summary: "A RAG system for aerospace documents.",
      link: "https://github.com/NAMUORI00/aerospace-rag",
      order: 1,
    }),
    row({
      section: "projects",
      locale: "en",
      title: "cross-review-bridge",
      key: "cross-review-bridge",
      summary: "A human-approved cross-review workflow.",
      link: "https://github.com/NAMUORI00/cross-review-bridge",
      order: 2,
    }),
    row({
      section: "research",
      locale: "ko",
      title: "Retrieval-Augmented Generation (RAG)",
      key: "rag",
      summary: "Dense / Sparse / Graph 3채널 검색과 Weighted RRF 통합.",
      order: 1,
    }),
    row({
      section: "timeline",
      locale: "ko",
      title: "CS / AI 석사 과정",
      key: "timeline-cs-ai",
      school: "제주대학교",
      period: "2025 — 2027",
      summary: "LLM 시스템, RAG 아키텍처, 경량 추론 분야 연구/개발 중",
      order: 1,
    }),
    row({
      section: "skills",
      locale: "ko",
      title: "핵심 언어",
      key: "skill-core",
      items: "Python, C++, TypeScript",
      order: 1,
    }),
    row({
      section: "notes",
      locale: "ko",
      title: "RAG 평가 노트",
      key: "rag-evaluation",
      summary: "검색 품질, 답변 근거성, 운영 비용을 함께 보는 기준.",
      order: 1,
    }),
    row({
      section: "starred",
      locale: "ko",
      title: "typst/typst",
      key: "typst",
      summary: "마크업 기반 조판 시스템",
      href: "https://github.com/typst/typst",
      stars: "53.4k",
      order: 1,
    }),
  ]);

  const headings = blocks.filter((block) => block.type === "heading_2").map(blockText);
  assert.deepEqual(headings, ["Selected", "Research", "Systems", "Timeline", "Skills", "Links", "English"]);

  const navParagraph = blocks.find((block) => block.type === "paragraph" && blockText(block) === "Selected · Research · Systems · Timeline · Links");
  assert.ok(navParagraph, "expected compact section navigation paragraph");

  const introParagraphs = blocks
    .filter((block) => block.type === "paragraph")
    .map(blockText)
    .filter(Boolean);
  assert.ok(
    introParagraphs.includes("일상부터 업무에 효율적이고 확장 가능한 시스템을 구축하는 사람입니다."),
    "expected first hero paragraph",
  );
  assert.ok(
    introParagraphs.includes("이 페이지는 섹션별 포트폴리오 DB를 기준으로 자동 렌더링되는 공개 포트폴리오입니다."),
    "expected second hero paragraph",
  );

  const selectedHeadingIndex = blocks.findIndex((block) => block.type === "heading_2" && blockText(block) === "Selected");
  assert.notEqual(selectedHeadingIndex, -1);
  const firstSelectedProject = blocks.slice(selectedHeadingIndex + 1).find((block) => block.type === "heading_3");
  assert.equal(blockText(firstSelectedProject), "aerospace-rag");
  assert.equal(blocks.map(blockText).includes("private-project"), false, "expected Private rows to be excluded");

  const linksHeadingIndex = blocks.findIndex((block) => block.type === "heading_2" && blockText(block) === "Links");
  const linksTexts = blocks.slice(linksHeadingIndex + 1).filter((block) => block.type === "bulleted_list_item").map(blockText);
  assert.ok(linksTexts.some((text) => text.startsWith("RAG 평가 노트 - ")), "expected note inside Links section");
  assert.ok(linksTexts.some((text) => text.startsWith("typst/typst - ")), "expected starred repo inside Links section");
});
