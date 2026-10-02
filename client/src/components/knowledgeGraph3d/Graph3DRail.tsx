/*
 * 오른쪽 레일과 휴대폰 서랍의 3D 지식 지도 — /design/knowledge-graph-3d 미리보기에서만 HomeView 의 지식 그래프 자리에 끼웁니다.
 * - 레일: 처음에는 사람(가운데 이름 · 나의 지식)을 둘러싼 분야 8곳의 지식의 구. 처음 한 번 살짝 돌아오며 멈추고, 그 뒤에는
 *   은은하게 숨 쉬며 빈 곳을 가리키면 그쪽으로 살짝 돕니다(지도 아래의 "움직임" 단추로 끔, 움직임 줄이기면 처음부터 멈춤).
 *   분야를 누르거나 Enter 로 고르면 앞으로 데려와 종류별 층(2.5D)으로 펼치고, "전체 보기"·Esc 로 돌아옵니다.
 *   지도 + 설명 칸 + 단추를 하나의 영역으로 보고, 포인터가 영역을 떠나 약 3초가 지나면 접고 처음 시점으로 돌아옵니다
 *   (키보드 초점이 안에 있거나, 누르고 있거나, 터치일 때는 시간으로 돌아가지 않음 — useGraph3DAttention).
 *   홈 목록에서 프로젝트를 가리키면(전체 보기일 때만) 그 작업이 근거가 된 지식이 밝아집니다. 넓게 보기가 열려 있는 동안 레일은 멈춥니다.
 * - 서랍(768px 이하): 지식의 구를 작게(움직이지 않게) 보여 주고 단추로 넓게 보기를 엽니다 (조작은 넓게 보기에서, 닫으면 처음 보기로).
 * 레일의 폭·높이와 숨는 너비(1180px 이하)는 지금 레일과 같습니다 (#knowledge-rail 에 홈의 반응형 규칙이 그대로 걸림).
 */
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { portfolioContent, type PortfolioContent } from "@/content";
import type { Locale } from "@/lib/i18nContent";
import { usePrefersReducedMotion } from "@/components/capabilities/useFlowPlayer";
import { mapThemeVars, useElementSize } from "@/components/knowledgeMap/KnowledgeMapCanvas";
import type { KnowledgeMapSlotProps } from "@/components/knowledgeMap/KnowledgeMapRail";
import { CANVAS_PADDING, Graph3DCanvas } from "./Graph3DCanvas";
import { Graph3DDetail, KindGlyph } from "./Graph3DDetail";
import { Graph3DExplorer } from "./Graph3DExplorer";
import { Graph3DMotionToggle } from "./Graph3DMotionToggle";
import { Graph3DStage } from "./Graph3DStage";
import { graph3dCopy } from "./graph3dCopy";
import { buildKnowledgeGraph } from "./graph3dModel";
import { defaultCamera, fitView, layoutGraph3D, RAIL_ASPECT, type Emphasis3D } from "./graph3dLayout";
import { INITIAL_EXPLORE, type ExploreState } from "./useGraph3DExplore";
import { useExploreAnnouncement } from "./useGraph3DInteraction";
import { useMotionSetting } from "./useGraph3DMotion";
import { useGraph3DWidget } from "./useGraph3DWidget";

/** 읽고 있는 홈 섹션 → 전체 보기에서 살짝 드러낼 지식 (점만, 이름은 더하지 않음) */
export const SECTION_EMPHASIS: Partial<Record<string, Emphasis3D>> = {
  skills: "tech",
  research: "studied",
  education: "studied",
};

export function useGraph3DData(content: PortfolioContent, locale: Locale) {
  const graph = useMemo(() => buildKnowledgeGraph(portfolioContent, content, locale), [content, locale]);
  const layout = useMemo(() => layoutGraph3D(graph), [graph]);
  return { graph, layout };
}

