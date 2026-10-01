import { describe, expect, it } from "vitest";
import { portfolioContent } from "@/content";
import type { Localized } from "./capabilityModel";
import { flowViewsFor } from "./capabilityFlowModel";
import { PROJECT_INSIGHTS, type ProjectInsight } from "./projectInsights";

const published = portfolioContent.projects.filter((project) => project.status === "published");
const SPARSE = ["hangul-clock", "unity-hackathon"];

function texts(insight: ProjectInsight): Localized[] {
  const out: Localized[] = [insight.enables, ...insight.status.map((status) => status.text)];
  insight.modules.forEach((module) => out.push(module.name, module.role));
  insight.comparisons.forEach((comparison) => {
    out.push(comparison.topic, comparison.before.title, comparison.before.text, comparison.after.title, comparison.after.text);
    if (comparison.note) out.push(comparison.note);
  });
  if (insight.sparse) out.push(insight.sparse);
  return out;
}

const allLines = (insight: ProjectInsight) => texts(insight).flatMap((value) => [value.ko, value.en]);

describe("project insights (expanded project details)", () => {
  it("covers every published project with Korean and English text", () => {
    expect(published).toHaveLength(17);
    expect(Object.keys(PROJECT_INSIGHTS).sort()).toEqual(published.map((project) => project.slug).sort());
    for (const [slug, insight] of Object.entries(PROJECT_INSIGHTS)) {
      expect(insight.slug).toBe(slug);
      expect(insight.status.length).toBeGreaterThan(0);
      for (const value of texts(insight)) {
        expect(value.ko.trim().length).toBeGreaterThan(0);
        expect(value.en.trim().length).toBeGreaterThan(0);
        // 영어 문장에 한글이 섞이지 않게 둡니다.
        expect(value.en).not.toMatch(/[가-힣]/);
      }
    }
  });

  it("describes sparse older projects honestly instead of inventing modules or comparisons", () => {
    for (const [slug, insight] of Object.entries(PROJECT_INSIGHTS)) {
      if (SPARSE.includes(slug)) {
        expect(insight.sparse).toBeDefined();
        expect(insight.modules).toHaveLength(0);
        expect(insight.comparisons).toHaveLength(0);
      } else {
        expect(insight.sparse).toBeUndefined();
        expect(insight.modules.length).toBeGreaterThan(0);
        expect(insight.comparisons.length).toBeGreaterThan(0);
        // 도식이 있는 프로젝트는 기록·코드·설명용 흐름 가운데 하나 이상을 가집니다.
        expect(flowViewsFor(slug).length).toBeGreaterThan(0);
      }
    }
  });

  it("does not claim measured improvements, performance numbers or business impact", () => {
    for (const insight of Object.values(PROJECT_INSIGHTS)) {
      for (const line of allLines(insight)) {
        expect(line).not.toMatch(/\d+(\.\d+)?\s*(%|배|ms\b|초)/);
        expect(line).not.toMatch(/향상|개선|절감|단축|빨라|높였|줄였|효율|도입|매출|사용자 수/);
        expect(line).not.toMatch(/improv|faster|reduc|boost|increas|efficien|revenue|adopt/i);
      }
    }
  });

  it("separates published, under-review, simulator-validated and exploratory work", () => {
    const kinds = (slug: string) => PROJECT_INSIGHTS[slug].status.map((status) => status.kind);
    expect(kinds("smartfarm-rag")).toEqual(["published", "simulated"]);
    expect(kinds("mv-evirag")).toEqual(["review"]);
    expect(kinds("music-source-separation")).toEqual(["exploratory"]);
    expect(kinds("introduce-cv-page")).toEqual(["exploratory"]);
    expect(kinds("music-splitter-web")).toEqual(["implemented"]);
    // 수상은 프로젝트 기록의 성과(metric)에 적힌 상만 씁니다.
    for (const [slug, insight] of Object.entries(PROJECT_INSIGHTS)) {
      const project = published.find((item) => item.slug === slug)!;
      if (insight.status.some((status) => status.kind === "award")) expect(project.metric).toMatch(/상$/);
    }
  });

  it("labels conceptual baselines as illustrative and never as a former implementation or experiment", () => {
    const illustrative = Object.values(PROJECT_INSIGHTS).flatMap((insight) => insight.comparisons.filter((comparison) => comparison.basis === "illustrative"));
    expect(illustrative.length).toBeGreaterThanOrEqual(5);
    for (const comparison of illustrative) {
      const line = [comparison.before.title, comparison.before.text].flatMap((value) => [value.ko, value.en]).join(" ");
      expect(line).not.toMatch(/이전 버전|기존 구현|baseline|previous version/i);
    }
    // 다중 시점 영상 연구의 비교 기준은 실험 기준이 아니라 설명용이며, 실제 결과는 심사 중인 논문에 있다고 밝힙니다.
    const mv = PROJECT_INSIGHTS["mv-evirag"].comparisons[0];
    expect(mv.basis).toBe("illustrative");
    expect(mv.note?.ko).toContain("심사 중");
    expect(mv.note?.ko).toContain("수치를 옮기지 않았습니다");
    // 스마트팜의 설계 비교는 프로젝트 기록에 적힌 "추가 AI 호출 대체"입니다.
    const source = PROJECT_INSIGHTS["smartfarm-rag"].comparisons.find((comparison) => comparison.basis === "source");
    expect(source?.after.text.ko).toContain("추가 AI 호출 없이");
    expect(published.find((project) => project.slug === "smartfarm-rag")?.body).toContain("추가 AI 호출을 대체");
  });

  it("keeps the Smartfarm sensor example a simulator record, not physical farm control", () => {
    const sensor = PROJECT_INSIGHTS["smartfarm-rag"].comparisons.find((comparison) => comparison.basis === "illustrative")!;
    expect(sensor.after.text.ko).toContain("65.0°C");
    expect(sensor.note?.ko).toContain("시뮬레이터");
    expect(sensor.note?.ko).toContain("실제 농장 측정이나 설비 제어 결과가 아닙니다");
    expect(sensor.note?.en).toContain("not real farm measurements or equipment control");
    for (const line of allLines(PROJECT_INSIGHTS["smartfarm-rag"])) expect(line).not.toMatch(/실제 농장에서 (제어|운영)|controls? (the |a )?real farm/i);
  });

  it("follows the code-confirmed MusicSplitterWeb path (browser → FastAPI /audio, Spleeter 5stems)", () => {
    const insight = PROJECT_INSIGHTS["music-splitter-web"];
    const lines = allLines(insight).join("\n");
    expect(lines).toContain("FormData");
    expect(lines).toContain("/audio");
    expect(lines).toContain("Spleeter 5stems");
    expect(lines).toContain("78ee472");
    // 소개 글의 "Spring 서버가 Python 서버로 파일을 넘긴다"는 표현은 쓰지 않습니다.
    expect(lines).not.toMatch(/Python 서버로 넘|relays? the file|hands the uploaded file/);
  });
});
