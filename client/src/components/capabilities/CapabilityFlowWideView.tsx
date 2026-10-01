/*
 * 넓게 보기 — 자세히 보기의 흐름 도식을 큰 대화상자에서 보여 줍니다 (지연 로딩, 공개 홈 첫 화면 번들에 들어가지 않음).
 * - 머리말: 프로젝트 이름과 한 문장. 본문: 같은 흐름 도식을 크게, 고른 단계의 설명은 도식 옆에 둡니다.
 *   넓은 설명에는 코드·기록에서 확인한 처리 설명, 요청·응답 형식, 전달 경로까지 담습니다.
 * - 자세히 보기에서 열면 그 재생 상태(지금 단계, 재생 중인지)를 그대로 이어 씁니다.
 * - Esc·닫기 단추로 닫히고, 닫히면 연 단추로 초점이 돌아갑니다 (Radix Dialog).
 */
import * as Dialog from "@radix-ui/react-dialog";
import { useId, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { X } from "lucide-react";
import type { ProjectEntry } from "@/content";
import { DARK, type PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { ARCHITECTURES } from "./capabilityArchitectures";
import { pick } from "./capabilityModel";
import type { FlowView } from "./capabilityFlowModel";
import { INLINE_STEP_MS } from "./flowPlayback";
import { FlowCaption, FlowStage, FlowTabs, flowThemeVars, JOURNEY_COPY, PlayButton } from "./FlowJourneyView";
import { useJourney, type Journey } from "./useFlowPlayer";
import "./capabilityFlowWide.css";

const COPY = {
  ko: { wideView: "넓게 보기", close: "닫기" },
  en: { wideView: "Wide view", close: "Close" },
} as const;

export interface CapabilityFlowWideViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectEntry;
  flows: FlowView[];
  flowKey: string;
  onFlowKeyChange: (key: string) => void;
  T: PortfolioTheme;
  locale: Locale;
  /** 닫힌 뒤 초점을 돌려줄 단추 */
  returnFocusRef: RefObject<HTMLElement | null>;
  /** 자세히 보기의 재생 상태 — 없으면 대화상자가 따로 재생합니다 */
  journey?: Journey;
  /** 머리말 한 문장 (없으면 프로젝트 목적 또는 설명) */
  lead?: string;
}

function dialogVars(T: PortfolioTheme): CSSProperties {
  const dark = T.bg === DARK.bg;
  return {
    ...flowThemeVars(T),
    "--cf-scrim": dark ? "rgba(0, 0, 0, 0.66)" : "rgba(16, 20, 16, 0.5)",
    "--cf-shadow": dark ? "0 28px 90px rgba(0, 0, 0, 0.55)" : "0 28px 90px rgba(0, 0, 0, 0.26)",
  } as CSSProperties;
}

export default function CapabilityFlowWideView({ open, onOpenChange, project, flows, flowKey, onFlowKeyChange, T, locale, returnFocusRef, journey: shared, lead }: CapabilityFlowWideViewProps) {
  const copy = COPY[locale];
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const contentRef = useRef<HTMLDivElement>(null);
  const vars = useMemo(() => dialogVars(T), [T]);
  const flow = flows.find((item) => item.key === flowKey) ?? flows[0];
  // 자세히 보기에서 열지 않았을 때만 쓰는 재생 상태
  const own = useJourney(flow?.nodes.length ?? 0, flow?.key ?? "", open && !shared, INLINE_STEP_MS);
  const journey = shared ?? own;
  if (!flow) return null;

  const multiple = flows.length > 1;
  const selectedIndex = Math.max(0, flows.indexOf(flow));
  const title = flow.title ? pick(flow.title, locale) : JOURNEY_COPY[locale].defaultTitle;
  const purpose = ARCHITECTURES[project.slug]?.purpose;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cfw-overlay" style={vars} />
        <Dialog.Content
          ref={contentRef}
          className="cfw-dialog"
          style={vars}
          onOpenAutoFocus={(event) => {
            // 열리면 지금 설명 중인 단계에 초점을 둡니다 (화살표 키로 바로 옮길 수 있게).
            const step = contentRef.current?.querySelector<HTMLElement>('.fj-node[tabindex="0"]');
            if (step) {
              event.preventDefault();
              step.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            // 닫히면 이 창을 연 "넓게 보기" 단추로 초점을 돌려줍니다.
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <header className="cfw-head">
            <div className="cfw-head-main">
              <p className="cfw-kicker">{project.period ? `${copy.wideView} · ${project.period}` : copy.wideView}</p>
              <Dialog.Title className="cfw-title">{project.name}</Dialog.Title>
              <Dialog.Description className="cfw-desc">{lead ?? (purpose ? pick(purpose, locale) : project.desc)}</Dialog.Description>
            </div>
            <Dialog.Close className="cfw-close" aria-label={copy.close} title={copy.close}>
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </header>
          <div className="cfw-body">
            <figure className="fj-fig" aria-label={`${project.name} — ${title}`}>
              <div className="fj-bar">
                {multiple && <FlowTabs flows={flows} selectedKey={flow.key} onSelect={onFlowKeyChange} locale={locale} idBase={`${idBase}-w`} />}
                <div className="fj-tools">
                  <PlayButton journey={journey} locale={locale} />
                </div>
              </div>
              <div {...(multiple ? { role: "tabpanel", id: `${idBase}-w-panel`, "aria-labelledby": `${idBase}-w-tab-${selectedIndex}` } : {})}>
                <FlowStage flow={flow} journey={journey} locale={locale} mode="wide" title={title} />
              </div>
              <FlowCaption flow={flow} locale={locale} />
            </figure>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
