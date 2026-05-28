import type { ProjectCategory, ProjectEntry, ProjectFocus, ProjectMetric, ProjectProofLevel } from "@/content";
import type { Locale } from "./i18nContent";

export type ProjectFilter = "all" | ProjectCategory | "research" | "tool";

export const PROJECT_FILTERS: ProjectFilter[] = ["all", "career", "toy", "research", "tool"];

export function filterProjects(projects: ProjectEntry[], filter: ProjectFilter): ProjectEntry[] {
  if (filter === "all") return projects;
  if (filter === "career" || filter === "toy") return projects.filter((project) => project.category === filter);
  return projects.filter((project) => project.focus === filter);
}

export function projectFilterLabel(filter: ProjectFilter, locale: Locale): string {
  const labels: Record<ProjectFilter, Record<Locale, string>> = {
    all: { ko: "전체", en: "All" },
    career: { ko: "커리어", en: "Career" },
    toy: { ko: "토이", en: "Toy" },
    research: { ko: "연구/실험", en: "Research" },
    tool: { ko: "도구", en: "Tool" },
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
