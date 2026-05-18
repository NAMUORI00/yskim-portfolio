import site from "@content/site.json";
import profile from "@content/profile.json";
import education from "@content/education.json";
import skills from "@content/skills.json";
import starred from "@content/starred.json";
import ragResearch from "@content/research/rag.mdx?raw";
import edgeLlmResearch from "@content/research/edge-llm.mdx?raw";
import audioVoiceResearch from "@content/research/audio-voice.mdx?raw";
import agenticWorkflowResearch from "@content/research/agentic-workflow.mdx?raw";
import aerospaceRagProject from "@content/projects/aerospace-rag.mdx?raw";
import llmRagResearchProject from "@content/projects/llm-rag-research.mdx?raw";
import crossReviewBridgeProject from "@content/projects/cross-review-bridge.mdx?raw";
import musicSourceSeparationProject from "@content/projects/music-source-separation.mdx?raw";
import mediamtxInstallerProject from "@content/projects/mediamtx-installer.mdx?raw";
import introduceCvPageProject from "@content/projects/introduce-cv-page.mdx?raw";
import springCommunityBoardProject from "@content/projects/spring-community-board.mdx?raw";
import ragEvaluationNote from "@content/notes/rag-evaluation.mdx?raw";
import { parseFrontmatter } from "./markdown";
import { validatePortfolioContent } from "./schema";
import type { NoteEntry, ProjectEntry, ResearchEntry } from "./types";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function status(value: unknown): "draft" | "published" | "archived" {
  return value === "draft" || value === "archived" ? value : "published";
}

function parseResearch(source: string): ResearchEntry {
  const { data, body } = parseFrontmatter(source);
  return {
    slug: String(data.slug ?? ""),
    title: String(data.title ?? ""),
    status: status(data.status),
    desc: String(data.desc ?? ""),
    showDiagram: bool(data.showDiagram),
    relatedNotes: stringArray(data.relatedNotes),
    body,
  };
}

function parseProject(source: string): ProjectEntry {
  const { data, body } = parseFrontmatter(source);
  return {
    slug: String(data.slug ?? ""),
    name: String(data.name ?? ""),
    period: String(data.period ?? ""),
    status: status(data.status),
    desc: String(data.desc ?? ""),
    metric: String(data.metric ?? ""),
    tags: stringArray(data.tags),
    link: String(data.link ?? ""),
    highlight: bool(data.highlight),
    private: bool(data.private),
    relatedNotes: stringArray(data.relatedNotes),
    body,
  };
}

function parseNote(source: string): NoteEntry {
  const { data, body } = parseFrontmatter(source);
  return {
    slug: String(data.slug ?? ""),
    title: String(data.title ?? ""),
    status: status(data.status),
    date: String(data.date ?? ""),
    summary: String(data.summary ?? ""),
    tags: stringArray(data.tags),
    relatedProjects: stringArray(data.relatedProjects),
    relatedResearch: stringArray(data.relatedResearch),
    body,
  };
}

export const portfolioContent = validatePortfolioContent({
  site,
  profile,
  education,
  research: [ragResearch, edgeLlmResearch, audioVoiceResearch, agenticWorkflowResearch].map(parseResearch),
  projects: [
    aerospaceRagProject,
    llmRagResearchProject,
    crossReviewBridgeProject,
    musicSourceSeparationProject,
    mediamtxInstallerProject,
    introduceCvPageProject,
    springCommunityBoardProject,
  ].map(parseProject),
  skills,
  starred,
  notes: [ragEvaluationNote].map(parseNote),
});

export type { NoteEntry, PortfolioContent, ProjectEntry, ResearchEntry } from "./types";
