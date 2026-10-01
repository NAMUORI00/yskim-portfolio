/*
 * 홈 "논문·연구·경력" — content/education.json 의 기록을 성격별 묶음으로 나눠 보여 줍니다.
 *   논문(publication) · 연구 경험(research: 연구실 연구 참여) · 경력(work: 유급 근무)
 *   · 학력·수상·어학(education, award, milestone) · 기타 활동(talk, project — 기록이 있을 때만)
 * 묶음은 기록의 type 으로만 정하고, 제목·기관·기간·설명 문장은 원문을 그대로 씁니다.
 * 논문은 "학술지 · 상태 · 저자" 원문에서 상태(게재·발표 / 심사 중)를 떼어 표시만 바꿉니다.
 * 기록은 처음에 접혀 있고(제목, [상태] 기간 · 기관), 기록을 누르거나 '모두 펼치기'로 설명을 엽니다.
 */
import { useCallback, useState, type CSSProperties } from "react";
import { Briefcase, ChevronDown, ChevronsDownUp, ChevronsUpDown, FileText, FlaskConical, GraduationCap, Milestone } from "lucide-react";
import type { EducationEntry, ProjectEntry, TimelineEntryType, TimelineLink } from "@/content";
import { FONT_MONO, FONT_SANS, type PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import "./careerRecords.css";

export type CareerGroupId = "publications" | "research" | "employment" | "background" | "other";

/** 기록 종류 → 묶음. 연구실 학생연구원(research)은 유급 근무(work)와 다른 묶음에 둡니다. */
export const CAREER_GROUP_OF_TYPE: Record<TimelineEntryType, CareerGroupId> = {
  publication: "publications",
  research: "research",
  work: "employment",
  education: "background",
  award: "background",
  milestone: "background",
  talk: "other",
  project: "other",
};

const GROUP_ORDER: readonly CareerGroupId[] = ["publications", "research", "employment", "background", "other"];

const GROUP_ICON: Record<CareerGroupId, typeof FileText> = {
  publications: FileText,
  research: FlaskConical,
  employment: Briefcase,
  background: GraduationCap,
  other: Milestone,
};

export const CAREER_COPY = {
  ko: {
    groups: {
      publications: { title: "논문", note: "" },
      research: { title: "연구 경험", note: "연구실 연구 참여" },
      employment: { title: "경력", note: "유급 근무" },
      background: { title: "학력·수상·어학", note: "" },
      other: { title: "기타 활동", note: "" },
    },
    current: "진행 중",
    submitted: (period: string) => `${period} 투고`,
    expandAll: "모두 펼치기",
    collapseAll: "모두 접기",
    expandAllLabel: "논문·연구·경력 설명 모두 펼치기",
    collapseAllLabel: "논문·연구·경력 설명 모두 접기",
  },
  en: {
    groups: {
      publications: { title: "Publications", note: "" },
      research: { title: "Research Experience", note: "Lab research participation" },
      employment: { title: "Employment", note: "Paid positions" },
      background: { title: "Education, Awards & Languages", note: "" },
      other: { title: "Other Activities", note: "" },
    },
    current: "In progress",
    submitted: (period: string) => `Submitted ${period}`,
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    expandAllLabel: "Expand all research and experience details",
    collapseAllLabel: "Collapse all research and experience details",
  },
} as const;

export type CareerStatusKind = "published" | "review";

const REVIEW_STATUS = /심사|투고|under review|in review|submitted|revision/i;
const PUBLISHED_STATUS = /게재|발표|채택|published|presented|accepted|in press/i;

export interface PublicationSource {
  /** 학술지·학술대회와 저자 표기 (상태 조각만 뺀 원문 순서) */
  venue: string;
  status?: { label: string; kind: CareerStatusKind };
}

/** "학술지 · 상태 · 저자" 원문에서 상태(게재·발표 / 심사 중)를 떼어 냅니다. 상태를 찾지 못하면 원문을 그대로 둡니다. */
export function splitPublicationSource(source: string): PublicationSource {
  const parts = source.split(/\s+·\s+/).map((part) => part.trim()).filter(Boolean);
  // 첫 조각은 학술지·학술대회 이름이므로 상태로 읽지 않습니다.
  const statusIndex = parts.findIndex((part, index) => index > 0 && (REVIEW_STATUS.test(part) || PUBLISHED_STATUS.test(part)));
  if (statusIndex < 0) return { venue: source };
  const label = parts[statusIndex];
  return {
    venue: parts.filter((_, index) => index !== statusIndex).join(" · "),
    status: { label, kind: REVIEW_STATUS.test(label) ? "review" : "published" },
  };
}

export interface CareerChip {
  key: string;
  label: string;
  href?: string;
  kind: "link" | "project" | "skill";
  external?: boolean;
}

function normalizeChipLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hrefTail(href: string): string {
  try {
    const url = new URL(href, "https://namuori.net");
    const parts = url.pathname.split("/").filter(Boolean);
    return normalizeChipLabel(parts[parts.length - 1] ?? "");
  } catch {
    const parts = href.split(/[/?#]/)[0].split("/").filter(Boolean);
    return normalizeChipLabel(parts[parts.length - 1] ?? href);
  }
}

/** 홈에서는 기록을 모두 보여 주므로 CV 보관 페이지(/cv)로 가는 링크는 따로 달지 않습니다. */
function isCvArchiveHref(href: string): boolean {
  try {
    const url = new URL(href, "https://namuori.net");
    return url.pathname.replace(/\/+$/, "") === "/cv";
  } catch {
    return href.trim().replace(/\/+$/, "") === "/cv";
  }
}

function matchesProject(link: TimelineLink, project: Pick<ProjectEntry, "name" | "slug">): boolean {
  const label = normalizeChipLabel(link.label);
  const projectSlug = normalizeChipLabel(project.slug);
  return label === normalizeChipLabel(project.name) || label === projectSlug || hrefTail(link.href) === projectSlug;
}

/** 관련 프로젝트 → 외부 링크 → 기술(최대 5개) 순서로, 같은 이름은 한 번만 둡니다. */
export function careerChipItems(entry: EducationEntry, projects: Pick<ProjectEntry, "name" | "slug">[]): CareerChip[] {
  const relatedProjects = projects.filter((project) => entry.relatedProjects.includes(project.slug));
  const seen = new Set<string>();
  const items: CareerChip[] = [];
  const add = (item: CareerChip) => {
    const identity = `${item.kind}:${normalizeChipLabel(item.label)}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    items.push(item);
  };

  relatedProjects.forEach((project) => {
    add({ key: `project:${project.slug}`, kind: "project", label: project.name, href: `/projects/${project.slug}` });
  });
  entry.links
    .filter((link) => !isCvArchiveHref(link.href))
    .filter((link) => !relatedProjects.some((project) => matchesProject(link, project)))
    .forEach((link) => {
      add({ key: `link:${link.label}:${link.href}`, kind: "link", label: link.label, href: link.href, external: true });
    });
  entry.relatedSkills.slice(0, 5).forEach((skill) => {
    add({ key: `skill:${skill}`, kind: "skill", label: skill });
  });
  return items;
}

export interface CareerBadge {
  label: string;
  kind: CareerStatusKind | "current";
}

export interface CareerRecord {
  /** 공개 기록 목록 안의 순서로 만든 키 — 한국어·영어 전환 뒤에도 같은 기록을 가리킵니다. */
  key: string;
  entry: EducationEntry;
  title: string;
  period: string;
  org: string;
  badges: CareerBadge[];
  chips: CareerChip[];
  expandable: boolean;
}

export interface CareerGroup {
  id: CareerGroupId;
  records: CareerRecord[];
}

function careerRecord(entry: EducationEntry, index: number, projects: Pick<ProjectEntry, "name" | "slug">[], locale: Locale): CareerRecord {
  const copy = CAREER_COPY[locale];
  const publication = entry.type === "publication" ? splitPublicationSource(entry.school) : null;
  const status = publication?.status;
  const badges: CareerBadge[] = [];
  if (status) badges.push({ label: status.label, kind: status.kind });
  if (entry.current) badges.push({ label: copy.current, kind: "current" });
  // 심사 중인 논문의 날짜는 투고한 달이므로 그렇게 적습니다.
  const period = status?.kind === "review" && entry.period && !/투고|submit/i.test(entry.period) ? copy.submitted(entry.period) : entry.period;
  const chips = careerChipItems(entry, projects);
  return {
    key: `career-${index}`,
    entry,
    title: entry.degree,
    period,
    org: publication ? publication.venue : entry.school,
    badges,
    chips,
    expandable: Boolean(entry.note) || entry.bullets.length > 0 || chips.length > 0,
  };
}

/** 공개 기록을 묶음 순서(논문 → 연구 경험 → 경력 → 학력·수상·어학 → 기타)로 나눕니다. 묶음 안에서는 원래 순서를 지킵니다. */
export function buildCareerGroups(entries: EducationEntry[], projects: Pick<ProjectEntry, "name" | "slug">[], locale: Locale): CareerGroup[] {
  const byGroup = new Map<CareerGroupId, CareerRecord[]>();
  entries.forEach((entry, index) => {
    const id = CAREER_GROUP_OF_TYPE[entry.type] ?? "other";
    byGroup.set(id, [...(byGroup.get(id) ?? []), careerRecord(entry, index, projects, locale)]);
  });
  return GROUP_ORDER.flatMap((id) => {
    const records = byGroup.get(id) ?? [];
    return records.length > 0 ? [{ id, records }] : [];
  });
}

/**
 * 넓은 화면의 두 칸 배치: 논문은 위 한 줄, 왼쪽은 연구 경험과 학력·수상·어학, 오른쪽은 경력.
 * 경력이나 왼쪽 묶음이 없으면 null — 한 칸으로 둡니다.
 */
export function careerSplitAreas(ids: CareerGroupId[]): string | null {
  const present = new Set(ids);
  const left = (["research", "background"] as const).filter((id) => present.has(id));
  if (!present.has("employment") || left.length === 0) return null;
  const rows: string[] = present.has("publications") ? ['"publications publications"'] : [];
  for (const id of left) rows.push(`"${id} employment"`);
  return rows.join(" ");
}

export interface CareerRecordsState {
  groups: CareerGroup[];
  openKeys: ReadonlySet<string>;
  /** 펼칠 설명이 있는 기록이 하나라도 있는지 */
  canExpand: boolean;
  allOpen: boolean;
  setOpen: (key: string, open: boolean) => void;
  setAllOpen: (open: boolean) => void;
}

/** 묶음과 펼침 상태 — 섹션 제목 줄의 '모두 펼치기'와 목록이 같은 상태를 씁니다. */
export function useCareerRecords(entries: EducationEntry[], projects: Pick<ProjectEntry, "name" | "slug">[], locale: Locale): CareerRecordsState {
  const groups = buildCareerGroups(entries, projects, locale);
  const expandableKeys = groups.flatMap((group) => group.records.filter((record) => record.expandable).map((record) => record.key));
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(() => new Set<string>());
  const setOpen = useCallback((key: string, open: boolean) => {
    setOpenKeys((current) => {
      if (current.has(key) === open) return current;
      const next = new Set(current);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  return {
    groups,
    openKeys,
    canExpand: expandableKeys.length > 0,
    allOpen: expandableKeys.length > 0 && expandableKeys.every((key) => openKeys.has(key)),
    setOpen,
    setAllOpen: (open: boolean) => setOpenKeys(open ? new Set(expandableKeys) : new Set<string>()),
  };
}

function themeVars(T: PortfolioTheme): CSSProperties {
  return {
    "--cr-bg": T.bg,
    "--cr-surface": T.surface,
    "--cr-border": T.border,
    "--cr-text": T.text,
    "--cr-sub": T.sub,
    "--cr-muted": T.muted,
    "--cr-green": T.green,
    "--cr-green-bg": T.greenBg,
    "--cr-sans": FONT_SANS,
    "--cr-mono": FONT_MONO,
  } as CSSProperties;
}

export const CAREER_RECORDS_ID = "career-records";

/** 섹션 제목 줄 오른쪽의 '모두 펼치기 / 모두 접기' */
export function CareerExpandAllButton({ state, T, locale }: { state: CareerRecordsState; T: PortfolioTheme; locale: Locale }) {
  if (!state.canExpand) return null;
  const copy = CAREER_COPY[locale];
  const Icon = state.allOpen ? ChevronsDownUp : ChevronsUpDown;
  return (
    <button
      type="button"
      className="career-expand-all"
      style={themeVars(T)}
      aria-controls={CAREER_RECORDS_ID}
      aria-expanded={state.allOpen}
      aria-label={state.allOpen ? copy.collapseAllLabel : copy.expandAllLabel}
      onClick={() => state.setAllOpen(!state.allOpen)}
    >
      <Icon size={14} aria-hidden="true" />
      {state.allOpen ? copy.collapseAll : copy.expandAll}
    </button>
  );
}

function RecordHead({ record }: { record: CareerRecord }) {
  return (
    <span className="career-record-main">
      <span className="career-record-title">{record.title}</span>
      <span className="career-record-meta">
        {record.badges.map((badge) => (
          <span key={`${badge.kind}:${badge.label}`} className={`career-status is-${badge.kind}`}>
            {badge.label}
          </span>
        ))}
        {record.period && <span className="career-record-period">{record.period}</span>}
        {record.period && record.org && (
          <span className="career-record-sep" aria-hidden="true">
            ·
          </span>
        )}
        {record.org && <span className="career-record-org">{record.org}</span>}
      </span>
    </span>
  );
}

function RecordBody({ record }: { record: CareerRecord }) {
  const { entry, chips } = record;
  return (
    <div className="career-record-body">
      {entry.note && <p className="career-record-note">{entry.note}</p>}
      {entry.bullets.length > 0 && (
        <ul className="career-record-bullets">
          {entry.bullets.map((bullet, index) => (
            <li key={`${index}:${bullet}`}>{bullet}</li>
          ))}
        </ul>
      )}
      {chips.length > 0 && (
        <ul className="career-chips">
          {chips.map((chip) => (
            <li key={chip.key}>
              {chip.href ? (
                <a
                  className={`career-chip is-${chip.kind}`}
                  href={chip.href}
                  target={chip.external ? "_blank" : undefined}
                  rel={chip.external ? "noopener noreferrer" : undefined}
                >
                  {chip.label}
                </a>
              ) : (
                <span className={`career-chip is-${chip.kind}`}>{chip.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CareerRecords({ state, T, locale }: { state: CareerRecordsState; T: PortfolioTheme; locale: Locale }) {
  const copy = CAREER_COPY[locale];
  const areas = careerSplitAreas(state.groups.map((group) => group.id));
  return (
    <div id={CAREER_RECORDS_ID} className="career-records" style={themeVars(T)}>
      <div
        className={areas ? "career-ledger is-split" : "career-ledger"}
        style={areas ? ({ "--career-areas": areas } as CSSProperties) : undefined}
      >
        {state.groups.map((group) => {
          const Icon = GROUP_ICON[group.id];
          const groupCopy = copy.groups[group.id];
          const titleId = `career-group-${group.id}`;
          return (
            <div key={group.id} className="career-group" data-group={group.id} role="group" aria-labelledby={titleId}>
              <div className="career-group-head">
                <Icon className="career-group-icon" size={15} aria-hidden="true" />
                <h3 id={titleId} className="career-group-title">
                  {groupCopy.title}
                </h3>
                <span className="career-group-count">{group.records.length}</span>
                {groupCopy.note && <span className="career-group-note">{groupCopy.note}</span>}
              </div>
              <ul className="career-list">
                {group.records.map((record) => (
                  <li key={record.key} className="career-item">
                    {record.expandable ? (
                      <details
                        className="career-record"
                        open={state.openKeys.has(record.key)}
                        onToggle={(event) => state.setOpen(record.key, event.currentTarget.open)}
                      >
                        <summary className="career-record-head">
                          <RecordHead record={record} />
                          <ChevronDown className="career-record-chevron" size={16} aria-hidden="true" />
                        </summary>
                        <RecordBody record={record} />
                      </details>
                    ) : (
                      <div className="career-record">
                        <div className="career-record-head">
                          <RecordHead record={record} />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
