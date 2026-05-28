import { z } from "zod";
import type { PortfolioContent, ProjectCategory, ProjectEntry, ProjectFocus, ProjectProofLevel } from "./types";

const statusSchema = z.enum(["draft", "published", "archived"]);
const timelineEntryTypeSchema = z.enum(["education", "research", "publication", "project", "award", "talk", "work", "milestone"]);
const projectCategorySchema = z.enum(["career", "toy"]);
const projectFocusSchema = z.enum(["research", "product", "tool", "experiment"]);
const projectProofLevelSchema = z.enum(["core", "supporting", "exploration"]);
const projectMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  baseline: z.string().optional(),
  note: z.string().optional(),
});
const projectEvaluationSchema = z.object({
  baseline: z.string().optional(),
  dataset: z.string().optional(),
  method: z.string().optional(),
});

export const siteSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  url: z.string().min(1),
  navigation: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), icon: z.string().min(1) })),
  images: z.object({
    heroTree: z.string().min(1),
    ragDiagram: z.string().min(1),
    dotPattern: z.string().min(1),
  }),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  romanizedName: z.string().min(1),
  handle: z.string().min(1),
  status: z.string().min(1),
  avatarUrl: z.string().optional(),
  headline: z.string().min(1),
  summaryLead: z.string().min(1),
  summary: z.array(z.string()),
  contacts: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(["email", "github", "website", "external"]),
      label: z.string().min(1),
      href: z.string().min(1),
    }),
  ),
});

export const educationSchema = z.object({
  type: timelineEntryTypeSchema.default("education"),
  degree: z.string().min(1),
  school: z.string().min(1),
  period: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  note: z.string().default(""),
  current: z.boolean().default(false),
  status: statusSchema.default("published"),
  highlight: z.boolean().default(true),
  bullets: z.array(z.string()).default([]),
  links: z.array(z.object({ label: z.string().min(1), href: z.string().min(1) })).default([]),
  relatedProjects: z.array(z.string()).default([]),
  relatedSkills: z.array(z.string()).default([]),
});

export const researchSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  desc: z.string().min(1),
  status: statusSchema,
  coverImage: z.string().optional(),
  showDiagram: z.boolean(),
  body: z.string(),
  relatedNotes: z.array(z.string()),
});

export const projectSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  period: z.string().min(1),
  desc: z.string().min(1),
  metric: z.string().min(1),
  category: projectCategorySchema.optional(),
  focus: projectFocusSchema.optional(),
  proofLevel: projectProofLevelSchema.optional(),
  metrics: z.array(projectMetricSchema).optional(),
  evaluation: projectEvaluationSchema.optional(),
  tags: z.array(z.string()),
  link: z.string(),
  highlight: z.boolean(),
  private: z.boolean(),
  status: statusSchema,
  coverImage: z.string().optional(),
  body: z.string(),
  relatedNotes: z.array(z.string()),
});

export const skillGroupSchema = z.object({
  label: z.string().min(1),
  items: z.array(z.string().min(1)),
});

export const starredRepoSchema = z.object({
  name: z.string().min(1),
  href: z.string().min(1),
  stars: z.string().min(1),
  desc: z.string().min(1),
});

export const noteSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: statusSchema,
  date: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()),
  relatedProjects: z.array(z.string()),
  relatedResearch: z.array(z.string()),
  body: z.string(),
});

export const portfolioContentSchema = z.object({
  site: siteSchema,
  profile: profileSchema,
  education: z.array(educationSchema),
  research: z.array(researchSchema),
  projects: z.array(projectSchema),
  skills: z.array(skillGroupSchema),
  starred: z.array(starredRepoSchema),
  notes: z.array(noteSchema),
});

function assertUnique(items: Array<{ slug: string }>, label: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.slug)) {
      throw new Error(`Duplicate ${label} slug: ${item.slug}`);
    }
    seen.add(item.slug);
  }
}

function textIncludes(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function inferProjectFocus(project: z.infer<typeof projectSchema>): ProjectFocus {
  const text = [project.slug, project.name, project.desc, project.metric, project.tags.join(" "), project.body].join(" ").toLowerCase();
  if (textIncludes(text, ["rag", "llm", "ai", "qdrant", "ollama", "pytorch", "cuda", "huggingface", "research", "retrieval", "실험", "연구"])) {
    return "research";
  }
  if (textIncludes(text, ["github api", "cloudflare", "automation", "cli", "shell", "ubuntu", "worker", "installer", "배포", "자동화"])) {
    return "tool";
  }
  if (textIncludes(text, ["spring", "jpa", "react", "next", "board", "blog", "ui", "product", "서비스"])) {
    return "product";
  }
  return "experiment";
}

function normalizeProjectEvidence(project: z.infer<typeof projectSchema>): ProjectEntry {
  const category: ProjectCategory = project.category ?? (project.highlight ? "career" : "toy");
  const focus: ProjectFocus = project.focus ?? inferProjectFocus(project);
  const proofLevel: ProjectProofLevel = project.proofLevel ?? (project.highlight ? "core" : "exploration");
  return {
    ...project,
    category,
    focus,
    proofLevel,
    metrics: project.metrics ?? [],
    evaluation: project.evaluation ?? {},
  };
}

export function validatePortfolioContent(value: unknown): PortfolioContent {
  const parsed = portfolioContentSchema.parse(value);
  const normalized: PortfolioContent = {
    ...parsed,
    projects: parsed.projects.map(normalizeProjectEvidence),
  };
  assertUnique(normalized.projects, "project");
  assertUnique(normalized.research, "research");
  assertUnique(normalized.notes, "note");
  return normalized;
}
