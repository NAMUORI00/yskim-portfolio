import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Admin.tsx", import.meta.url), "utf8");

describe("Admin projects editor source", () => {
  const projectsStart = source.lastIndexOf('if (active === "projects")');
  const projectsEnd = source.indexOf('if (active === "research")', projectsStart);
  const projectsBlock = source.slice(projectsStart, projectsEnd);

  it("edits project tags and related notes with chip lists instead of comma inputs", () => {
    expect(projectsBlock).toContain("renderProjectChipList");
    expect(projectsBlock).toContain('label: "Tags"');
    expect(projectsBlock).toContain('label: "Related notes"');
    expect(projectsBlock).not.toContain('value={project.tags.join(", ")}');
    expect(projectsBlock).not.toContain('value={project.relatedNotes.join(", ")}');
  });

  it("groups project fields into semantic cards", () => {
    expect(projectsBlock).toContain('className="admin-project-card"');
    expect(projectsBlock).toContain("Basic info");
    expect(projectsBlock).toContain("Publishing");
    expect(projectsBlock).toContain("Summary");
    expect(projectsBlock).toContain("Relations");
  });

  it("uses a project list selector instead of the old single dropdown", () => {
    expect(projectsBlock).toContain('className="admin-project-selector"');
    expect(projectsBlock).toContain("selectProject");
    expect(projectsBlock).not.toContain('<select disabled={!canEdit} value={projectIndex}');
  });

  it("makes the projects GitHub import panel collapsible", () => {
    const stateStart = source.indexOf("const [projectImportOpen");
    const importStart = source.indexOf("function renderGitHubImportPanel");
    const importEnd = source.indexOf('scope === "skills"', importStart);
    const importBlock = source.slice(importStart, importEnd);

    expect(stateStart).toBeGreaterThan(0);
    expect(importBlock).toContain("projectImportOpen");
    expect(importBlock).toContain("setProjectImportOpen");
    expect(importBlock).toContain("Show import");
    expect(importBlock).toContain("Hide import");
  });
});
