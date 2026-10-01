/*
 * CapabilityAtlas — "기술로 할 수 있는 일" 리디자인 (로컬 시안)
 * ─────────────────────────────────────────────────────────────
 * 읽는 순서 (progressive disclosure):
 *   1. 여섯 영역의 한 줄 요약  — 채용 담당자가 10초 안에 훑는 층
 *   2. 입력 → 작업 → 결과 흐름 — 무엇을 어떻게 만드는지 이해하는 층
 *   3. 직접 수행한 프로젝트    — 맡은 역할과 기록으로 확인하는 층
 *   4. 사용 기술 (접힘)        — 키워드가 필요한 사람을 위한 층
 * 데스크톱: 세로 탭 + 상세 패널 / 태블릿: 2열 탭 + 패널 / 모바일: 아코디언
 */
import { useCallback, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, CodeXml } from "lucide-react";
import type { PortfolioContent, ProjectEntry, SkillGroup } from "@/content";
import { FONT_MONO, FONT_SANS, type PortfolioTheme } from "@/content/theme";
import { useIsMobile } from "@/hooks/useMobile";
import type { Locale } from "@/lib/i18nContent";
import { projectProofLevelLabel } from "@/lib/projectEvidence";
import {
  CAPABILITIES,
  LANGUAGE_SOURCE_LABEL,
  capabilitiesForProject,
  findSkillGroup,
  isItemUsed,
  pick,
  projectRoleText,
  resolveProofProjects,
  tagsUsedInProjects,
  type CapabilityDefinition,
  type CapabilityId,
  type Localized,
} from "./capabilityModel";
import "./capabilities.css";

const COPY = {
  eyebrow: { ko: "Capabilities", en: "Capabilities" },
  title: { ko: "기술로 할 수 있는 일", en: "What I can build with technology" },
  lead: {
    ko: "여섯 가지 영역마다 무엇을 받아, 어떤 작업을 거쳐, 무엇을 만들었는지 정리했습니다. 각 영역은 직접 수행한 프로젝트로 이어집니다.",
    en: "For each of six areas: what goes in, what work happens, and what comes out — each linked to projects I carried out myself.",
  },
  statAreas: { ko: "역량 영역", en: "Areas" },
  statProjects: { ko: "연결된 프로젝트", en: "Linked projects" },
  tablist: { ko: "역량 영역 선택", en: "Choose a capability area" },
  flowTitle: { ko: "작업 흐름", en: "How the work flows" },
  flowHint: { ko: "무엇을 받아 → 어떻게 처리해 → 무엇을 만드는지", en: "What goes in → what I do → what comes out" },
  input: { ko: "입력", en: "Input" },
  work: { ko: "작업", en: "Work" },
  output: { ko: "결과", en: "Output" },
  proofTitle: { ko: "직접 수행한 프로젝트", en: "Projects that show it" },
  record: { ko: "기록", en: "Record" },
  alsoShows: { ko: "함께 보여주는 영역", en: "Also shows" },
  openProject: { ko: "프로젝트 상세 보기", en: "Open project details" },
  stackShow: { ko: "사용 기술 펼쳐 보기", en: "Show technologies" },
  stackHide: { ko: "사용 기술 접기", en: "Hide technologies" },
  legendUsed: { ko: "위 프로젝트에서 사용", en: "Used in the projects above" },
  legendOther: { ko: "이 영역의 그 밖의 기술", en: "Other tools in this area" },
  projectsCount: { ko: "프로젝트", en: "projects" },
} satisfies Record<string, Localized>;

type FlowKey = "input" | "work" | "output";
const FLOW_KEYS: FlowKey[] = ["input", "work", "output"];

export function capabilityThemeVars(T: PortfolioTheme): CSSProperties {
  return {
    "--ca-bg": T.bg,
    "--ca-surface": T.surface,
    "--ca-border": T.border,
    "--ca-text": T.text,
    "--ca-sub": T.sub,
    "--ca-muted": T.muted,
    "--ca-green": T.green,
    "--ca-green-light": T.greenLight,
    "--ca-green-bg": T.greenBg,
    "--ca-font-sans": FONT_SANS,
    "--ca-font-mono": FONT_MONO,
  } as CSSProperties;
}

interface ResolvedCapability {
  def: CapabilityDefinition;
  index: number;
  group: SkillGroup | null;
  projects: ProjectEntry[];
}

