// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { LIGHT } from "@/content/theme";
import { localizePortfolioContent, type Locale } from "@/lib/i18nContent";
import ProjectInsightPanel, { INSIGHT_COPY } from "./ProjectInsightPanel";
import { flowProvenance, flowViewsFor, nodeLabel } from "./capabilityFlowModel";
import { pick } from "./capabilityModel";
import { JOURNEY_COPY } from "./FlowJourneyView";
import { PROJECT_INSIGHTS } from "./projectInsights";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SPARSE = ["hangul-clock", "unity-hackathon"];

function projectsFor(locale: Locale) {
  return localizePortfolioContent(portfolioContent, englishTranslations, locale).projects.filter((project) => project.status === "published");
}

function render(slug: string, locale: Locale) {
  const project = projectsFor(locale).find((item) => item.slug === slug)!;
  return renderToStaticMarkup(<ProjectInsightPanel project={project} T={LIGHT} locale={locale} />);
}

/** React 가 글자를 그릴 때와 같은 방식으로 특수 문자를 바꿉니다. */
const html = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const count = (markup: string, needle: string) => markup.split(needle).length - 1;
/** 화면에 보이는 글자 (태그를 빼고 봅니다. 개발용 플러그인이 붙이는 data-loc 속성도 함께 빠집니다) */
const visible = (markup: string) => markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
/** 이 시험은 jsdom 에서 돌므로 URL 대신 파일 경로 문자열로 읽습니다. */
const readCss = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url).href), "utf8");

