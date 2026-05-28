import { describe, expect, it } from "vitest";
import {
  buildSkillGroupsFromRepositories,
  compactStars,
  parseGitHubImportSource,
  repositoryToProjectCandidate,
  repositoryToStarredCandidate,
} from "../../../functions/_utils/githubImport.js";

const repo = {
  name: "aerospace-rag",
  full_name: "NAMUORI00/aerospace-rag",
  html_url: "https://github.com/NAMUORI00/aerospace-rag",
  description: "항공우주 문서 검색 RAG 시스템",
  homepage: "",
  topics: ["rag", "qdrant", "ollama"],
  language: "Python",
  stargazers_count: 1320,
  forks_count: 17,
  private: false,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-18T00:00:00Z",
};

describe("github import function helpers", () => {
  it("parses profile and repository sources", () => {
    expect(parseGitHubImportSource("https://github.com/NAMUORI00", "profile")).toEqual({ owner: "NAMUORI00" });
    expect(parseGitHubImportSource("NAMUORI00/aerospace-rag", "repo")).toEqual({
      owner: "NAMUORI00",
      repo: "aerospace-rag",
    });
    expect(() => parseGitHubImportSource("https://example.com/NAMUORI00", "profile")).toThrow("GitHub");
  });

  it("formats stars compactly", () => {
    expect(compactStars(999)).toBe("999");
    expect(compactStars(1320)).toBe("1.3k");
    expect(compactStars(15200)).toBe("15.2k");
  });

  it("maps repository metadata to a project candidate", () => {
    const project = repositoryToProjectCandidate(repo, {
      languages: { Python: 1200, TypeScript: 800 },
      readme: "# Aerospace RAG\n\nA retrieval system for aerospace docs.\n\n## Install\nRun it.",
    });

    expect(project).toMatchObject({
      slug: "aerospace-rag",
      name: "aerospace-rag",
      period: "2026.05",
      desc: "항공우주 문서 검색 RAG 시스템",
      metric: "★ 1.3k · forks 17 · Python 중심 저장소",
      tags: ["rag", "qdrant", "ollama", "Python", "TypeScript"],
      link: "https://github.com/NAMUORI00/aerospace-rag",
      category: "toy",
      focus: "research",
      proofLevel: "exploration",
      status: "draft",
      private: false,
    });
    expect(project.metrics).toEqual([]);
    expect(project.evaluation).toEqual({});
    expect(project.body).toContain("GitHub URL");
    expect(project.body).toContain("A retrieval system for aerospace docs.");
  });

  it("builds grouped skills from repository languages and topics", () => {
    const groups = buildSkillGroupsFromRepositories([
      { ...repo, topics: ["react", "rag"], language: "TypeScript" },
      { ...repo, topics: ["docker", "qdrant"], language: "Python" },
    ], [{ Python: 10, TypeScript: 8, Dockerfile: 2 }]);

    expect(groups).toContainEqual({ label: "Language", items: ["TypeScript", "Python"] });
    expect(groups).toContainEqual({ label: "Frontend", items: ["React"] });
    expect(groups).toContainEqual({ label: "AI / Data", items: ["RAG", "Qdrant"] });
    expect(groups).toContainEqual({ label: "Infra", items: ["Docker"] });
  });

  it("maps starred repositories to compact starred candidates", () => {
    expect(repositoryToStarredCandidate(repo)).toEqual({
      name: "NAMUORI00/aerospace-rag",
      href: "https://github.com/NAMUORI00/aerospace-rag",
      stars: "1.3k",
      desc: "항공우주 문서 검색 RAG 시스템",
    });
  });

  it("falls back to the full repository name when a starred URL is missing", () => {
    expect(repositoryToStarredCandidate({ ...repo, html_url: "" }).href).toBe("https://github.com/NAMUORI00/aerospace-rag");
  });
});
