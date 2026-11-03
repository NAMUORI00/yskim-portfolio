// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { portfolioContent } from "@/content";
import PrintPortfolio from "./PrintPortfolio";
import { PRINT_HANDOFF_KEY, print, printItems, projectBySlug, repoUrl, sheets, writeHandoff } from "./printModel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root!.render(<PrintPortfolio />));
  return container;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  container = root = null;
  sessionStorage.clear();
});

describe("print portfolio", () => {
  it("only references projects and research modules that exist on the site", () => {
    const slugs = new Set(portfolioContent.projects.map(project => project.slug));
    for (const project of print.projects) expect(slugs.has(project.slug)).toBe(true);
    for (const lane of print.research.lanes) expect(slugs.has(lane.module.project)).toBe(true);
    for (const item of print.engineering.items) expect(slugs.has(item.slug)).toBe(true);
  });

  it("renders the default edition as ten A4 sheets", () => {
    expect(sheets()).toHaveLength(10);
    const page = mount();
    expect(page.querySelectorAll(".pp-sheet")).toHaveLength(10);
    expect(page.textContent).toContain("02 / 10");
    expect(page.querySelector("#pp-cover .pp-foot")).toBeNull();
  });

  it("follows the project order handed over from the submission editor", () => {
    const items = printItems(["mv-evirag", "music-splitter-web"]);
    expect(items.map(item => item.kind)).toEqual(["curated", "generic"]);
    writeHandoff({ projects: ["mv-evirag", "music-splitter-web"], introduction: "편집기에서 고친 소개입니다." });
    expect(sessionStorage.getItem(PRINT_HANDOFF_KEY)).toContain("music-splitter-web");
    const page = mount();
    const titles = Array.from(page.querySelectorAll(".pp-sheet")).map(sheet => sheet.getAttribute("aria-label"));
    expect(titles).toHaveLength(8);
    expect(page.textContent).toContain("편집기에서 고친 소개입니다.");
    // 프로젝트 쪽으로 나온 음원 분리 웹은 개발 경험 쪽에서 다시 나오지 않습니다.
    const engineering = page.querySelector("#pp-engineering")!;
    expect(engineering.textContent).not.toContain("AI 음원 분리 웹 서비스");
  });

  it("leaves out repositories the site keeps private and the sentences omitted for print", () => {
    const text = mount().textContent ?? "";
    for (const project of print.projects.filter(project => projectBySlug(project.slug)?.private)) {
      expect(repoUrl(project)).toBe("");
    }
    expect(text).not.toContain("smartfarm-state-revalidation");
    expect(document.querySelector("#pp-project-3 .pp-meta")?.textContent).toContain("비공개");
    // 뺄 문장은 사이트 자기소개에 실제로 있어야 하고, 인쇄본에는 나오지 않습니다.
    for (const sentence of print.about.omitSentences) {
      expect(portfolioContent.profile.summary.join(" ")).toContain(sentence);
      expect(text).not.toContain(sentence);
    }
  });

  it("keeps the print copy free of middle dots and solo-work wording", () => {
    const text = mount().textContent ?? "";
    expect(text).not.toMatch(/·/);
    expect(text).not.toMatch(/단독|혼자/);
  });
});
