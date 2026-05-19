import type { ProjectEntry, SkillGroup, StarredRepo } from "@/content";

export type GitHubImportMode = "profile" | "repo";

export interface GitHubImportResponse {
  source: string;
  owner: string;
  projects: ProjectEntry[];
  skills: SkillGroup[];
  starred: StarredRepo[];
  warnings: string[];
}

export interface ParsedGitHubSource {
  owner: string;
  repo?: string;
}

function normalizeGitHubSource(source: string): string {
  const trimmed = source.trim().replace(/\/+$/, "");
  if (/^github\.com\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function parseGitHubSource(source: string, mode: GitHubImportMode): ParsedGitHubSource | null {
  const normalized = normalizeGitHubSource(source);
  if (!normalized) return null;

  let parts: string[];
  if (/^https?:\/\//i.test(normalized)) {
    let url: URL;
    try {
      url = new URL(normalized);
    } catch {
      return null;
    }
    if (url.hostname.toLowerCase() !== "github.com") return null;
    parts = url.pathname.split("/").filter(Boolean);
  } else {
    parts = normalized.split("/").filter(Boolean);
  }

  const [owner, repo] = parts;
  if (!owner || parts.length > 2) return null;
  if (mode === "repo" && !repo) return null;
  if (mode === "profile" && repo) return null;
  return repo ? { owner, repo } : { owner };
}

export function mergeProjectCandidate(projects: ProjectEntry[], candidate: ProjectEntry): { items: ProjectEntry[]; index: number } {
  const index = projects.findIndex((project) => project.slug.toLowerCase() === candidate.slug.toLowerCase());
  if (index >= 0) {
    return {
      items: projects.map((project, currentIndex) => (currentIndex === index ? candidate : project)),
      index,
    };
  }
  return { items: [...projects, candidate], index: projects.length };
}

function mergeItems(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((item) => item.trim().toLowerCase()).filter(Boolean));
  const next = [...existing];
  for (const item of incoming) {
    const clean = item.trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    next.push(clean);
  }
  return next;
}

export function mergeSkillCandidates(skills: SkillGroup[], candidates: SkillGroup[]): SkillGroup[] {
  let next = [...skills];
  for (const candidate of candidates) {
    const index = next.findIndex((group) => group.label.toLowerCase() === candidate.label.toLowerCase());
    if (index >= 0) {
      next = next.map((group, currentIndex) =>
        currentIndex === index ? { ...group, items: mergeItems(group.items, candidate.items) } : group,
      );
    } else if (candidate.items.length > 0) {
      next = [...next, { label: candidate.label, items: mergeItems([], candidate.items) }];
    }
  }
  return next;
}

export function mergeStarredCandidates(starred: StarredRepo[], candidates: StarredRepo[]): StarredRepo[] {
  const seen = new Set(starred.map((repo) => repo.name.trim().toLowerCase()).filter(Boolean));
  const next = [...starred];
  for (const candidate of candidates) {
    const key = candidate.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(candidate);
  }
  return next;
}

export const demoGitHubImportResponse: GitHubImportResponse = {
  source: "https://github.com/NAMUORI00/github-import-preview",
  owner: "NAMUORI00",
  projects: [
    {
      slug: "github-import-preview",
      name: "github-import-preview",
      period: "2026.05",
      desc: "GitHub 가져오기 미리보기용 프로젝트 후보입니다. 적용 후 포트폴리오 톤에 맞게 수정하세요.",
      metric: "★ 24 · TypeScript 중심 저장소 · GitHub 후보",
      tags: ["TypeScript", "React", "Cloudflare", "GitHub API"],
      link: "https://github.com/NAMUORI00/github-import-preview",
      highlight: false,
      private: false,
      status: "draft",
      relatedNotes: [],
      body: "## GitHub Import Preview\n\nGitHub 원링크에서 가져온 프로젝트 후보입니다.\n\n- Source: https://github.com/NAMUORI00/github-import-preview\n- Main stack: TypeScript, React, Cloudflare\n\n적용 후 설명, 성과, 태그를 포트폴리오 문체에 맞게 다듬으세요.\n",
    },
  ],
  skills: [
    { label: "Language", items: ["TypeScript", "Python"] },
    { label: "Infra", items: ["Cloudflare", "GitHub Actions"] },
  ],
  starred: [
    { name: "cloudflare/workers-sdk", stars: "7.2k", desc: "Cloudflare Workers and Pages tooling" },
    { name: "vitejs/vite", stars: "75k", desc: "Next generation frontend tooling" },
  ],
  warnings: ["로컬 미리보기에서는 실제 GitHub API 대신 샘플 후보를 사용합니다."],
};