function twoDigit(value: number): string {
  return String(value).padStart(2, "0");
}

/* ── 탭 / 아코디언 트리거의 공통 내용 ── */
function CapabilityTriggerBody({ item, locale, withChevron }: { item: ResolvedCapability; locale: Locale; withChevron?: boolean }) {
  const Icon = item.def.icon;
  const keywords = item.group?.items ?? [];
  const preview = keywords.slice(0, 4).join(" · ");
  const rest = keywords.length - 4;
  return (
    <>
      <span className="ca-tab-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="ca-tab-body">
        <span className="ca-tab-top">
          <span className="ca-tab-title">{pick(item.def.title, locale)}</span>
          <span className="ca-tab-num" aria-hidden="true">{twoDigit(item.index + 1)}</span>
        </span>
        <span className="ca-tab-summary">{pick(item.def.summary, locale)}</span>
        {preview && (
          <span className="ca-tab-keys">
            {preview}
            {rest > 0 ? ` +${rest}` : ""}
          </span>
        )}
      </span>
      {withChevron && <ChevronDown className="ca-chevron ca-tab-chevron" size={18} aria-hidden="true" />}
    </>
  );
}

/* ── 입력 → 작업 → 결과 ── */
function CapabilityFlow({ def, locale, headingId }: { def: CapabilityDefinition; locale: Locale; headingId: string }) {
  return (
    <section className="ca-block" aria-labelledby={headingId}>
      <h4 className="ca-block-title" id={headingId}>
        <span>{pick(COPY.flowTitle, locale)}</span>
        <small>{pick(COPY.flowHint, locale)}</small>
      </h4>
      <ol className="ca-flow">
        {FLOW_KEYS.map((key, stepIndex) => (
          <li key={key} className={`ca-step ca-step--${key}`}>
            <span className="ca-step-head">
              <span className="ca-step-index" aria-hidden="true">{stepIndex + 1}</span>
              <span className="ca-step-label">{pick(COPY[key], locale)}</span>
            </span>
            <ul>
              {def.flow[key].map((entry) => (
                <li key={entry.ko}>{pick(entry, locale)}</li>
              ))}
            </ul>
            {stepIndex < FLOW_KEYS.length - 1 && (
              <span className="ca-step-arrow" aria-hidden="true">
                <ArrowRight size={18} strokeWidth={2} />
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── 근거 프로젝트 행 ── */
function ProofRow({ project, current, locale }: { project: ProjectEntry; current: CapabilityId; locale: Locale }) {
  const others = capabilitiesForProject(project.slug).filter((capability) => capability.id !== current);
  const record = project.metric.trim();
  return (
    <li className="ca-proof-item">
      <a className="ca-proof-link" href={`/projects/${project.slug}`}>
        <span className="ca-proof-aside">
          <span className="ca-proof-period">{project.period}</span>
          {project.proofLevel === "core" && <span className="ca-proof-badge">{projectProofLevelLabel("core", locale)}</span>}
        </span>
        <span className="ca-proof-main">
          <span className="ca-proof-name">{project.name}</span>
          <span className="ca-proof-role">{projectRoleText(project)}</span>
          <span className="ca-proof-meta">
            {record && (
              <span className="ca-proof-record">
                <span className="ca-proof-record-label">{pick(COPY.record, locale)}</span>
                <span>{record}</span>
              </span>
            )}
            {others.length > 0 && (
              <span className="ca-proof-also">
                <span className="ca-proof-also-label">{pick(COPY.alsoShows, locale)}</span>
                {others.map((capability) => {
                  const OtherIcon = capability.icon;
                  const title = pick(capability.title, locale);
                  return (
                    <span key={capability.id} className="ca-mini-icon" title={title}>
                      <OtherIcon size={13} strokeWidth={1.9} aria-hidden="true" />
                      <span className="ca-sr">{title}</span>
                    </span>
                  );
                })}
              </span>
            )}
          </span>
        </span>
        <span className="ca-proof-arrow" aria-hidden="true">
          <ArrowUpRight size={18} strokeWidth={1.9} />
        </span>
        <span className="ca-sr">{` — ${pick(COPY.openProject, locale)}`}</span>
      </a>
    </li>
  );
}

/* ── 사용 기술 (점진적 공개) ── */
function TechStack({ item, locale, open, onToggle }: { item: ResolvedCapability; locale: Locale; open: boolean; onToggle: () => void }) {
  const bodyId = useId();
  const items = item.group?.items ?? [];
  const used = useMemo(() => tagsUsedInProjects(item.projects), [item.projects]);
  const usedCount = items.filter((entry) => isItemUsed(entry, used)).length;
  if (items.length === 0) return null;
  return (
    <div className="ca-stack">
      <button type="button" className="ca-stack-toggle" aria-expanded={open} aria-controls={bodyId} onClick={onToggle}>
        <span>
          {pick(open ? COPY.stackHide : COPY.stackShow, locale)}
          <span className="ca-stack-count">{items.length}</span>
        </span>
        <ChevronDown className="ca-chevron" size={18} aria-hidden="true" />
      </button>
      <div id={bodyId} className="ca-stack-body" hidden={!open}>
        {item.group && <p className="ca-stack-source">{item.group.label}</p>}
        {usedCount > 0 && (
          <ul className="ca-legend">
            <li><span className="ca-chip-dot is-used" aria-hidden="true" />{pick(COPY.legendUsed, locale)}</li>
            <li><span className="ca-chip-dot" aria-hidden="true" />{pick(COPY.legendOther, locale)}</li>
          </ul>
        )}
        <ul className="ca-chips">
          {items.map((entry) => {
            const isUsed = usedCount > 0 && isItemUsed(entry, used);
            return (
              <li key={entry} className={`ca-chip${isUsed ? " is-used" : ""}`}>
                {usedCount > 0 && <span className={`ca-chip-dot${isUsed ? " is-used" : ""}`} aria-hidden="true" />}
                {entry}
                {isUsed && <span className="ca-sr">{` (${pick(COPY.legendUsed, locale)})`}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ── 상세 패널 ── */
function CapabilityDetail({
  item,
  total,
  locale,
  showHeading,
  stackOpen,
  onToggleStack,
}: {
  item: ResolvedCapability;
  total: number;
  locale: Locale;
  showHeading: boolean;
  stackOpen: boolean;
  onToggleStack: () => void;
}) {
  const baseId = useId();
  const Icon = item.def.icon;
  return (
    <div className="ca-detail">
      {showHeading && (
        <header className="ca-detail-head">
          <span className="ca-detail-icon" aria-hidden="true">
            <Icon size={24} strokeWidth={1.75} />
          </span>
          <div>
            <p className="ca-detail-kicker">{`${twoDigit(item.index + 1)} / ${twoDigit(total)}`}</p>
            <h3 className="ca-detail-title">{pick(item.def.title, locale)}</h3>
          </div>
        </header>
      )}

      <CapabilityFlow def={item.def} locale={locale} headingId={`${baseId}-flow`} />

      {item.projects.length > 0 && (
        <section className="ca-block" aria-labelledby={`${baseId}-proof`}>
          <h4 className="ca-block-title" id={`${baseId}-proof`}>
            <span>{pick(COPY.proofTitle, locale)}</span>
            <small>{`${item.projects.length} ${pick(COPY.projectsCount, locale)}`}</small>
          </h4>
          <ul className="ca-proof-list">
            {item.projects.map((project) => (
              <ProofRow key={project.slug} project={project} current={item.def.id} locale={locale} />
            ))}
          </ul>
        </section>
      )}

      <TechStack item={item} locale={locale} open={stackOpen} onToggle={onToggleStack} />
    </div>
  );
}

/* ════════════════════════════
   CapabilityAtlas
════════════════════════════ */
export function CapabilityAtlas({
  T,
  locale,
  content,
  sourceSkills,
}: {
  T: PortfolioTheme;
  locale: Locale;
  /** 현지화된 콘텐츠 */
  content: PortfolioContent;
  /** 원본(한국어) skills — 그룹 매칭 기준 */
  sourceSkills: SkillGroup[];
}) {
  const isMobile = useIsMobile();
  const baseId = useId();
  const [active, setActive] = useState<CapabilityId | null>(CAPABILITIES[0].id);
  const [openStacks, setOpenStacks] = useState<Set<CapabilityId>>(() => new Set());
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const items = useMemo<ResolvedCapability[]>(
    () =>
      CAPABILITIES.map((def, index) => ({
        def,
        index,
        group: findSkillGroup(sourceSkills, content.skills, def.sourceLabel),
        projects: resolveProofProjects(def.proofSlugs, content.projects),
      })),
    [content.projects, content.skills, sourceSkills],
  );
  const languageGroup = useMemo(
    () => findSkillGroup(sourceSkills, content.skills, LANGUAGE_SOURCE_LABEL),
    [content.skills, sourceSkills],
  );
  const linkedProjectCount = useMemo(() => new Set(items.flatMap((item) => item.projects.map((project) => project.slug))).size, [items]);

  const desktopActive = items.find((item) => item.def.id === active) ?? items[0];

  const toggleStack = useCallback((id: CapabilityId) => {
    setOpenStacks((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(items[next].def.id);
    tabRefs.current[next]?.focus();
  };

  const tabId = (id: CapabilityId) => `${baseId}-tab-${id}`;
  const panelId = (id: CapabilityId) => `${baseId}-panel-${id}`;

  return (
    <section className="ca" style={capabilityThemeVars(T)} aria-labelledby={`${baseId}-title`}>
      <header className="ca-head">
        <div>
          <p className="ca-eyebrow">{pick(COPY.eyebrow, locale)}</p>
          <h2 className="ca-title" id={`${baseId}-title`}>{pick(COPY.title, locale)}</h2>
          <p className="ca-lead">{pick(COPY.lead, locale)}</p>
        </div>
        <dl className="ca-stats">
          <div className="ca-stat">
            <dt>{pick(COPY.statAreas, locale)}</dt>
            <dd>{twoDigit(items.length)}</dd>
          </div>
          <div className="ca-stat">
            <dt>{pick(COPY.statProjects, locale)}</dt>
            <dd>{twoDigit(linkedProjectCount)}</dd>
          </div>
        </dl>
      </header>

      {isMobile ? (
        <div className="ca-accordion">
          {items.map((item) => {
            const open = active === item.def.id;
            return (
              <div key={item.def.id} className={`ca-acc-item${open ? " is-open" : ""}`}>
                <h3 className="ca-acc-heading">
                  <button
                    type="button"
                    id={tabId(item.def.id)}
                    className="ca-tab ca-acc-trigger"
                    aria-expanded={open}
                    aria-controls={panelId(item.def.id)}
                    onClick={() => setActive(open ? null : item.def.id)}
                  >
                    <CapabilityTriggerBody item={item} locale={locale} withChevron />
                  </button>
                </h3>
                <div
                  id={panelId(item.def.id)}
                  role="region"
                  aria-labelledby={tabId(item.def.id)}
                  className="ca-acc-panel"
                  hidden={!open}
                >
                  {open && (
                    <CapabilityDetail
                      item={item}
                      total={items.length}
                      locale={locale}
                      showHeading={false}
                      stackOpen={openStacks.has(item.def.id)}
                      onToggleStack={() => toggleStack(item.def.id)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ca-layout">
          <div className="ca-tablist" role="tablist" aria-label={pick(COPY.tablist, locale)} aria-orientation="vertical">
            {items.map((item, index) => {
              const selected = desktopActive.def.id === item.def.id;
              return (
                <button
                  key={item.def.id}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={tabId(item.def.id)}
                  className="ca-tab"
                  aria-selected={selected}
                  aria-controls={panelId(item.def.id)}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(item.def.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                >
                  <CapabilityTriggerBody item={item} locale={locale} />
                </button>
              );
            })}
          </div>
          <div
            className="ca-panel"
            role="tabpanel"
            id={panelId(desktopActive.def.id)}
            aria-labelledby={tabId(desktopActive.def.id)}
            tabIndex={0}
          >
            <CapabilityDetail
              key={desktopActive.def.id}
              item={desktopActive}
              total={items.length}
              locale={locale}
              showHeading
              stackOpen={openStacks.has(desktopActive.def.id)}
              onToggleStack={() => toggleStack(desktopActive.def.id)}
            />
          </div>
        </div>
      )}

      {languageGroup && languageGroup.items.length > 0 && (
        <div className="ca-langs">
          <p className="ca-langs-label">
            <CodeXml size={15} strokeWidth={1.8} aria-hidden="true" />
            {languageGroup.label}
          </p>
          <ul className="ca-langs-list">
            {languageGroup.items.map((language) => (
              <li key={language}>{language}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default CapabilityAtlas;
