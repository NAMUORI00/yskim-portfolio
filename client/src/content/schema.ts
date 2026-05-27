import { z } from "zod";
import type { PortfolioContent } from "./types";

const statusSchema = z.enum(["draft", "published", "archived"]);
const timelineEntryTypeSchema = z.enum(["education", "research", "publication", "project", "award", "talk", "work", "milestone"]);

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

export function validatePortfolioContent(value: unknown): PortfolioContent {
  const parsed = portfolioContentSchema.parse(value);
  assertUnique(parsed.projects, "project");
  assertUnique(parsed.research, "research");
  assertUnique(parsed.notes, "note");
  return parsed;
}
