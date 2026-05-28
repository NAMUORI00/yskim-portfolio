import { describe, expect, it } from "vitest";
import type { ProjectEntry } from "@/content";
import {
  createProjectFilterSelection,
  filterProjects,
  filterProjectsBySelection,
  hasProjectOverflow,
  projectCategoryLabel,
  projectEvidenceMetrics,
  projectFocusLabel,
  projectProofLevelLabel,
  projectYearBuckets,
  projectYearLabel,
  toggleProjectFilter,
} from "./projectEvidence";

const baseProject: ProjectEntry = {
  slug: "aerospace-rag",
  name: "aerospace-rag",
  period: "2026.05",
  desc: "RAG system",
  metric: "MRR +31%",
  category: "career",
  focus: "research",
  proofLevel: "core",
  metrics: [],
  evaluation: {},
  tags: ["Python", "RAG"],
  link: "",
  highlight: true,
  private: false,
  status: "published",
  relatedNotes: [],
  body: "본문",
};

describe("project evidence helpers", () => {
  it("filters projects by career/toy category and focus axis", () => {
    const projects: ProjectEntry[] = [
      baseProject,
      { ...baseProject, slug: "tool", category: "toy", focus: "tool" },
      { ...baseProject, slug: "experiment", category: "toy", focus: "experiment" },
    ];

    expect(filterProjects(projects, "all").map((project) => project.slug)).toEqual(["aerospace-rag", "tool", "experiment"]);
    expect(filterProjects(projects, "career").map((project) => project.slug)).toEqual(["aerospace-rag"]);
    expect(filterProjects(projects, "toy").map((project) => project.slug)).toEqual(["tool", "experiment"]);
    expect(filterProjects(projects, "tool").map((project) => project.slug)).toEqual(["tool"]);
  });

  it("supports B-style multi-select filters with OR within an axis and AND across axes", () => {
    const projects: ProjectEntry[] = [
      baseProject,
      { ...baseProject, slug: "career-tool", category: "career", focus: "tool", proofLevel: "supporting" },
      { ...baseProject, slug: "toy-tool", category: "toy", focus: "tool", proofLevel: "supporting" },
      { ...baseProject, slug: "toy-product", category: "toy", focus: "product", proofLevel: "exploration" },
    ];
    const selection = toggleProjectFilter(
      toggleProjectFilter(
        toggleProjectFilter(createProjectFilterSelection(), "category", "career"),
        "focus",
        "research",
      ),
      "focus",
      "tool",
    );

    expect(filterProjectsBySelection(projects, selection).map((project) => project.slug)).toEqual(["aerospace-rag", "career-tool"]);
    expect(filterProjectsBySelection(projects, toggleProjectFilter(selection, "focus", "research")).map((project) => project.slug)).toEqual([
      "career-tool",
    ]);
  });

  it("derives year buckets and overflow state for the B-style scroll panel", () => {
    const projects: ProjectEntry[] = [
      baseProject,
      { ...baseProject, slug: "ongoing", period: "진행 중" },
      { ...baseProject, slug: "older", period: "2025.04" },
      { ...baseProject, slug: "oldest", period: "2023.07" },
    ];

    expect(projectYearLabel(baseProject, "ko")).toBe("2026");
    expect(projectYearLabel(projects[1], "ko")).toBe("진행 중");
    expect(projectYearLabel(projects[1], "en")).toBe("Now");
    expect(projectYearBuckets(projects, "ko")).toEqual([
      { year: "2026", count: 1 },
      { year: "진행 중", count: 1 },
      { year: "2025", count: 1 },
      { year: "2023", count: 1 },
    ]);
    expect(hasProjectOverflow(projects, 3)).toBe(true);
    expect(hasProjectOverflow(projects.slice(0, 3), 3)).toBe(false);
  });

  it("localizes project labels", () => {
    expect(projectCategoryLabel("career", "ko")).toBe("커리어");
    expect(projectCategoryLabel("toy", "en")).toBe("Toy");
    expect(projectFocusLabel("research", "ko")).toBe("연구/실험");
    expect(projectFocusLabel("tool", "en")).toBe("Tool");
    expect(projectProofLevelLabel("core", "ko")).toBe("핵심 증거");
  });

  it("uses structured metrics before falling back to the legacy metric string", () => {
    expect(projectEvidenceMetrics({ ...baseProject, metrics: [{ label: "MRR", value: "+31%" }] })).toEqual([{ label: "MRR", value: "+31%" }]);
    expect(projectEvidenceMetrics(baseProject)).toEqual([{ label: "성과", value: "MRR +31%" }]);
  });
});
