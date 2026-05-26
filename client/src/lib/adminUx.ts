export type AdminUxSectionKey = "profile" | "education" | "research" | "projects" | "skills" | "starred" | "notes";
export type AdminImportScope = "projects" | "skills" | "starred";
export type AdminAction = "save" | "publish";

export interface ImportAppliedState {
  projects: string[];
  skills: string[];
  starred: string[];
}

export interface PublishResultLink {
  href: string;
  label: string;
}

export interface PublishCompletionNotice {
  message: string;
  link: PublishResultLink | null;
}

export interface EditableSkillGroup {
  label: string;
  items: string[];
}

const SECTION_LABELS: Record<AdminUxSectionKey, string> = {
  profile: "Profile",
  education: "Timeline",
  research: "Research",
  projects: "Projects",
  skills: "Skills",
  starred: "Starred",
  notes: "Notes",
};

export function sectionLabel(section: AdminUxSectionKey): string {
  return SECTION_LABELS[section];
}

export function sectionActionLabel(section: AdminUxSectionKey, action: AdminAction): string {
  const verb = action === "save" ? "Save" : "Publish";
  const noun = action === "save" ? "draft" : "PR";
  return `${verb} ${sectionLabel(section)} ${noun}`;
}

export function saveScopeSummary(section: AdminUxSectionKey, branch: string): string {
  return `Current target: ${sectionLabel(section)} · ${branch}`;
}

export function canSaveDraft(canEdit: boolean, dirty: boolean): boolean {
  return canEdit && dirty;
}

export function canPublishDraft(canEdit: boolean, dirty: boolean, draftReady: boolean): boolean {
  return canEdit && draftReady && !dirty;
}

function normalizeSkillItem(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function hasSkillItem(groups: EditableSkillGroup[], value: string): boolean {
  const clean = normalizeSkillItem(value).toLowerCase();
  if (!clean) return false;
  return groups.some((group) => group.items.some((item) => normalizeSkillItem(item).toLowerCase() === clean));
}

export function appendSkillItemToGroup<T extends EditableSkillGroup>(groups: T[], groupIndex: number, value: string): T[] {
  const clean = normalizeSkillItem(value);
  if (!clean || groupIndex < 0 || groupIndex >= groups.length || hasSkillItem(groups, clean)) return groups;
  return groups.map((group, index) => (index === groupIndex ? { ...group, items: [...group.items, clean] } : group));
}

function recordValue(record: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

function isGitHubWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "github.com";
  } catch {
    return false;
  }
}

export function publishCompletionNotice(prefix: string, result: unknown, fallbackBranch: string): PublishCompletionNotice {
  const record = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
  const htmlUrl = recordValue(record, "html_url");
  const prNumber = recordValue(record, "number");
  if (!isGitHubWebUrl(htmlUrl)) {
    return { message: `${prefix}: ${fallbackBranch}`, link: null };
  }

  const suffix = typeof prNumber === "number" || typeof prNumber === "string" ? `#${prNumber}` : "";
  const labelBase = suffix ? `GitHub PR ${suffix}` : "GitHub PR";
  return {
    message: `${prefix}: ${labelBase}`,
    link: {
      href: htmlUrl,
      label: `${labelBase} 열기`,
    },
  };
}

export function editableListKey(scope: string, index: number, nestedIndex?: number): string {
  return nestedIndex === undefined ? `${scope}:${index}` : `${scope}:${index}:${nestedIndex}`;
}

export function hasDirtySection(dirtySections: AdminUxSectionKey[], section: AdminUxSectionKey): boolean {
  return dirtySections.includes(section);
}

export function markDirtySection(dirtySections: AdminUxSectionKey[], section: AdminUxSectionKey): AdminUxSectionKey[] {
  if (dirtySections.includes(section)) return dirtySections;
  return [...dirtySections, section];
}

export function clearDirtySection(dirtySections: AdminUxSectionKey[], section: AdminUxSectionKey): AdminUxSectionKey[] {
  return dirtySections.filter((item) => item !== section);
}

export function createImportAppliedState(): ImportAppliedState {
  return { projects: [], skills: [], starred: [] };
}

function mergeKeys(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing);
  const next = [...existing];
  for (const value of incoming) {
    const clean = value.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    next.push(clean);
  }
  return next;
}

export function markImportApplied(state: ImportAppliedState, scope: AdminImportScope, keys: string[]): ImportAppliedState {
  return {
    ...state,
    [scope]: mergeKeys(state[scope], keys),
  };
}

export function clearImportApplied(state: ImportAppliedState, scope: AdminImportScope): ImportAppliedState {
  return {
    ...state,
    [scope]: [],
  };
}

export function isImportApplied(state: ImportAppliedState, scope: AdminImportScope, key: string): boolean {
  return state[scope].includes(key.trim());
}