export function KnowledgeGraph3DRail({ content, T, locale, active, focusNodeId }: KnowledgeMapSlotProps) {
  const copy = graph3dCopy(locale);
  const { graph, layout } = useGraph3DData(content, locale);
  const identity = content.profile.name;
  const reduced = usePrefersReducedMotion();
  const motion = useMotionSetting();
  const [explore, setExplore] = useState<ExploreState>(INITIAL_EXPLORE);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [frameRef, frame] = useElementSize<HTMLDivElement>({ width: 252, height: Math.round(252 * RAIL_ASPECT) });
  const view = useMemo(() => fitView(layout, frame.width, frame.height, CANVAS_PADDING.rail), [layout, frame.width, frame.height]);
  const widget = useGraph3DWidget({
    graph,
    layout,
    view,
    explore,
    setExplore,
    externalId: focusNodeId,
    reduced,
    active: !explorerOpen,
    suspended: explorerOpen,
    intro: true,
    allowZoom: false,
  });
  const { view3d, interaction, attention, orbit } = widget;
  const announcement = useExploreAnnouncement(graph, explore, locale);
  const vars = useMemo(() => mapThemeVars(T, T.sidebarBg), [T]);
  const expandRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const hintId = useId();
  const attentionRef = attention.ref;
  const setAside = useCallback(
    (element: HTMLElement | null) => {
      asideRef.current = element;
      attentionRef(element);
    },
    [attentionRef],
  );

  return (
    <aside
      ref={setAside}
      id="knowledge-rail"
      className="km-root km-rail kg3-rail"
      aria-label={copy.railLabel}
      style={vars}
      data-mode={explore.mode}
      data-domain={explore.domain ?? undefined}
      data-focus-id={interaction.focusId ?? ""}
      data-return-pending={attention.pending ? "true" : undefined}
      onKeyDown={(event) => {
        // 넓게 보기(포털)에서 올라온 키는 그쪽이 맡습니다.
        if (event.key !== "Escape" || !asideRef.current?.contains(event.target as Node)) return;
        if (widget.escape()) event.preventDefault();
      }}
    >
      <div className="km-head">
        <span className="km-kicker">{copy.kicker}</span>
        <button ref={expandRef} type="button" className="km-expand" aria-haspopup="dialog" aria-label={copy.expandLabel} onClick={() => setExplorerOpen(true)}>
          <Maximize2 size={12} aria-hidden="true" />
          {copy.expand}
        </button>
      </div>
      <p className="km-sub">{copy.subtitle}</p>
      <div ref={frameRef} className="kg3-frame" data-mode={explore.mode} data-dragging={orbit.dragging ? "true" : undefined}>
        {graph.nodes.length > 0 ? (
          <Graph3DStage
            graph={graph}
            layout={layout}
            view={view}
            variant="rail"
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
            emphasis={SECTION_EMPHASIS[active] ?? null}
            motion={motion.enabled}
            paused={explorerOpen}
            moving={widget.moving}
            density="quiet"
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
          />
        ) : (
          <p className="km-hint">{copy.emptyMap}</p>
        )}
      </div>
      <div className="kg3-foot">
        <Graph3DMotionToggle setting={motion} locale={locale} />
      </div>
      <p id={hintId} className="km-sr">
        {copy.hint}
      </p>
      <Graph3DDetail
        graph={graph}
        mode={explore.mode}
        domainId={explore.domain}
        focusId={interaction.focusId}
        pinnedId={explore.pinnedId}
        locale={locale}
        identity={identity}
        onPick={widget.pick}
        onOpenDomain={widget.open}
        onUnpin={widget.unpin}
      />
      <p className="km-sr" aria-live="polite">
        {announcement}
      </p>
      {explorerOpen && (
        <Graph3DExplorer
          open
          onOpenChange={setExplorerOpen}
          graph={graph}
          layout={layout}
          T={T}
          locale={locale}
          identity={identity}
          explore={explore}
          setExplore={setExplore}
          returnFocusRef={expandRef}
        />
      )}
    </aside>
  );
}

/** 휴대폰 서랍: 지식의 구를 작게 보여 주고 넓게 보기를 여는 단추만 둡니다 (닫으면 다음에 처음 보기로 엽니다). */
export function KnowledgeGraph3DDrawer({ content, T, locale }: KnowledgeMapSlotProps) {
  const copy = graph3dCopy(locale);
  const { graph, layout } = useGraph3DData(content, locale);
  const identity = content.profile.name;
  const [frameRef, frame] = useElementSize<HTMLDivElement>({ width: 200, height: 220 });
  const view = useMemo(() => fitView(layout, frame.width, frame.height, CANVAS_PADDING.drawer), [layout, frame.width, frame.height]);
  const camera = useMemo(() => defaultCamera(layout), [layout]);
  const vars = useMemo(() => mapThemeVars(T, T.sidebarBg), [T]);
  const [open, setOpen] = useState(false);
  const [explore, setExplore] = useState<ExploreState>(INITIAL_EXPLORE);
  const openRef = useRef<HTMLButtonElement>(null);
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setExplore(INITIAL_EXPLORE);
  };

  return (
    <section id="mobile-knowledge-graph" className="mobile-knowledge-section km-root km-drawer kg3-drawer" aria-label={copy.railLabel} style={vars}>
      <span className="km-kicker">{copy.kicker}</span>
      <div ref={frameRef} className="kg3-thumb">
        <Graph3DCanvas graph={graph} layout={layout} view={view} camera={camera} variant="drawer" locale={locale} identity={identity} focusId={null} interactive={false} />
      </div>
      <ul className="km-legend kg3-legend" aria-hidden="true">
        {(["concept", "method", "tech"] as const).map((kind) => (
          <li key={kind}>
            <KindGlyph kind={kind} />
            {copy.legend[kind]} <b>{graph.counts.kinds[kind]}</b>
          </li>
        ))}
      </ul>

      <button ref={openRef} type="button" className="km-expand km-drawer-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Maximize2 size={12} aria-hidden="true" />
        {copy.openMap}
      </button>
      {open && (
        <Graph3DExplorer
          open
          onOpenChange={onOpenChange}
          graph={graph}
          layout={layout}
          T={T}
          locale={locale}
          identity={identity}
          explore={explore}
          setExplore={setExplore}
          returnFocusRef={openRef}
        />
      )}
    </section>
  );
}
