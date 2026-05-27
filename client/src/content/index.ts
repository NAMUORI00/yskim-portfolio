import site from "@content/site.json";
import profile from "@content/profile.json";
import education from "@content/education.json";
import skills from "@content/skills.json";
import starred from "@content/starred.json";
import order from "@content/order.json";
import englishTranslationsData from "@content/i18n/en.json";
import { parseFrontmatter } from "./markdown";
import { validatePortfolioContent } from "./schema";
import type { EnglishTranslations } from "@/lib/i18nContent";
import type { NoteEntry, ProjectEntry, ResearchEntry } from "./types";

const researchModules = import.meta.glob<string>("@content/research/*.mdx", { eager: true, import: "default", query: "?raw" });
const projectModules = import.meta.glob<string>("@content/projects/*.mdx", { eager: true, import: "default", query: "?raw" });
const noteModules = import.meta.glob<string>("@content/notes/*.mdx", { eager: true, import: "default", query: "?raw" });

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function bool(value: unknown): boolean {
  return value === true || value === "true";
}

function status(value: unknown): "draft" | "published" | "archived" {
  return value === "draft" || value === "archived" ? value : "published";
}

function optionalString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function parseResearch(source: string): ResearchEntry {
  const { data, body } = parseFrontmatter(source);
  return {
    slug: String(data.slug ?? ""),
    title: String(data.title ?? ""),
    status: status(data.status),
    desc: String(data.desc ?? ""),
    coverImage: optionalString(data.coverImage),
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
    coverImage: optionalString(data.coverImage),
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

function orderedBySlug<T extends { slug: string }>(items: T[], preferredOrder: string[]): T[] {
  const order = new Map(preferredOrder.map((slug, index) => [slug, index]));
  return [...items].sort((a, b) => {
    const left = order.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const right = order.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    if (left !== right) return left - right;
    return a.slug.localeCompare(b.slug);
  });
}

function moduleSources(modules: Record<string, string>): string[] {
  return Object.entries(modules)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, source]) => source);
}

export const portfolioContent = validatePortfolioContent({
  site,
  profile,
  education,
  research: orderedBySlug(moduleSources(researchModules).map(parseResearch), order.research),
  projects: orderedBySlug(moduleSources(projectModules).map(parseProject), order.projects),
  skills,
  starred,
  notes: orderedBySlug(moduleSources(noteModules).map(parseNote), order.notes),
});

export const englishTranslations = englishTranslationsData as EnglishTranslations;

export { getProfileAvatarUrl } from "./profile";

export type {
  EducationEntry,
  ContentOrder,
  NoteEntry,
  PortfolioContent,
  ProfileContact,
  ProfileContent,
  ProjectEntry,
  PublicationStatus,
  ResearchEntry,
  SkillGroup,
  SiteContent,
  StarredRepo,
  TimelineEntryType,
  TimelineLink,
} from "./types";