describe("ProjectInsightPanel (inside each project's 자세히 보기)", () => {
  it("opens every project with one outcome sentence and one flow diagram (sparse records: what the record covers)", () => {
    for (const locale of ["ko", "en"] as const) {
      for (const project of projectsFor(locale)) {
        const markup = render(project.slug, locale);
        expect(markup).toContain(html(pick(PROJECT_INSIGHTS[project.slug].enables, locale)));
        if (SPARSE.includes(project.slug)) {
          expect(markup).toContain(html(INSIGHT_COPY[locale].sparse));
          expect(markup).not.toContain('data-node="');
          continue;
        }
        const flow = flowViewsFor(project.slug)[0];
        // 도식 하나와 고른 단계 설명 하나만 그립니다.
        expect(count(markup, 'class="fj-board"')).toBe(1);
        expect(count(markup, 'class="fj-note is-compact"')).toBe(1);
        expect(count(markup, 'data-node="')).toBe(flow.nodes.length);
        for (const node of flow.nodes) expect(markup).toContain(html(nodeLabel(node, locale)));
        // 도식 아래 한 줄: 이 흐름이 기록·코드·설명용 가운데 무엇에 기대는지
        expect(markup).toContain(html(JOURNEY_COPY[locale].evidence[flow.evidence]));
        expect(markup).toContain(html(flowProvenance(flow, locale)));
        expect(markup).toContain(locale === "en" ? ">Wide view<" : ">넓게 보기<");
      }
    }
  });

  it("keeps comparison, modules, source and the full write-up closed behind one row of buttons", () => {
    for (const locale of ["ko", "en"] as const) {
      const copy = INSIGHT_COPY[locale];
      for (const project of projectsFor(locale)) {
        const markup = render(project.slug, locale);
        const insight = PROJECT_INSIGHTS[project.slug];
        const expected = SPARSE.includes(project.slug) ? [copy.full] : [copy.compare, copy.modules, copy.source, copy.full];
        for (const label of expected) expect(markup).toContain(`>${html(label)}<`);
        expect(count(markup, 'aria-expanded="false"')).toBe(expected.length);
        expect(markup).not.toContain('aria-expanded="true"');
        // 펼치기 전에는 비교·모듈·출처 내용과 소개 전문을 그리지 않습니다.
        for (const comparison of insight.comparisons) expect(markup).not.toContain(html(pick(comparison.before.text, locale)));
        for (const hidden of ['class="pi-cmp', 'class="pi-mods"', 'class="pi-src-list"', "project-detail-body"]) expect(markup).not.toContain(hidden);
        expect(markup).not.toContain(html(copy.illustrativeNote));
      }
    }
  });

  it("opens one section at a time from that row, and closes it again", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const project = projectsFor("ko").find((item) => item.slug === "smartfarm-rag")!;
    act(() => root.render(<ProjectInsightPanel project={project} T={LIGHT} locale="ko" />));
    const buttons = () => Array.from(container.querySelectorAll<HTMLButtonElement>(".pi-more-btn"));
    const region = () => container.querySelector<HTMLElement>(".pi-more-body")!;
    expect(buttons().map((button) => button.textContent)).toEqual(["비교", "구현한 모듈", "출처와 한계", "소개 전문"]);
    expect(region().hidden).toBe(true);

    act(() => buttons()[0].click());
    expect(buttons()[0].getAttribute("aria-expanded")).toBe("true");
    expect(region().hidden).toBe(false);
    expect(region().getAttribute("aria-labelledby")).toBe(buttons()[0].id);
    for (const part of ["추가 AI 호출로 결정", "이해를 위한 비교 예시", "실제 이전 구현이나 실험 기준이 아니라"]) expect(region().textContent).toContain(part);

    act(() => buttons()[3].click());
    expect(buttons()[0].getAttribute("aria-expanded")).toBe("false");
    expect(region().querySelector(".project-detail-body")?.textContent).toContain("맡은 역할");
    expect(region().textContent).not.toContain("추가 AI 호출로 결정");

    // 출처와 한계는 지금 보고 있는 흐름(스마트팜은 시뮬레이터 화면 기록)의 것입니다.
    act(() => buttons()[2].click());
    expect(region().textContent).toContain("2026-10-01 화면 기록 · 시뮬레이터");
    expect(region().textContent).toContain("실제 농장의 측정값이나 설비 제어 결과가 아닙니다.");
    act(() => buttons()[2].click());
    expect(region().hidden).toBe(true);
    expect(container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0);

    act(() => root.unmount());
    container.remove();
  });

  it("does not repeat headings, result badges or step-by-step controls from the old panel", () => {
    const text = visible(render("smartfarm-rag", "ko"));
    for (const old of ["할 수 있게 된 일", "결과 구분", "모듈과 데이터 흐름", "단계 1 / ", "이전 단계", "다음 단계", "단계 살펴보기", "선택한 프로젝트"]) {
      expect(text).not.toContain(old);
    }
    // 조작은 흐름 고르기 · 재생 · 넓게 보기 · 더 알아보기 단추뿐입니다.
    const markup = render("music-splitter-web", "ko");
    expect(count(markup, "<button")).toBe(flowViewsFor("music-splitter-web")[0].nodes.length + 2 + 4);
  });

  it("stays still in static markup: no step is current until playback starts, and no dialog", () => {
    for (const slug of ["smartfarm-rag", "music-splitter-web", "mv-evirag", "food-scan"]) {
      const markup = render(slug, "ko");
      expect(markup).not.toContain('aria-current="step"');
      expect(markup).not.toContain("is-now");
      expect(markup).not.toContain("cfw-dialog");
    }
  });

  it("labels the Smartfarm record as a simulator, rule-based screen record and offers its other flows as tabs", () => {
    const markup = render("smartfarm-rag", "ko");
    expect(count(markup, 'role="tab"')).toBe(3);
    expect(count(markup, 'aria-selected="true"')).toBe(1);
    expect(markup).toContain("화면 기록 재생");
    expect(markup).toContain("2026-10-01 화면 기록 · 시뮬레이터 값 · 정해진 규칙으로 판단 · 실제 농장 아님");
    expect(markup).toContain("운영 지원 흐름 (시뮬레이션)");
    const english = render("smartfarm-rag", "en");
    expect(english).toContain("simulator values · judged by fixed rules · not a real farm");
  });

  it("draws MusicSplitterWeb as the code shows it: Spring serves the page, the browser posts the audio to FastAPI", () => {
    const markup = render("music-splitter-web", "ko");
    expect(markup).toContain("코드로 확인한 흐름");
    expect(markup).toContain("공개 저장소 78ee472 커밋의 코드 · 실행 기록 아님");
    expect(markup).toContain("화면은 Spring 서버가 주지만, 음원 파일은 브라우저가 FastAPI 서버로 직접 보내고 그 응답으로 결과를 재생합니다.");
    for (const label of ["Spring 로그인·화면", "브라우저 업로드", "FastAPI /audio", "Spleeter 분리"]) expect(markup).toContain(html(label));
    expect(visible(markup)).not.toMatch(/Python 서버로 넘|localhost|https?:\/\/|:\d{4}\b/);
  });

  it("marks the MV-EviRAG flow as code, not a run, with no run values", () => {
    const text = visible(render("mv-evirag", "ko"));
    expect(text).toContain("코드로 확인한 흐름");
    expect(text).toContain("연구 저장소의 평가 실행 코드 · 실행 기록 아님");
    expect(text).not.toMatch(/\d+(\.\d+)?\s*%|\b0\.\d{2,}\b/);
    const explanatory = visible(render("aerospace-rag", "ko"));
    expect(explanatory).toContain("설명용 흐름");
    expect(explanatory).toContain("프로젝트 소개 글 기준 · 실제 값 없음 · 개요 수준");
  });

  it("keeps the panel and diagram type on the home scale (11px to 16px) with 44px targets on touch screens", () => {
    for (const file of ["./projectInsight.css", "./flowJourney.css"]) {
      const css = readCss(file);
      const sizes = Array.from(css.matchAll(/font-size:\s*([\d.]+)rem/g), (match) => Number(match[1]));
      expect(sizes.length).toBeGreaterThan(10);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0.6875);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(1.125);
      expect(css.slice(css.indexOf("@media (pointer: coarse)"))).toContain("min-height: 2.75rem;");
    }
    const panel = readCss("./projectInsight.css");
    const diagram = readCss("./flowJourney.css");
    expect(panel.slice(panel.indexOf("@media (pointer: coarse)"))).toContain(".pi-more-btn");
    for (const selector of [".fj-btn", ".fj-tab", ".fj-node"]) expect(diagram.slice(diagram.indexOf("@media (pointer: coarse)"))).toContain(selector);
    // 움직임 줄이기에서는 데이터 이동을 그리지 않습니다.
    expect(diagram.slice(diagram.indexOf("@media (prefers-reduced-motion: reduce)"))).toMatch(/\.fj-packet,\s*\.fj-sdot\s*\{\s*display: none;/);
  });
});
