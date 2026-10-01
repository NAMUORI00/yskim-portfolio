/*
 * [더 이상 화면에 쓰지 않음] 이전 "기술로 할 수 있는 일" 섹션 시안입니다.
 * 흐름 도식은 홈 프로젝트 "자세히 보기"(ProjectInsightPanel · ProjectFlowInline)로 옮겼고,
 * 기술 섹션은 "기술 스택" 목록으로 바뀌었습니다. 정리 여부는 별도로 결정합니다.
 * 영역 필터 → 프로젝트마다 한 줄 흐름 요약(움직이지 않음) → "넓게 보기"를 누르면 큰 대화상자에서
 * 단계가 차례로 켜지고 단계마다 받은 것·처리·보낸 것을 봅니다. 실제 화면 기록이 있는 흐름은 "기록된 예시",
 * 저장소 코드에서 확인한 흐름은 "코드로 확인한 흐름", 소개 글만으로 그린 흐름은 "설명용 흐름"으로 구분합니다.
 * 스타일은 cfa-/cff-/cfm-/cfr- 접두사 안에서만 정의하며 홈 테마 값(T)과 폰트를 그대로 사용합니다.
 */
import { lazy, Suspense, useCallback, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, ChevronDown, Maximize2, Play } from "lucide-react";
import type { ProjectEntry, SkillGroup } from "@/content";
import { FONT_MONO, FONT_SANS, type PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { CAPABILITIES, LANGUAGE_SOURCE_LABEL, pick, projectRoleText, type CapabilityId, type Localized } from "./capabilityModel";
import { AREA_PROJECTS, ARCHITECTURES, type ProjectArchitecture } from "./capabilityArchitectures";
import { flowSentence, flowViewsFor, LANE_SHORT, type FlowView } from "./capabilityFlowModel";
import { SENSOR_TRACE_FACTS, SMARTFARM_SENSOR_TRACE } from "./capabilityRecordedTraces";
import "./capabilityFlow.css";

// 넓게 보기는 처음 열 때 불러옵니다 (공개 홈 첫 화면 번들에 넣지 않음).
const CapabilityFlowWideView = lazy(() => import("./CapabilityFlowWideView"));

interface Props {
  T: PortfolioTheme;
  locale: Locale;
  /** 현지화된 skills (홈과 동일) */
  skills: SkillGroup[];
  /** 원본(한국어) skills — 영역과 skill-capability-N 순서를 맞추는 기준 */
  sourceSkills: SkillGroup[];
  /** 게시된 프로젝트 (현지화) */
  projects: ProjectEntry[];
}

type AreaKey = "all" | CapabilityId;

interface WideTarget {
  slug: string;
  flowKey: string;
}

const COPY = {
  ko: {
    preview: "LOCAL PREVIEW · 로컬 확인용",
    intro:
      "프로젝트마다 흐름을 한 줄로 요약했습니다. '넓게 보기'를 누르면 단계가 차례로 켜지고, 단계마다 어떤 데이터를 어디에서 받아 어떻게 처리해 어디로 보내는지 보입니다. 실제 화면 기록을 옮긴 흐름은 '기록된 예시', 저장소 코드에서 확인한 흐름은 '코드로 확인한 흐름', 프로젝트 소개 글만으로 그린 흐름은 '설명용 흐름'으로 구분했습니다.",
    all: "전체",
    filterAria: "영역 필터",
    expandAll: "역할·기술 모두 펼치기",
    collapseAll: "역할·기술 모두 접기",
    overview: "개요 수준",
    overviewNote: "프로젝트 소개에 적힌 구성 요소만 담은 개요입니다. 자세한 내용은 프로젝트 페이지에서 볼 수 있습니다.",
    myRole: "맡은 역할",
    tech: "사용 기술",
    result: "결과",
    detail: "프로젝트 자세히 보기",
    roleTech: "역할·기술 보기",
    areaTech: (n: number) => `이 영역의 기술 전체 (${n})`,
    languages: "지원 언어",
    listAria: "프로젝트 흐름 목록",
    stripAria: (name: string) => `${name} 흐름 요약`,
    wide: "넓게 보기",
    wideAria: (name: string) => `넓게 보기: ${name}`,
    recordedIncluded: "기록된 예시 포함",
    recordedKind: "기록 재생",
    code: "코드로 확인한 흐름",
    codeKind: "코드 확인",
    explanatory: "설명용 흐름",
    explanatoryKind: "설명용",
    defaultFlowTitle: "작업 흐름",
    featuredBadge: "실제 동작 기록 · 시뮬레이터",
    featuredTitle: "스마트팜 운영 지원 시스템 · 센서 값이 서로 맞지 않을 때",
    featuredLead:
      "시뮬레이터의 A구역 재배실 온도 센서가 65.0°C를 보내자, 대시보드는 품질 검사에서 이 값을 판단에서 빼고 같은 구역의 근권 온도 16.0°C·상대 습도 72%와 교차 확인해 '센서 이상 의심'으로 표시했습니다. 화면에 실제로 나온 값만 그대로 재생합니다.",
    featuredReadings: "기록된 A구역 센서 값",
    featuredAction: "넓게 보기로 재생",
    featuredNote: "실제 농장이 아닌 시뮬레이터 기록입니다. 이 페이지는 대시보드나 모델을 호출하지 않습니다.",
    leftOut: "판단 제외",
  },
  en: {
    preview: "LOCAL PREVIEW",
    intro:
      "Each project's flow is summarised in one line. 'Wide view' lights the steps up one by one and shows, for each step, what data it receives and from where, how it processes it, and where it sends the result. Flows replayed from an actual screen record are marked 'Recorded example', flows traced in the repository code 'Traced in source code', and flows drawn only from the project write-up 'Explanatory flow'.",
    all: "All",
    filterAria: "Area filter",
    expandAll: "Expand all roles & tech",
    collapseAll: "Collapse all roles & tech",
    overview: "High-level overview",
    overviewNote: "An overview showing only the components described in the project write-up. See the project page for details.",
    myRole: "My role",
    tech: "Technologies",
    result: "Result",
    detail: "Read the project",
    roleTech: "Role & tech",
    areaTech: (n: number) => `All technologies in this area (${n})`,
    languages: "Supporting languages",
    listAria: "Project flows",
    stripAria: (name: string) => `${name} flow summary`,
    wide: "Wide view",
    wideAria: (name: string) => `Wide view: ${name}`,
    recordedIncluded: "Includes a recorded example",
    recordedKind: "Recorded replay",
    code: "Traced in source code",
    codeKind: "Traced in code",
    explanatory: "Explanatory flow",
    explanatoryKind: "Explanatory",
    defaultFlowTitle: "How it works",
    featuredBadge: "Actual run record · simulator",
    featuredTitle: "Smart-farm operations support · When sensors disagree",
    featuredLead:
      "When the simulator's Zone A room-temperature sensor sent 65.0°C, the dashboard's quality check left it out of the judgement, and a cross-check against the zone's 16.0°C root-zone temperature and 72% relative humidity flagged a suspect sensor. The replay uses only the values the screen actually showed.",
    featuredReadings: "Recorded Zone A readings",
    featuredAction: "Play in wide view",
    featuredNote: "A simulator record, not a real farm. This page calls no dashboard or model.",
    leftOut: "Left out",
  },
} as const;

type Copy = (typeof COPY)[Locale];

function themeVars(T: PortfolioTheme): CSSProperties {
  return {
    "--cf-bg": T.bg,
    "--cf-surface": T.surface,
    "--cf-border": T.border,
    "--cf-text": T.text,
    "--cf-sub": T.sub,
    "--cf-muted": T.muted,
    "--cf-green": T.green,
    "--cf-green-light": T.greenLight,
    "--cf-green-bg": T.greenBg,
    "--cf-red": T.red,
    "--cf-red-bg": T.redBg,
    "--cf-sans": FONT_SANS,
    "--cf-mono": FONT_MONO,
  } as CSSProperties;
}

/* ── 한 줄 흐름 요약 (정적) ── */
function MiniFlow({ flow, locale, label }: { flow: FlowView; locale: Locale; label: string }) {
  return (
    <ol className="cfm-strip" aria-label={label}>
      {flow.nodes.map((node, index) => (
        <li key={node.id} className="cfm-step">
          {index > 0 && (
            <span className="cfm-arrow" aria-hidden="true">
              →
            </span>
          )}
          <span className="cfm-chip">
            <span className="cfm-lane">{pick(LANE_SHORT[node.lane], locale)}</span>
            <span className="cfm-name">{pick(node.short ?? node.title, locale)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function flowTitle(flow: FlowView, copy: Copy, locale: Locale): string {
  return flow.title ? pick(flow.title, locale) : copy.defaultFlowTitle;
}

export function CapabilityFlowSection({ T, locale, skills, sourceSkills, projects }: Props) {
  const copy = COPY[locale];
  const text = (value: Localized) => pick(value, locale);
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [area, setArea] = useState<AreaKey>("all");
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set());
  const [wide, setWide] = useState<WideTarget | null>(null);
  const [wideOpen, setWideOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const projectBySlug = useMemo(() => new Map(projects.map((project) => [project.slug, project])), [projects]);
  const vars = useMemo(() => themeVars(T), [T]);

  const areas = useMemo(
    () =>
      CAPABILITIES.map((capability) => {
        const index = sourceSkills.findIndex((group) => group.label === capability.sourceLabel);
        const group = index >= 0 ? skills[index] ?? sourceSkills[index] : null;
        const slugs = Array.from(new Set(AREA_PROJECTS[capability.id])).filter((slug) => projectBySlug.has(slug) && ARCHITECTURES[slug]);
        return { capability, index, group, slugs };
      }),
    [projectBySlug, skills, sourceSkills],
  );

  const allSlugs = useMemo(() => {
    const ordered = Array.from(new Set(areas.flatMap((entry) => entry.slugs)));
    // 영역에 속하지 않은 게시 프로젝트도 "전체"에서 빠지지 않게 덧붙입니다.
    const rest = projects.map((project) => project.slug).filter((slug) => !ordered.includes(slug) && ARCHITECTURES[slug]);
    return [...ordered, ...rest];
  }, [areas, projects]);

  const flowsBySlug = useMemo(() => new Map(allSlugs.map((slug) => [slug, flowViewsFor(slug)])), [allSlugs]);

  const current = area === "all" ? null : areas.find((entry) => entry.capability.id === area) ?? null;
  const listSlugs = current ? current.slugs : allSlugs;
  const allOpen = listSlugs.length > 0 && listSlugs.every((slug) => openRows.has(slug));

  const languageIndex = sourceSkills.findIndex((group) => group.label === LANGUAGE_SOURCE_LABEL);
  const languages = languageIndex >= 0 ? skills[languageIndex] ?? sourceSkills[languageIndex] : null;

  const featuredProject = projectBySlug.get(SMARTFARM_SENSOR_TRACE.slug) ?? null;

  const toggleRow = (slug: string) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const setAllRows = (open: boolean) =>
    setOpenRows((prev) => {
      const next = new Set(prev);
      listSlugs.forEach((slug) => (open ? next.add(slug) : next.delete(slug)));
      return next;
    });

  const openWide = useCallback((slug: string, flowKey: string, trigger: HTMLElement) => {
    returnFocusRef.current = trigger;
    setWide({ slug, flowKey });
    setWideOpen(true);
  }, []);
  const changeWideFlow = useCallback((flowKey: string) => setWide((prev) => (prev ? { ...prev, flowKey } : prev)), []);

  const small: CSSProperties = { fontFamily: FONT_MONO, fontSize: "0.8125rem", letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted };
  const chip: CSSProperties = { fontFamily: FONT_MONO, fontSize: "0.8125rem", color: T.sub, border: `1px solid ${T.border}`, borderRadius: "3px", padding: "1px 6px", lineHeight: 1.6 };

  const filterButton = (key: AreaKey, label: string, count: number, id?: string) => {
    const on = area === key;
    return (
      <button
        key={key}
        id={id}
        type="button"
        aria-pressed={on}
        onClick={() => setArea(key)}
        style={{
          fontFamily: FONT_SANS,
          fontSize: "1rem",
          lineHeight: 1.4,
          cursor: "pointer",
          borderRadius: "3px",
          minHeight: "2.75rem",
          padding: "6px 12px",
          border: `1px solid ${on ? T.green : T.border}`,
          background: on ? T.greenBg : "transparent",
          color: on ? T.green : T.sub,
          scrollMarginTop: "2rem",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {label}
        <span style={{ fontFamily: FONT_MONO, fontSize: "0.8125rem", color: on ? T.green : T.muted }}>{count}</span>
      </button>
    );
  };

  /* ── 실제 기록 예시 (스마트팜) ── */
  const renderFeatured = () => {
    if (!featuredProject) return null;
    const trace = SMARTFARM_SENSOR_TRACE;
    const titleId = `${baseId}-featured`;
    return (
      <section className="cff" aria-labelledby={titleId}>
        <div className="cff-top">
          <span className="cfm-badge is-recorded">
            <span className="cfm-dot" aria-hidden="true" />
            {copy.featuredBadge}
          </span>
          <span className="cff-source">{text(trace.source.summary)}</span>
        </div>
        <h3 className="cff-title" id={titleId}>
          {copy.featuredTitle}
        </h3>
        <p className="cff-lead">{copy.featuredLead}</p>
        <ul className="cff-tiles" aria-label={copy.featuredReadings}>
          {SENSOR_TRACE_FACTS.readings.map((reading) => (
            <li key={reading.label.ko} className={`cff-tile${reading.doubtful ? " is-doubt" : ""}`}>
              <small>{text(reading.label)}</small>
              <b>
                {reading.value}
                <i>{reading.unit}</i>
              </b>
              {reading.doubtful && <em>{copy.leftOut}</em>}
            </li>
          ))}
        </ul>
        <MiniFlow flow={trace} locale={locale} label={copy.stripAria(flowTitle(trace, copy, locale))} />
        <div className="cff-actions">
          <button type="button" className="cfm-wide is-primary" onClick={(event) => openWide(trace.slug, trace.key, event.currentTarget)}>
            <Play size={14} aria-hidden="true" />
            {copy.featuredAction}
          </button>
          <span className="cff-note">{copy.featuredNote}</span>
        </div>
      </section>
    );
  };

  /* ── 프로젝트 한 줄 ── */
  const renderRow = (slug: string, order: number) => {
    const project = projectBySlug.get(slug);
    const arch: ProjectArchitecture | undefined = ARCHITECTURES[slug];
    const flows = flowsBySlug.get(slug) ?? [];
    if (!project || !arch || flows.length === 0) return null;
    const open = openRows.has(slug);
    const panelId = `${baseId}-panel-${slug}`;
    const recorded = flows.some((flow) => flow.evidence === "recorded");
    const traced = flows.some((flow) => flow.evidence === "code");
    const kindLabel = (flow: FlowView) => (flow.evidence === "recorded" ? copy.recordedKind : flow.evidence === "code" ? copy.codeKind : copy.explanatoryKind);
    return (
      <li key={slug} className="cfr">
        <span className="cfr-num" aria-hidden="true">
          {String(order + 1).padStart(2, "0")}
        </span>
        <div className="cfr-body">
          <div className="cfr-head">
            <div className="cfr-titles">
              <h3 className="cfr-name">{project.name}</h3>
              <p className="cfr-purpose">{text(arch.purpose)}</p>
            </div>
            <p className="cfr-badges">
              {recorded ? (
                <span className="cfm-badge is-recorded">
                  <span className="cfm-dot" aria-hidden="true" />
                  {copy.recordedIncluded}
                </span>
              ) : traced ? (
                <span className="cfm-badge is-code">
                  <span className="cfm-dot" aria-hidden="true" />
                  {copy.code}
                </span>
              ) : (
                <span className="cfm-badge is-explanatory">
                  <span className="cfm-dot" aria-hidden="true" />
                  {copy.explanatory}
                </span>
              )}
              {arch.scope === "overview" && <span className="cfm-badge is-overview">{copy.overview}</span>}
            </p>
          </div>

          <div className="cfr-flows">
            {flows.map((flow) => {
              const title = flowTitle(flow, copy, locale);
              const label = flows.length > 1 ? `${project.name} — ${title}` : project.name;
              return (
                <div key={flow.key} className="cfr-flow">
                  {flows.length > 1 && (
                    <p className="cfr-flow-title">
                      <span className={`cfm-kind is-${flow.evidence}`}>{kindLabel(flow)}</span>
                      {title}
                    </p>
                  )}
                  <div className="cfr-flow-line">
                    <MiniFlow flow={flow} locale={locale} label={copy.stripAria(label)} />
                    <button
                      type="button"
                      className="cfm-wide"
                      aria-label={copy.wideAria(label)}
                      title={flowSentence(flow, locale)}
                      onClick={(event) => openWide(slug, flow.key, event.currentTarget)}
                    >
                      <Maximize2 size={13} aria-hidden="true" />
                      {copy.wide}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cfr-foot">
            <button type="button" className="cfr-more" aria-expanded={open} aria-controls={panelId} onClick={() => toggleRow(slug)}>
              {copy.roleTech}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
            <a className="cfr-link" href={`/projects/${project.slug}`}>
              {copy.detail}
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </div>

          <div id={panelId} className="cfr-panel" role="region" aria-label={`${project.name} — ${copy.roleTech}`} hidden={!open}>
            <div>
              <p className="cfr-label">{copy.myRole}</p>
              <p className="cfr-text">{projectRoleText(project)}</p>
              {project.metric && (
                <>
                  <p className="cfr-label">{copy.result}</p>
                  <p className="cfr-text">{project.metric}</p>
                </>
              )}
              {arch.note && <p className="cfr-note">{text(arch.note)}</p>}
              {arch.scope === "overview" && <p className="cfr-note">{copy.overviewNote}</p>}
            </div>
            <div>
              <p className="cfr-label">{copy.tech}</p>
              <ul className="cfr-chips">
                {project.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </li>
    );
  };

  const wideProject = wide ? projectBySlug.get(wide.slug) ?? null : null;
  const wideFlows = wide ? flowsBySlug.get(wide.slug) ?? flowViewsFor(wide.slug) : [];

  return (
    <div className="cfa" style={{ ...vars, containerType: "inline-size", fontFamily: FONT_SANS }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
        <p style={{ margin: 0, flex: "1 1 22rem", fontSize: "1rem", color: T.sub, lineHeight: 1.7, wordBreak: "keep-all" }}>{copy.intro}</p>
        <span style={{ ...small, display: "inline-flex", alignItems: "center", gap: "5px", border: `1px solid ${T.border}`, borderRadius: "3px", padding: "1px 6px", whiteSpace: "nowrap" }}>
          <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: "50%", background: T.green }} />
          {copy.preview}
        </span>
      </div>

      {renderFeatured()}

      {/* ── 영역 필터 ── */}
      <div role="group" aria-label={copy.filterAria} style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {filterButton("all", copy.all, allSlugs.length)}
        {areas.map((entry) =>
          filterButton(entry.capability.id, text(entry.capability.title), entry.slugs.length, entry.index >= 0 ? `skill-capability-${entry.index}` : undefined),
        )}
      </div>

      {current && (
        <div style={{ marginTop: "0.65rem" }}>
          <p style={{ margin: 0, fontSize: "1rem", color: T.sub, lineHeight: 1.7, wordBreak: "keep-all" }}>{text(current.capability.summary)}</p>
          {current.group && (
            <details style={{ marginTop: "0.35rem" }}>
              <summary style={{ ...small, cursor: "pointer" }}>{copy.areaTech(current.group.items.length)}</summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: "0.4rem" }}>
                {current.group.items.map((item) => (
                  <span key={item} style={chip}>
                    {item}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── 프로젝트 흐름 목록 ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem", margin: "0.75rem 0 0.4rem" }}>
        <button
          type="button"
          onClick={() => setAllRows(!allOpen)}
          style={{ ...small, fontSize: "0.875rem", letterSpacing: "0.03em", textTransform: "none", cursor: "pointer", background: "transparent", border: `1px solid ${T.border}`, borderRadius: "3px", minHeight: "2.75rem", padding: "4px 12px", color: T.sub }}
        >
          {allOpen ? copy.collapseAll : copy.expandAll}
        </button>
      </div>
      <ul className="cfr-list" aria-label={copy.listAria}>
        {listSlugs.map((slug, order) => renderRow(slug, order))}
      </ul>

      {languages && (
        <div
          id={`skill-capability-${languageIndex}`}
          style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem", paddingTop: "0.65rem", marginTop: "0.8rem", borderTop: `1px solid ${T.border}`, scrollMarginTop: "2rem" }}
        >
          <span style={{ ...small, marginRight: "0.3rem" }}>{copy.languages}</span>
          {languages.items.map((item) => (
            <span key={item} style={chip}>
              {item}
            </span>
          ))}
        </div>
      )}

      {wide && wideProject && wideFlows.length > 0 && (
        <Suspense fallback={null}>
          <CapabilityFlowWideView
            open={wideOpen}
            onOpenChange={setWideOpen}
            project={wideProject}
            flows={wideFlows}
            flowKey={wide.flowKey}
            onFlowKeyChange={changeWideFlow}
            T={T}
            locale={locale}
            returnFocusRef={returnFocusRef}
          />
        </Suspense>
      )}
    </div>
  );
}
