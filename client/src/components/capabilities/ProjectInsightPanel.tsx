/*
 * 홈 프로젝트 "자세히 보기" 패널 본문 — 처음 펼칠 때 지연 로딩합니다.
 * 스마트팜 운영 콘솔 첫 화면처럼 한 문장 → 흐름 도식 하나(고른 단계 설명은 도식 옆) 순서로 보여 줍니다.
 * 비교 · 구현한 모듈 · 출처와 한계 · 소개 전문은 도식 아래 단추로 하나씩만 엽니다 (처음에는 모두 닫힘, 겹쳐 펼치지 않음).
 * 문장은 projectInsights.ts, 도식은 capabilityFlowModel.ts 의 흐름(기록·코드·설명용)을 그대로 씁니다.
 * 기록이 짧은 프로젝트는 도식과 비교 대신 기록된 범위만 적습니다.
 */
import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProjectEntry } from "@/content";
import { toMarkdownHtml } from "@/content/markdown";
import type { PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { pick, type Localized } from "./capabilityModel";
import { flowViewsFor, type FlowView } from "./capabilityFlowModel";
import { flowThemeVars } from "./FlowJourneyView";
import { insightFor, type ComparisonBasis, type ProjectInsight } from "./projectInsights";
import { ProjectFlowInline } from "./ProjectFlowInline";
import "./projectInsight.css";

export const INSIGHT_COPY = {
  ko: {
    more: "더 알아보기",
    compare: "비교",
    modules: "구현한 모듈",
    source: "출처와 한계",
    full: "소개 전문",
    basis: {
      source: "프로젝트 기록에 적힌 비교",
      illustrative: "이해를 위한 비교 예시",
      split: "가져다 쓴 것과 직접 만든 것",
      team: "팀원 작업과 내 작업",
    } satisfies Record<ComparisonBasis, string>,
    illustrativeNote: "실제 이전 구현이나 실험 기준이 아니라, 차이를 설명하기 위한 예시입니다.",
    sides: {
      source: ["대신한 방식", "이 연구"],
      illustrative: ["비교 기준", "이 프로젝트"],
      split: ["가져다 쓴 것", "직접 만든 것"],
      team: ["팀원 작업", "내 작업"],
    } satisfies Record<ComparisonBasis, readonly [string, string]>,
    sparse: "기록 범위",
    limits: "한계",
  },
  en: {
    more: "More about this project",
    compare: "Comparison",
    modules: "Modules I built",
    source: "Source and limits",
    full: "Full write-up",
    basis: {
      source: "Comparison from the project record",
      illustrative: "Illustrative comparison",
      split: "What I used vs. what I built",
      team: "Teammates' part vs. mine",
    } satisfies Record<ComparisonBasis, string>,
    illustrativeNote: "Not a former implementation or an experimental baseline — an example to explain the difference.",
    sides: {
      source: ["Approach replaced", "This study"],
      illustrative: ["Point of comparison", "This project"],
      split: ["Used", "Built"],
      team: ["Teammates", "Mine"],
    } satisfies Record<ComparisonBasis, readonly [string, string]>,
    sparse: "What the record covers",
    limits: "Limitations",
  },
} as const;

type Copy = (typeof INSIGHT_COPY)[Locale];
type MoreId = "compare" | "modules" | "source" | "full";

export interface ProjectInsightPanelProps {
  project: ProjectEntry;
  T: PortfolioTheme;
  locale: Locale;
}

function Comparisons({ insight, copy, text }: { insight: ProjectInsight; copy: Copy; text: (value: Localized) => string }) {
  return (
    <>
      {insight.comparisons.map((comparison) => {
        const [beforeKicker, afterKicker] = copy.sides[comparison.basis];
        const joined = comparison.basis === "split" || comparison.basis === "team";
        return (
          <div key={comparison.topic.ko} className={`pi-cmp is-${comparison.basis}`}>
            <p className="pi-cmp-head">
              <b className="pi-cmp-topic">{text(comparison.topic)}</b>
              <span className="pi-basis">{copy.basis[comparison.basis]}</span>
            </p>
            <div className="pi-cmp-grid">
              <div className="pi-cmp-side">
                <span className="pi-cmp-kicker">{beforeKicker}</span>
                <b className="pi-cmp-title">{text(comparison.before.title)}</b>
                <p className="pi-cmp-text">{text(comparison.before.text)}</p>
              </div>
              <span className="pi-cmp-arrow" aria-hidden="true">
                {joined ? "+" : "→"}
              </span>
              <div className="pi-cmp-side is-after">
                <span className="pi-cmp-kicker">{afterKicker}</span>
                <b className="pi-cmp-title">{text(comparison.after.title)}</b>
                <p className="pi-cmp-text">{text(comparison.after.text)}</p>
              </div>
            </div>
            {comparison.basis === "illustrative" && <p className="pi-cmp-note">{copy.illustrativeNote}</p>}
            {comparison.note && <p className="pi-cmp-note">{text(comparison.note)}</p>}
          </div>
        );
      })}
    </>
  );
}

function Source({ flow, copy, text }: { flow: FlowView; copy: Copy; text: (value: Localized) => string }) {
  return (
    <>
      <p className="pi-src-title">{text(flow.source.summary)}</p>
      <dl className="pi-src-list">
        {flow.source.items.map((item) => (
          <div key={item.term.ko}>
            <dt>{text(item.term)}</dt>
            <dd>{text(item.text)}</dd>
          </div>
        ))}
      </dl>
      {flow.source.limits.length > 0 && (
        <>
          <p className="pi-src-title is-limits">{copy.limits}</p>
          <ul className="pi-src-limits">
            {flow.source.limits.map((limit) => (
              <li key={limit.ko}>{text(limit)}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function ProjectInsightPanel({ project, T, locale }: ProjectInsightPanelProps) {
  const copy = INSIGHT_COPY[locale];
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const insight = insightFor(project.slug);
  const flows = useMemo(() => (insight?.sparse ? [] : flowViewsFor(project.slug)), [insight, project.slug]);
  const [flowKey, setFlowKey] = useState(() => flows[0]?.key ?? "");
  const [open, setOpen] = useState<MoreId | null>(null);
  const vars = useMemo(() => flowThemeVars(T), [T]);
  const text = (value: Localized) => pick(value, locale);
  const flow = flows.find((item) => item.key === flowKey) ?? flows[0] ?? null;
  const lead = insight ? text(insight.enables) : project.desc;
  const bodyHtml = useMemo(() => (open === "full" ? toMarkdownHtml(project.body) : ""), [open, project.body]);

  const options: Array<{ id: MoreId; label: string }> = [];
  if (insight && insight.comparisons.length > 0) options.push({ id: "compare", label: copy.compare });
  if (insight && insight.modules.length > 0) options.push({ id: "modules", label: copy.modules });
  if (flow) options.push({ id: "source", label: copy.source });
  if (project.body.trim()) options.push({ id: "full", label: copy.full });
  const panelId = `${base}-more`;

  return (
    <div className="pi" style={vars}>
      <p className="pi-lead">{lead}</p>

      {flow ? (
        <ProjectFlowInline project={project} flows={flows} flow={flow} onFlowChange={setFlowKey} T={T} locale={locale} lead={lead} />
      ) : (
        insight?.sparse && (
          <p className="pi-sparse">
            <b>{copy.sparse}</b> {text(insight.sparse)}
          </p>
        )
      )}

      {options.length > 0 && (
        <div className="pi-more">
          <div className="pi-more-row" role="group" aria-label={copy.more}>
            {options.map((option) => (
              <button
                key={option.id}
                id={`${base}-more-${option.id}`}
                type="button"
                className="pi-more-btn"
                aria-expanded={open === option.id}
                aria-controls={panelId}
                onClick={() => setOpen((current) => (current === option.id ? null : option.id))}
              >
                <span>{option.label}</span>
                <ChevronDown size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
              </button>
            ))}
          </div>
          <div id={panelId} className={`pi-more-body${open ? ` is-${open}` : ""}`} role="region" aria-labelledby={open ? `${base}-more-${open}` : undefined} hidden={!open}>
            {open === "compare" && insight && <Comparisons insight={insight} copy={copy} text={text} />}
            {open === "modules" && insight && (
              <ul className="pi-mods">
                {insight.modules.map((module) => (
                  <li key={module.name.ko}>
                    <b>{text(module.name)}</b>
                    <span>{text(module.role)}</span>
                  </li>
                ))}
              </ul>
            )}
            {open === "source" && flow && <Source flow={flow} copy={copy} text={text} />}
            {open === "full" && <article className="project-detail-body markdown-body pi-full" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
          </div>
        </div>
      )}
    </div>
  );
}
