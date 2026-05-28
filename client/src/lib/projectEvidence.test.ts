import { describe, expect, it } from "vitest";
import type { ProjectEntry } from "@/content";
import {
  filterProjects,
  projectCategoryLabel,
  projectEvidenceMetrics,
  projectFocusLabel,
  projectProofLevelLabel,
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
