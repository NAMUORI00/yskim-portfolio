import { describe, expect, it } from "vitest";
import type { ProjectEntry, SkillGroup, StarredRepo } from "@/content";
import {
  demoGitHubImportResponse,
  mergeProjectCandidate,
  mergeSkillCandidates,
  mergeStarredCandidates,
  parseGitHubSource,
} from "./githubImport";

const project: ProjectEntry = {
  slug: "aerospace-rag",
  name: "aerospace-rag",
  period: "2026.05",
  desc: "기존 설명",
  metric: "기존 성과",
  tags: ["Python"],
  link: "https://github.com/NAMUORI00/aerospace-rag",
  highlight: true,
  private: false,
  status: "published",
  body: "기존 본문",
  relatedNotes: [],
};

describe("github import helpers", () => {
  it("parses profile and repository GitHub sources", () => {
    expect(parseGitHubSource("https://github.com/NAMUORI00", "profile")).toEqual({ owner: "NAMUORI00" });
    expect(parseGitHubSource("github.com/NAMUORI00/aerospace-rag", "repo")).toEqual({
      owner: "NAMUORI00",
      repo: "aerospace-rag",
    });
    expect(parseGitHubSource("NAMUORI00/aerospace-rag", "repo")).toEqual({
      owner: "NAMUORI00",
      repo: "aerospace-rag",
    });
    expect(parseGitHubSource("https://example.com/NAMUORI00", "profile")).toBeNull();
  });

  it("replaces a matching project slug and appends a new project candidate", () => {
    const replacement: ProjectEntry = { ...project, desc: "GitHub에서 가져온 설명", status: "draft" };
    const replaced = mergeProjectCandidate([project], replacement);

    expect(replaced.index).toBe(0);
    expect(replaced.items[0].desc).toBe("GitHub에서 가져온 설명");
    expect(replaced.items[0].status).toBe("draft");

    const next: ProjectEntry = { ...project, slug: "new-repo", name: "new-repo" };
    const appended = mergeProjectCandidate([project], next);

    expect(appended.index).toBe(1);
    expect(appended.items.map((item) => item.slug)).toEqual(["aerospace-rag", "new-repo"]);
  });

  it("merges skill candidates without duplicate casing", () => {
    const current: SkillGroup[] = [{ label: "Language", items: ["Python", "TypeScript"] }];
    const candidates: SkillGroup[] = [
      { label: "Language", items: ["python", "Rust"] },
      { label: "Infra", items: ["Cloudflare"] },
    ];

    expect(mergeSkillCandidates(current, candidates)).toEqual([
      { label: "Language", items: ["Python", "TypeScript", "Rust"] },
      { label: "Infra", items: ["Cloudflare"] },
    ]);
  });

  it("appends only missing starred repositories", () => {
    const current: StarredRepo[] = [{ name: "typst/typst", stars: "40k", desc: "기존" }];
    const candidates: StarredRepo[] = [
      { name: "Typst/Typst", stars: "50k", desc: "업데이트 후보" },
      { name: "cloudflare/workers-sdk", stars: "7.2k", desc: "Workers tooling" },
    ];

    expect(mergeStarredCandidates(current, candidates)).toEqual([
      { name: "typst/typst", stars: "40k", desc: "기존" },
      { name: "cloudflare/workers-sdk", stars: "7.2k", desc: "Workers tooling" },
    ]);
  });

  it("provides deterministic demo candidates for local admin preview", () => {
    expect(demoGitHubImportResponse.projects[0].slug).toBe("github-import-preview");
    expect(demoGitHubImportResponse.skills.length).toBeGreaterThan(0);
    expect(demoGitHubImportResponse.starred.length).toBeGreaterThan(0);
  });
});
