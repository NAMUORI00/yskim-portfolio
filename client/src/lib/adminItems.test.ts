import { describe, expect, it } from "vitest";
import type { ProjectEntry } from "@/content";
import {
  appendItem,
  archiveEntry,
  createEducationEntry,
  createNoteDraft,
  createProjectDraft,
  createResearchDraft,
  createSkillGroup,
  createStarredRepo,
  duplicateProject,
  moveItem,
  removeItem,
  uniqueSlug,
  updateItem,
} from "./adminItems";

const project: ProjectEntry = {
  slug: "aerospace-rag",
  name: "Aerospace RAG",
  period: "2026.05",
  desc: "RAG system",
  metric: "MRR +31%",
  tags: ["Python"],
  link: "https://github.com/NAMUORI00/aerospace-rag",
  highlight: true,
  private: false,
  status: "published",
  relatedNotes: [],
  body: "## 개요\n\n본문",
};

describe("admin item helpers", () => {
  it("creates unique slugs", () => {
    expect(uniqueSlug("New Project", ["new-project", "new-project-2"])).toBe("new-project-3");
  });

  it("moves items and returns the new selected index", () => {
    expect(moveItem(["a", "b", "c"], 1, "up")).toEqual({ items: ["b", "a", "c"], index: 0 });
    expect(moveItem(["a", "b", "c"], 1, "down")).toEqual({ items: ["a", "c", "b"], index: 2 });
  });

  it("appends, removes, and updates collection items", () => {
    expect(appendItem(["a"], "b")).toEqual({ items: ["a", "b"], index: 1 });
    expect(removeItem(["a", "b", "c"], 1)).toEqual({ items: ["a", "c"], index: 1 });
    expect(updateItem([{ name: "a" }], 0, { name: "b" })).toEqual([{ name: "b" }]);
  });

  it("creates draft templates for editable collections", () => {
    expect(createProjectDraft(["new-project"]).slug).toBe("new-project-2");
    expect(createResearchDraft(["new-research"]).status).toBe("draft");
    expect(createNoteDraft(["new-note"], "2026-05-18").date).toBe("2026-05-18");
    expect(createEducationEntry()).toMatchObject({
      type: "milestone",
      status: "draft",
      highlight: true,
      current: false,
      bullets: [],
      links: [],
      relatedProjects: [],
      relatedSkills: [],
    });
    expect(createSkillGroup()).toEqual({ label: "새 그룹", items: [] });
    expect(createStarredRepo().stars).toBe("0");
  });

  it("duplicates project drafts without publishing the copy", () => {
    const copy = duplicateProject(project, ["aerospace-rag", "aerospace-rag-copy"]);

    expect(copy.slug).toBe("aerospace-rag-copy-2");
    expect(copy.name).toContain("Copy");
    expect(copy.status).toBe("draft");
    expect(copy.body).toBe(project.body);
  });

  it("archives publishable entries", () => {
    expect(archiveEntry(project).status).toBe("archived");
  });
});
