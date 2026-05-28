import type { ProjectCategory, ProjectEntry, ProjectFocus, ProjectMetric, ProjectProofLevel } from "@/content";
import type { Locale } from "./i18nContent";

export type ProjectFilter = "all" | ProjectCategory | ProjectFocus;
export type ProjectFilterAxis = "category" | "focus";
export type ProjectFilterValue = ProjectCategory | ProjectFocus;

export interface ProjectFilterSelection {
  category: ProjectCategory[];
  focus: ProjectFocus[];
}

export interface ProjectYearBucket {
  year: string;
  count: number;
}

export const PROJECT_FILTERS: ProjectFilter[] = ["all", "career", "toy", "research", "product", "tool", "experiment"];

export function filterProjects(projects: ProjectEntry[], filter: ProjectFilter): ProjectEntry[] {
  if (filter === "all") return projects;
  if (filter === "career" || filter === "toy") return projects.filter((project) => project.category === filter);
  return projects.filter((project) => project.focus === filter);
}

export function createProjectFilterSelection(): ProjectFilterSelection {
  return { category: [], focus: [] };
}

export function clearProjectFilters(): ProjectFilterSelection {
  return createProjectFilterSelection();
}

export function hasActiveProjectFilters(filters: ProjectFilterSelection): boolean {
  return filters.category.length > 0 || filters.focus.length > 0;
}

export function isProjectFilterActive(filters: ProjectFilterSelection, axis: ProjectFilterAxis, value: ProjectFilterValue): boolean {
  return (filters[axis] as ProjectFilterValue[]).includes(value);
}

export function toggleProjectFilter(filters: ProjectFilterSelection, axis: ProjectFilterAxis, value: ProjectFilterValue): ProjectFilterSelection {
  const current = filters[axis] as ProjectFilterValue[];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return { ...filters, [axis]: next } as ProjectFilterSelection;
}

export function filterProjectsBySelection(projects: ProjectEntry[], filters: ProjectFilterSelection): ProjectEntry[] {
  return projects.filter((project) => (
    (filters.category.length === 0 || filters.category.includes(project.category)) &&
    (filters.focus.length === 0 || filters.focus.includes(project.focus))
  ));
}

function projectFilterAxis(filter: ProjectFilter): ProjectFilterAxis | null {
  if (filter === "all") return null;
  if (filter === "career" || filter === "toy") return "category";
  return "focus";
}

export function isProjectFilterSelected(filters: ProjectFilterSelection, filter: ProjectFilter): boolean {
  const axis = projectFilterAxis(filter);
  if (!axis) return !hasActiveProjectFilters(filters);
  const value = filter as ProjectFilterValue;
  return isProjectFilterActive(filters, axis, value);
}

export function toggleProjectFilterChip(filters: ProjectFilterSelection, filter: ProjectFilter): ProjectFilterSelection {
  const axis = projectFilterAxis(filter);
  if (!axis) return clearProjectFilters();
  const value = filter as ProjectFilterValue;
  return toggleProjectFilter(filters, axis, value);
}

export function projectFilterLabel(filter: ProjectFilter, locale: Locale): string {
  const labels: Record<ProjectFilter, Record<Locale, string>> = {
    all: { ko: "전체 표시", en: "Show all" },
    career: { ko: "커리어", en: "Career" },
    toy: { ko: "토이", en: "Toy" },
    research: { ko: "연구/실험", en: "Research" },
    product: { ko: "제품/서비스", en: "Product" },
    tool: { ko: "도구", en: "Tool" },
    experiment: { ko: "실험", en: "Experiment" },
  };
  return labels[filter][locale];
}

export function projectCategoryLabel(category: ProjectCategory, locale: Locale): string {
  const labels: Record<ProjectCategory, Record<Locale, string>> = {
    career: { ko: "커리어", en: "Career" },
    toy: { ko: "토이", en: "Toy" },
  };
  return labels[category][locale];
}

export function projectFocusLabel(focus: ProjectFocus, locale: Locale): string {
  const labels: Record<ProjectFocus, Record<Locale, string>> = {
    research: { ko: "연구/실험", en: "Research" },
    product: { ko: "제품/서비스", en: "Product" },
    tool: { ko: "도구", en: "Tool" },
    experiment: { ko: "실험", en: "Experiment" },
  };
  return labels[focus][locale];
}

export function projectProofLevelLabel(proofLevel: ProjectProofLevel, locale: Locale): string {
  const labels: Record<ProjectProofLevel, Record<Locale, string>> = {
    core: { ko: "핵심 증거", en: "Core evidence" },
    supporting: { ko: "보조 증거", en: "Supporting evidence" },
    exploration: { ko: "탐색", en: "Exploration" },
  };
  return labels[proofLevel][locale];
}

export function projectYearLabel(project: Pick<ProjectEntry, "period">, locale: Locale): string {
  const year = project.period.match(/20\d{2}/)?.[0];
  if (year) return year;
  if (/진행|current|ongoing|now/i.test(project.period)) return locale === "en" ? "Now" : "진행 중";
  return locale === "en" ? "Other" : "기타";
}

export function projectYearBuckets(projects: ProjectEntry[], locale: Locale): ProjectYearBucket[] {
  const buckets = new Map<string, number>();
  projects.forEach((project) => {
    const year = projectYearLabel(project, locale);
    buckets.set(year, (buckets.get(year) ?? 0) + 1);
  });
  return Array.from(buckets.entries()).map(([year, count]) => ({ year, count }));
}

export function hasProjectOverflow(projects: ProjectEntry[], visibleCount: number): boolean {
  return projects.length > visibleCount;
}

export function projectEvidenceMetrics(project: ProjectEntry): ProjectMetric[] {
  const structured = project.metrics.filter((metric) => metric.label.trim() && metric.value.trim());
  if (structured.length > 0) return structured;
  const legacyMetric = project.metric.trim();
  if (!legacyMetric) return [];
  return [{ label: "성과", value: legacyMetric }];
}

export function projectEvaluationRows(project: ProjectEntry, locale: Locale): Array<{ label: string; value: string }> {
  const labels = {
    baseline: locale === "en" ? "Baseline" : "기준",
    dataset: locale === "en" ? "Dataset" : "데이터셋",
    method: locale === "en" ? "Method" : "검증 방식",
  };
  return [
    { label: labels.baseline, value: project.evaluation.baseline ?? "" },
    { label: labels.dataset, value: project.evaluation.dataset ?? "" },
    { label: labels.method, value: project.evaluation.method ?? "" },
  ].filter((row) => row.value.trim());
}
