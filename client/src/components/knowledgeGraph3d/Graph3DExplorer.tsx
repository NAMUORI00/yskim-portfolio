/*
 * 3D 지식 지도 넓게 보기 — 레일과 같은 두 가지 보기(지식의 구 ↔ 펼친 분야)를 큰 대화상자에서 봅니다.
 * - 레일·서랍과 같은 상태(보기 · 펼친 분야 · 고정)를 함께 씁니다: 레일에서 펼친 분야는 펼친 채로 열리고, 여기서 바꾼 것은 레일에도 남습니다.
 * - 전체 보기: 끌기·Shift+화살표·단추로 돌리고 휠·두 손가락·+/−로 확대합니다. 확대할수록 지식 이름이 더해집니다.
 * - 펼친 분야: 종류별 층 그림이 길면 그림만 스크롤합니다. 설명 칸에는 연결마다의 근거와 (한국어) 원문 문장까지 적습니다.
 * - Esc: 고정한 것이 있으면 고정만 풀고, 펼친 분야면 전체 보기로, 전체 보기면 창을 닫고 연 단추로 초점을 돌려줍니다.
 * - 대화상자(지도 + 도구 줄 + 설명 칸)가 하나의 영역입니다. 포인터가 이 영역을 떠나 약 3초가 지나면 전체 보기로 돌아옵니다
 *   (키보드 초점이 안에 있으면 그대로). 닫으면 시계를 지웁니다.
 * - 목록 보기는 같은 내용을 분야별 글로 보여 주고, 그동안 지도는 멈춥니다. 움직임 켬/끔은 레일과 같은 설정입니다.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useId, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { Minus, Plus, RotateCcw, RotateCw, X } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/capabilities/useFlowPlayer";
import type { PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { mapThemeVars, useElementSize } from "@/components/knowledgeMap/KnowledgeMapCanvas";
import { CANVAS_PADDING, useCoarsePointer } from "./Graph3DCanvas";
import { Graph3DDetail, KindGlyph } from "./Graph3DDetail";
import { Graph3DMotionToggle } from "./Graph3DMotionToggle";
import { Graph3DStage } from "./Graph3DStage";
import { graph3dCopy } from "./graph3dCopy";
import { nodesInOrder, type DomainId, type KnowledgeGraph } from "./graph3dModel";
import { fitView, type Layout3D } from "./graph3dLayout";
import type { ExploreState } from "./useGraph3DExplore";
import { useExploreAnnouncement } from "./useGraph3DInteraction";
import { useMotionSetting } from "./useGraph3DMotion";
import { useGraph3DWidget, ZOOM_STEP } from "./useGraph3DWidget";

type ViewMode = "space" | "list";

const ROTATE_STEP = 0.42;

/** 목록 보기 — 분야마다 근거가 있는 지식을 먼저, 관심·스택 목록은 따로 */
export function Graph3DOutline({
  graph,
  locale,
  openedId,
  selectedId,
  onOpenDomain,
  onPick,
}: {
  graph: KnowledgeGraph;
  locale: Locale;
  openedId: DomainId | null;
  selectedId: string | null;
  onOpenDomain: (domain: DomainId) => void;
  onPick: (id: string) => void;
}) {
  const copy = graph3dCopy(locale);
  return (
    <div className="km-outline kg3-outline">
      {graph.domains.map((domain) => {
        const members = nodesInOrder(graph, domain.members);
        const groups = [members.filter((node) => node.status === "evidenced"), members.filter((node) => node.status !== "evidenced")];
        return (
          <section key={domain.id} aria-label={domain.title}>
            <h3>
              <button type="button" className="km-outline-item kg3-outline-field" aria-pressed={openedId === domain.id} onClick={() => onOpenDomain(domain.id)}>
                {domain.title}
              </button>{" "}
              <b>{domain.evidenced}</b>
            </h3>
            {groups.map((items, index) =>
              items.length ? (
                <div key={index} className="kg3-outline-group" data-open={index === 1 ? "true" : undefined}>
                  {index === 1 && <p className="kg3-outline-note">{copy.outlineOpen}</p>}
                  <ul>
                    {items.map((node) => (
                      <li key={node.id}>
                        <button type="button" className="km-outline-item" data-kind={node.kind} aria-pressed={selectedId === node.id} onClick={() => onPick(node.id)}>
                          <KindGlyph kind={node.kind} open={node.status !== "evidenced"} />
                          {node.title}
                        </button>
                        {node.status === "evidenced" && (
                          <span className="kg3-outline-status">
                            {[node.built && copy.statuses.built, node.studied && copy.statuses.studied].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </section>
        );
      })}
    </div>
  );
}

export interface Graph3DExplorerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graph: KnowledgeGraph;
  layout: Layout3D;
  T: PortfolioTheme;
  locale: Locale;
  identity: string;
  /** 레일·서랍과 함께 쓰는 상태 */
  explore: ExploreState;
  setExplore: Dispatch<SetStateAction<ExploreState>>;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function Graph3DExplorer({ open, onOpenChange, graph, layout, T, locale, identity, explore, setExplore, returnFocusRef }: Graph3DExplorerProps) {
  const copy = graph3dCopy(locale);
  const reduced = usePrefersReducedMotion();
  const motion = useMotionSetting();
  const coarse = useCoarsePointer();
  const vars = useMemo(() => mapThemeVars(T, T.surface), [T]);
  const [mode, setMode] = useState<ViewMode>("space");
  const [stageRef, stage] = useElementSize<HTMLDivElement>({ width: 760, height: 560 });
  const view = useMemo(() => fitView(layout, stage.width, stage.height, CANVAS_PADDING.explorer), [layout, stage.width, stage.height]);
  const widget = useGraph3DWidget({ graph, layout, view, explore, setExplore, externalId: null, reduced, active: mode === "space", allowZoom: true });
  const { view3d, interaction, attention, orbit } = widget;
  const announcement = useExploreAnnouncement(graph, explore, locale);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const hintId = useId();
  const attentionRef = attention.ref;
  const setContent = useCallback(
    (element: HTMLDivElement | null) => {
      contentRef.current = element;
      attentionRef(element);
    },
    [attentionRef],
  );
  const overview = explore.mode === "overview";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="km-dialog-overlay" style={vars} />
        <Dialog.Content
          ref={setContent}
          className="km-root km-dialog kg3-dialog"
          style={vars}
          data-mode={explore.mode}
          data-return-pending={attention.pending ? "true" : undefined}
          onOpenAutoFocus={(event) => {
            const root = contentRef.current;
            const target = root?.querySelector<HTMLElement>('.kg3-dv [data-item-id][tabindex="0"]') ?? root?.querySelector<HTMLElement>('.kg3-globe [data-target-id][tabindex="0"]');
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            // 고정이 있으면 고정만, 펼친 분야면 전체 보기로 — 창은 전체 보기에서만 닫습니다.
            if (widget.escape()) event.preventDefault();
          }}
        >
          <header className="kg3-dialog-head">
            <div>
              <p className="km-kicker">{copy.kicker}</p>
              <Dialog.Title className="kg3-dialog-title">{copy.explorerTitle}</Dialog.Title>
              <Dialog.Description className="kg3-dialog-desc">{copy.explorerDesc}</Dialog.Description>
            </div>
            <Dialog.Close className="km-dialog-close" aria-label={copy.close} title={copy.close}>
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </header>
          <div className="km-dialog-toolbar kg3-toolbar">
            <div className="km-segment" role="group" aria-label={copy.viewGroup}>
              {(["space", "list"] as const).map((item) => (
                <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>
                  {copy.views[item]}
                </button>
              ))}
            </div>
            <Graph3DMotionToggle setting={motion} locale={locale} />
            {mode === "space" && overview && (
              <>
                <div className="km-tools">
                  <button type="button" className="km-tool" onClick={() => widget.rotate(-ROTATE_STEP)} aria-label={copy.rotateLeft} title={copy.rotateLeft}>
                    <RotateCcw size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="km-tool" onClick={() => widget.rotate(ROTATE_STEP)} aria-label={copy.rotateRight} title={copy.rotateRight}>
                    <RotateCw size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="km-tool" onClick={() => widget.zoomBy(1 / ZOOM_STEP)} aria-label={copy.zoomOut} title={copy.zoomOut}>
                    <Minus size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="km-tool" onClick={() => widget.zoomBy(ZOOM_STEP)} aria-label={copy.zoomIn} title={copy.zoomIn}>
                    <Plus size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="km-tool km-tool-text" onClick={() => view3d.resetCamera()}>
                    {copy.resetView}
                  </button>
                </div>
                <p className="km-hint km-dialog-hint">{copy.explorerHint}</p>
              </>
            )}
          </div>
          <div className="km-dialog-body">
            {/* 목록 보기에서도 지도 자리는 남겨 두어(숨김) 크기 측정이 끊기지 않게 합니다. */}
            <div ref={stageRef} className="kg3-stage" hidden={mode === "list"} data-mode={explore.mode} data-dragging={orbit.dragging ? "true" : undefined}>
              <Graph3DStage
                graph={graph}
                layout={layout}
                view={view}
                variant="explorer"
                locale={locale}
                identity={identity}
                mode={explore.mode}
                pinnedId={explore.pinnedId}
                camera={view3d.camera}
                shown={view3d.shown}
                unfold={view3d.unfold}
                focus={interaction}
                hoverId={interaction.hoverId}
                rovingId={interaction.rovingId}
                emphasis={null}
                motion={motion.enabled}
                paused={mode === "list"}
                moving={widget.moving}
                density="rich"
                coarse={coarse}
                describedBy={hintId}
                dragGuard={orbit.moved}
                hadFocus={attention.hadFocus}
                globeRef={orbit.ref}
                globeHandlers={orbit.handlers}
                onHover={interaction.setHover}
                onKeyboardFocus={interaction.setKeyboard}
                onRove={interaction.setRovingId}
                onOpen={widget.open}
                onBack={widget.back}
                onTogglePin={interaction.togglePin}
                onUnpin={widget.unpin}
                onCameraKey={widget.cameraKey}
                onZoomKey={widget.zoomKey}
              />
              <p id={hintId} className="km-sr">
                {copy.hint} {copy.explorerHint}
              </p>
            </div>
            {mode === "list" && (
              <div className="km-dialog-list">
                <Graph3DOutline graph={graph} locale={locale} openedId={explore.domain} selectedId={explore.pinnedId} onOpenDomain={widget.open} onPick={widget.pick} />
              </div>
            )}
            <aside className="km-dialog-inspector">
              <Graph3DDetail
                graph={graph}
                mode={explore.mode}
                domainId={explore.domain}
                focusId={interaction.focusId}
                pinnedId={explore.pinnedId}
                locale={locale}
                identity={identity}
                rich
                onPick={widget.pick}
                onOpenDomain={widget.open}
                onUnpin={widget.unpin}
              />
            </aside>
          </div>
          <p className="km-sr" aria-live="polite">
            {announcement}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
