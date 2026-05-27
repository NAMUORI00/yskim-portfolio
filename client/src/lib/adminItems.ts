import type {
  EducationEntry,
  NoteEntry,
  ProjectEntry,
  PublicationStatus,
  ResearchEntry,
  SkillGroup,
  StarredRepo,
} from "@/content";

type MoveDirection = "up" | "down";
type PublishableEntry = { status: PublicationStatus };

function slugBase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

export function uniqueSlug(base: string, usedSlugs: string[]): string {
  const used = new Set(usedSlugs.map((slug) => slug.trim().toLowerCase()));
  const clean = slugBase(base);
  if (!used.has(clean)) return clean;

  let index = 2;
  while (used.has(`${clean}-${index}`)) index += 1;
  return `${clean}-${index}`;
}

export function moveItem<T>(items: T[], index: number, direction: MoveDirection): { items: T[]; index: number } {
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) {
    return { items, index };
  }
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return { items: next, index: nextIndex };
}

export function appendItem<T>(items: T[], item: T): { items: T[]; index: number } {
  return { items: [...items, item], index: items.length };
}

export function removeItem<T>(items: T[], index: number): { items: T[]; index: number } {
  if (index < 0 || index >= items.length) return { items, index };
  const next = items.filter((_, itemIndex) => itemIndex !== index);
  return { items: next, index: Math.max(0, Math.min(index, next.length - 1)) };
}

export function updateItem<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

export function archiveEntry<T extends PublishableEntry>(entry: T): T {
  return { ...entry, status: "archived" };
}

export function createProjectDraft(usedSlugs: string[]): ProjectEntry {
  return {
    slug: uniqueSlug("new-project", usedSlugs),
    name: "새 프로젝트",
    period: "기간 입력",
    status: "draft",
    desc: "프로젝트 설명을 입력하세요.",
    metric: "성과를 입력하세요.",
    tags: [],
    link: "",
    highlight: false,
    private: false,
    relatedNotes: [],
    body: "## 개요\n\n새 프로젝트 내용을 작성하세요.\n",
  };
}

export function duplicateProject(project: ProjectEntry, usedSlugs: string[]): ProjectEntry {
  return {
    ...project,
    slug: uniqueSlug(`${project.slug}-copy`, usedSlugs),
    name: `${project.name} Copy`,
    status: "draft",
  };
}

export function createResearchDraft(usedSlugs: string[]): ResearchEntry {
  return {
    slug: uniqueSlug("new-research", usedSlugs),
    title: "새 연구 관심사",
    status: "draft",
    desc: "연구 관심사 설명을 입력하세요.",
    showDiagram: false,
    relatedNotes: [],
    body: "## 연구 메모\n\n새 연구 내용을 작성하세요.\n",
  };
}

export function duplicateResearch(research: ResearchEntry, usedSlugs: string[]): ResearchEntry {
  return {
    ...research,
    slug: uniqueSlug(`${research.slug}-copy`, usedSlugs),
    title: `${research.title} Copy`,
    status: "draft",
  };
}

export function createNoteDraft(usedSlugs: string[], date = new Date().toISOString().slice(0, 10)): NoteEntry {
  return {
    slug: uniqueSlug("new-note", usedSlugs),
    title: "새 노트",
    status: "draft",
    date,
    summary: "노트 요약을 입력하세요.",
    tags: [],
    relatedProjects: [],
    relatedResearch: [],
    body: "## 노트\n\n새 노트 내용을 작성하세요.\n",
  };
}

export function duplicateNote(note: NoteEntry, usedSlugs: string[]): NoteEntry {
  return {
    ...note,
    slug: uniqueSlug(`${note.slug}-copy`, usedSlugs),
    title: `${note.title} Copy`,
    status: "draft",
  };
}

export function createEducationEntry(): EducationEntry {
  return {
    type: "milestone",
    degree: "새 타임라인 항목",
    school: "기관명",
    period: "기간 입력",
    startDate: "",
    endDate: "",
    note: "",
    current: false,
    status: "draft",
    highlight: true,
    bullets: [],
    links: [],
    relatedProjects: [],
    relatedSkills: [],
  };
}

export function createSkillGroup(): SkillGroup {
  return {
    label: "새 그룹",
    items: [],
  };
}

export function createStarredRepo(): StarredRepo {
  return {
    name: "owner/repository",
    stars: "0",
    desc: "저장소 설명을 입력하세요.",
  };
}
