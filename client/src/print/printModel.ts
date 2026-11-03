import printData from "@content/print.json";
import { portfolioContent } from "@/content";
import type { EducationEntry, ProjectEntry } from "@/content/types";

export interface FlowNode {
  title: string;
  sub?: string;
  highlight?: boolean;
}

export interface FlowRow {
  label: string;
  nodes: FlowNode[];
}

export interface ResultRow {
  metric: string;
  baseline: string;
  before?: string;
  after: string;
}

export interface PrintProject {
  slug: string;
  title: string;
  status: string;
  summary: string;
  problem: string;
  approach: string;
  figure: {
    caption: string;
    rows: FlowRow[];
    boundary?: string;
    /** 흐름 중간 상자에서 아래로 빠지는 우회 경로 */
    fallback?: { row: number; node: number; title: string; text: string };
    /** 흐름 끝에서 갈라지는 결과 */
    outcomes?: { title: string; text: string }[];
    outcomeLabel?: string;
    /** 문장 단위 수정 예시 */
    example?: { changed: string; sentences: { sensor: string; before: string; after?: string }[] };
  };
  results: ResultRow[];
  scope?: string;
  paper?: string;
  repo?: string;
  evaluation?: { title: string; text: string }[];
  checks?: { title: string; env: string; text: string }[];
}

export type PrintData = Omit<typeof printData, "projects"> & { projects: PrintProject[] };

export const print = printData as unknown as PrintData;

/** 사이트 문구의 가운뎃점 구분을 인쇄본에서는 쉼표로 바꿉니다. */
export function plain(text: string): string {
  return text.replace(/\s*·\s*/g, ", ");
}

/** mdx 본문에서 "## 제목" 바로 아래 문단을 꺼냅니다. */
export function sectionText(body: string, heading: string): string {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim() === `## ${heading}`);
  if (start < 0) return "";
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    if (line.trim()) out.push(line.trim());
  }
  return out.join(" ");
}

export function projectBySlug(slug: string): ProjectEntry | undefined {
  return portfolioContent.projects.find(project => project.slug === slug);
}

/** 사이트에서 비공개로 둔 프로젝트는 인쇄본에도 저장소를 적지 않습니다. */
export function repoUrl(project: PrintProject): string {
  const source = projectBySlug(project.slug);
  if (source?.private) return "";
  return project.repo ?? source?.link ?? "";
}

/** 사이트 자기소개를 그대로 쓰되, print.json에서 인쇄본에서만 뺄 문장으로 정한 것은 덜어 냅니다. */
export function aboutParagraphs(): string[] {
  return portfolioContent.profile.summary
    .map(paragraph => print.about.omitSentences.reduce((text, sentence) => text.replace(sentence, ""), paragraph).trim())
    .filter(Boolean);
}

export function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const byType = (types: EducationEntry["type"][]) =>
  portfolioContent.education.filter(
    entry => types.includes(entry.type) && entry.status === "published"
  );

export const publications = () => byType(["publication"]);
export interface CareerRow {
  period: string;
  org: string;
  role: string;
}

/** 경력 줄. 같은 역할의 단기 활동(코딩교육 보조강사)은 한 줄로 묶습니다. */
export function careers(): CareerRow[] {
  const rows: CareerRow[] = [];
  for (const entry of byType(["research", "work"])) {
    const role = entry.degree.replace(/\s*\(단기\)$/, "");
    const same = rows.find(row => row.role === role && /보조강사/.test(role));
    if (same) {
      same.period = `${same.period}, ${entry.period}`;
      same.org = `${same.org}, ${plain(entry.school)}`;
      continue;
    }
    rows.push({
      period: entry.period.replace(" — ", " ~ "),
      org: plain(entry.school),
      role,
    });
  }
  return rows;
}
export const degrees = () => byType(["education"]);

/** 인쇄본의 프로젝트 쪽. print.json에 정리한 프로젝트는 그 문구로, 나머지는 사이트 원문으로 그립니다. */
export type PrintItem =
  | { kind: "curated"; slug: string; title: string; project: PrintProject }
  | { kind: "generic"; slug: string; title: string; project: ProjectEntry };

export function printItems(order?: string[]): PrintItem[] {
  const slugs =
    order && order.length > 0
      ? Array.from(new Set(order))
      : print.projects.map(p => p.slug);
  return slugs.flatMap((slug): PrintItem[] => {
    const curated = print.projects.find(p => p.slug === slug);
    if (curated)
      return [
        { kind: "curated", slug, title: curated.title, project: curated },
      ];
    const source = projectBySlug(slug);
    return source && source.status === "published"
      ? [{ kind: "generic", slug, title: source.name, project: source }]
      : [];
  });
}

/** 인쇄본 기본 구성(print.json의 프로젝트 순서). */
export function printDefaultProjects(): string[] {
  return print.projects.map(project => project.slug);
}

/** 사이트에서 저장소를 공개하지 않았지만 인쇄본에 정리해 둔 프로젝트. 제출용 공식 양식에는 넣지 않습니다. */
export function designOnlyProjects(): ProjectEntry[] {
  return print.projects.flatMap(item => {
    const source = projectBySlug(item.slug);
    return source && source.private && source.status === "published"
      ? [source]
      : [];
  });
}

/** 제출용 편집기(/insights)에서 고른 구성을 인쇄본으로 넘깁니다. 서버로 보내지 않고 이 탭에만 둡니다. */
export const PRINT_HANDOFF_KEY = "namuori:print-handoff";

export interface PrintHandoff {
  projects: string[];
  introduction: string;
}

export function writeHandoff(handoff: PrintHandoff): void {
  try {
    sessionStorage.setItem(PRINT_HANDOFF_KEY, JSON.stringify(handoff));
  } catch {
    // 저장소를 쓸 수 없으면 기본 구성으로 엽니다.
  }
}

export function readHandoff(): PrintHandoff | null {
  try {
    const raw = sessionStorage.getItem(PRINT_HANDOFF_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PrintHandoff>;
    return {
      projects: Array.isArray(data.projects) ? data.projects.map(String) : [],
      introduction:
        typeof data.introduction === "string" ? data.introduction : "",
    };
  } catch {
    return null;
  }
}

export interface Sheet {
  id: string;
  title: string;
}

/** 쪽 순서. 목차와 쪽 번호가 이 목록을 따릅니다. */
export function sheets(items: PrintItem[] = printItems()): Sheet[] {
  return [
    { id: "cover", title: "표지" },
    { id: "about", title: "자기소개와 이력" },
    { id: "research", title: print.research.title },
    ...items.map((item, index) => ({
      id: `project-${index + 1}`,
      title: item.title,
    })),
    { id: "engineering", title: print.engineering.title },
    { id: "undergraduate", title: print.undergraduate.title },
    { id: "records", title: "논문, 경력, 학력, 기술" },
  ];
}
