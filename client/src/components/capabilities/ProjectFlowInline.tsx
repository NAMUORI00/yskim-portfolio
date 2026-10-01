/*
 * 홈 프로젝트 "자세히 보기" 안의 흐름 도식 (ProjectInsightPanel 과 함께 지연 로딩)
 * - 흐름 하나를 레인 도식으로 그리고, 펼치면 단계가 차례로 켜지며 데이터가 다음 모듈로 넘어가는 모습을 한 번 재생합니다.
 *   끝나면 마지막 단계(결과)의 설명이 남고, 단계를 누르거나 화살표 키로 옮기면 그 단계의 설명만 바뀝니다.
 * - 조작은 흐름 고르기(흐름이 여럿일 때) · 재생 · 넓게 보기 세 가지뿐입니다.
 * - "넓게 보기"는 같은 흐름과 같은 재생 상태를 CapabilityFlowWideView 대화상자에서 크게 보여 줍니다(처음 누를 때 불러옴).
 *   닫으면 넓게 보기 단추로 초점이 돌아옵니다.
 */
import { lazy, Suspense, useId, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import type { ProjectEntry } from "@/content";
import type { PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { LazyBoundary } from "@/components/LazyBoundary";
import { pick } from "./capabilityModel";
import type { FlowView } from "./capabilityFlowModel";
import { INLINE_STEP_MS } from "./flowPlayback";
import { FlowCaption, FlowStage, FlowTabs, JOURNEY_COPY, PlayButton } from "./FlowJourneyView";
import { useJourney } from "./useFlowPlayer";

export { INLINE_STEP_MS };

const CapabilityFlowWideView = lazy(() => import("./CapabilityFlowWideView"));

const COPY = {
  ko: {
    wide: "넓게 보기",
    wideAria: (name: string) => `넓게 보기: ${name}`,
    wideError: "넓게 보기를 불러오지 못했습니다. 페이지를 새로 고친 뒤 다시 시도해 주세요.",
  },
  en: {
    wide: "Wide view",
    wideAria: (name: string) => `Wide view: ${name}`,
    wideError: "The wide view could not be loaded. Please reload the page and try again.",
  },
} as const;

export interface ProjectFlowInlineProps {
  wideMode?: boolean;
  project: ProjectEntry;
  flows: FlowView[];
  /** 지금 보여 줄 흐름 (흐름 고르기는 바깥에서 관리합니다) */
  flow: FlowView;
  onFlowChange: (key: string) => void;
  T: PortfolioTheme;
  locale: Locale;
  /** 넓게 보기 머리말에 다시 쓰는 프로젝트 한 문장 */
  lead: string;
}

export function ProjectFlowInline({ project, flows, flow, onFlowChange, T, locale, lead, wideMode = false }: ProjectFlowInlineProps) {
  const copy = COPY[locale];
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const journey = useJourney(flow.nodes.length, flow.key, true, INLINE_STEP_MS);
  const [wideMounted, setWideMounted] = useState(false);
  const [wideOpen, setWideOpen] = useState(false);
  const wideRef = useRef<HTMLButtonElement>(null);
  const multiple = flows.length > 1;
  const selectedIndex = Math.max(0, flows.indexOf(flow));
  const title = flow.title ? pick(flow.title, locale) : JOURNEY_COPY[locale].defaultTitle;

  return (
    <figure className="fj-fig" aria-label={`${project.name} — ${title}`}>
      <div className="fj-bar">
        {multiple && <FlowTabs flows={flows} selectedKey={flow.key} onSelect={onFlowChange} locale={locale} idBase={idBase} />}
        <div className="fj-tools">
          <PlayButton journey={journey} locale={locale} />
          {!wideMode && <button
            ref={wideRef}
            type="button"
            className="fj-btn"
            aria-label={copy.wideAria(project.name)}
            onClick={() => {
              setWideMounted(true);
              setWideOpen(true);
            }}
          >
            <Maximize2 size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
            <span>{copy.wide}</span>
          </button>}
        </div>
      </div>
      <div {...(multiple ? { role: "tabpanel", id: `${idBase}-panel`, "aria-labelledby": `${idBase}-tab-${selectedIndex}` } : {})}>
        {/* 넓게 보기가 열려 있는 동안 뒤의 작은 도식은 데이터 이동을 멈춥니다 (재생 상태는 함께 씁니다). */}
        <FlowStage flow={flow} journey={journey} locale={locale} mode={wideMode ? "wide" : "compact"} title={title} dormant={wideOpen} />
      </div>
      <FlowCaption flow={flow} locale={locale} />
      {wideMounted && (
        <LazyBoundary
          fallback={
            <p className="fj-error" role="alert">
              {copy.wideError}
            </p>
          }
        >
          <Suspense fallback={null}>
            <CapabilityFlowWideView
              open={wideOpen}
              onOpenChange={setWideOpen}
              project={project}
              flows={flows}
              flowKey={flow.key}
              onFlowKeyChange={onFlowChange}
              T={T}
              locale={locale}
              returnFocusRef={wideRef}
              journey={journey}
              lead={lead}
            />
          </Suspense>
        </LazyBoundary>
      )}
    </figure>
  );
}
