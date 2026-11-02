import { submissionWording } from "./wording";
import { describe, expect, it } from "vitest";
import { portfolioContent } from "@/content";
import {
  availableProjects,
  recommend,
  moveItem,
  selectedItems,
  projectBlocks,
} from "./model";

describe("submission document content", () => {
  it("selects the three public representative projects by default", () => {
    expect(recommend(portfolioContent, "ai").projects).toEqual([
      "smartfarm-rag",
      "mv-evirag",
      "music-splitter-web",
    ]);
  });
  it("preserves explicit order, deduplicates and rejects private/draft/unknown items", () => {
    const content = {
      ...portfolioContent,
      projects: portfolioContent.projects.map(p =>
        p.slug === "smartfarm-rag" ? { ...p, private: true } : p
      ),
    };
    const result = selectedItems(content, {
      projects: [
        "music-splitter-web",
        "smartfarm-rag",
        "missing",
        "mv-evirag",
        "mv-evirag",
      ],
      records: ["missing"],
    });
    expect(result.projects.map(p => p.slug)).toEqual([
      "music-splitter-web",
      "mv-evirag",
    ]);
    expect(result.records).toEqual([]);
    expect(
      availableProjects({
        ...content,
        projects: content.projects.map(p => ({
          ...p,
          status: "draft" as const,
        })),
      })
    ).toEqual([]);
  });
  it("moves a selected item without losing items and guards boundaries", () => {
    expect(moveItem(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], "missing", 1)).toEqual(["a", "b"]);
  });
  it("retains the simulator limitation in the shortest version", () => {
    const p = portfolioContent.projects.find(p => p.slug === "smartfarm-rag")!;
    const text = projectBlocks(p, "summary")
      .map(b => b.text)
      .join("\n");
    expect(text).toContain("시뮬레이션 환경에서 검증");
    expect(text).toContain("제1저자");
  });
  it("retains source review status and separates research from employment", () => {
    const items = selectedItems(
      portfolioContent,
      recommend(portfolioContent, "research")
    );
    expect(
      items.records.find(e => e.id === "paper:access")?.school ??
        items.records.map(e => e.school).join(" ")
    ).toContain("심사 중");
    expect(items.records.some(e => e.type === "research")).toBe(true);
    expect(items.records.some(e => e.type === "work")).toBe(true);
  });
});

describe("submission wording source coverage", () => {
  it("ties every rewrite to an existing source paragraph", () => {
    for (const [slug, edits] of Object.entries(submissionWording)) {
      const project = portfolioContent.projects.find(p => p.slug === slug)!;
      for (const original of Object.keys(edits))
        expect(project.body).toContain(original);
    }
  });
  it("describes the audio service result while preserving its execution scope", () => {
    const project = portfolioContent.projects.find(
      p => p.slug === "music-splitter-web"
    )!;
    const text = projectBlocks(project, "summary")
      .map(b => b.text)
      .join(" ");
    expect(text).not.toContain("연결한 경험입니다");
    expect(text).toContain("로컬 환경");
    expect(text).toContain("웹 페이지 응답이 지연되지 않게");
  });
});
