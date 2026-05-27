import { serializeFrontmatter } from "@/content/markdown";
import type {
  EducationEntry,
  ContentOrder,
  NoteEntry,
  ProfileContent,
  ProjectEntry,
  ResearchEntry,
  SkillGroup,
  SiteContent,
  StarredRepo,
} from "@/content";

export interface SaveFile {
  path: string;
  content: string;
  encoding?: "text" | "base64";
}

export interface SavePayload {
  branch: string;
  message: string;
  files: SaveFile[];
}

export type SaveTarget =
  | { kind: "site"; value: SiteContent }
  | { kind: "profile"; value: ProfileContent }
  | { kind: "education"; value: EducationEntry[] }
  | { kind: "skills"; value: SkillGroup[] }
  | { kind: "starred"; value: StarredRepo[] }
  | { kind: "project"; value: ProjectEntry; order?: ContentOrder }
  | { kind: "research"; value: ResearchEntry; order?: ContentOrder }
  | { kind: "note"; value: NoteEntry; order?: ContentOrder };

function cleanSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function projectBranchName(slug: string): string {
  return `draft/project-${cleanSlug(slug)}`;
}

export function researchBranchName(slug: string): string {
  return `draft/research-${cleanSlug(slug)}`;
}

export function noteBranchName(slug: string): string {
  return `draft/note-${cleanSlug(slug)}`;
}

function jsonFile(path: string, value: unknown): SaveFile {
  return { path, content: `${JSON.stringify(value, null, 2)}\n` };
}

function orderFile(order?: ContentOrder): SaveFile[] {
  return order ? [jsonFile("content/order.json", order)] : [];
}

export function appendSaveFiles(payload: SavePayload, files: SaveFile[]): SavePayload {
  if (files.length === 0) return payload;
  return {
    ...payload,
    files: [...payload.files, ...files],
  };
}

export function serializeProject(project: ProjectEntry): SaveFile {
  return {
    path: `content/projects/${project.slug}.mdx`,
    content: serializeFrontmatter(
      {
        slug: project.slug,
        name: project.name,
        period: project.period,
        status: project.status,
        desc: project.desc,
        metric: project.metric,
        tags: project.tags,
        link: project.link,
        highlight: project.highlight,
        private: project.private,
        ...(project.coverImage ? { coverImage: project.coverImage } : {}),
        relatedNotes: project.relatedNotes,
      },
      project.body,
    ),
  };
}

export function serializeResearch(research: ResearchEntry): SaveFile {
  return {
    path: `content/research/${research.slug}.mdx`,
    content: serializeFrontmatter(
      {
        slug: research.slug,
        title: research.title,
        status: research.status,
        desc: research.desc,
        ...(research.coverImage ? { coverImage: research.coverImage } : {}),
        showDiagram: research.showDiagram,
        relatedNotes: research.relatedNotes,
      },
      research.body,
    ),
  };
}

export function serializeNote(note: NoteEntry): SaveFile {
  return {
    path: `content/notes/${note.slug}.mdx`,
    content: serializeFrontmatter(
      {
        slug: note.slug,
        title: note.title,
        status: note.status,
        date: note.date,
        summary: note.summary,
        tags: note.tags,
        relatedProjects: note.relatedProjects,
        relatedResearch: note.relatedResearch,
      },
      note.body,
    ),
  };
}

export function buildSavePayload(target: SaveTarget): SavePayload {
  if (target.kind === "site") {
    return {
      branch: "draft/site",
      message: "Update site settings",
      files: [jsonFile("content/site.json", target.value)],
    };
  }
  if (target.kind === "profile") {
    return {
      branch: "draft/profile",
      message: "Update profile",
      files: [jsonFile("content/profile.json", target.value)],
    };
  }
  if (target.kind === "education") {
    return {
      branch: "draft/education",
      message: "Update timeline",
      files: [jsonFile("content/education.json", target.value)],
    };
  }
  if (target.kind === "skills") {
    return {
      branch: "draft/skills",
      message: "Update skills",
      files: [jsonFile("content/skills.json", target.value)],
    };
  }
  if (target.kind === "starred") {
    return {
      branch: "draft/starred",
      message: "Update starred repositories",
      files: [jsonFile("content/starred.json", target.value)],
    };
  }
  if (target.kind === "project") {
    return {
      branch: projectBranchName(target.value.slug),
      message: `Update project: ${target.value.slug}`,
      files: [serializeProject(target.value), ...orderFile(target.order)],
    };
  }
  if (target.kind === "research") {
    return {
      branch: researchBranchName(target.value.slug),
      message: `Update research: ${target.value.slug}`,
      files: [serializeResearch(target.value), ...orderFile(target.order)],
    };
  }
  return {
    branch: noteBranchName(target.value.slug),
    message: `Update note: ${target.value.slug}`,
    files: [serializeNote(target.value), ...orderFile(target.order)],
  };
}
