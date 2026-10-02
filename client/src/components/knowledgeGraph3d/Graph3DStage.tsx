/*
 * 한 지도 자리(레일의 프레임 · 넓게 보기의 무대) 안의 두 보기 — 전체 보기(지식의 구)와 펼친 분야(2.5D 층 그림).
 * 같은 자리에서 구가 흐려지며 고른 분야의 별들이 층의 자리로 옮겨 가고(펼치기), 거꾸로 돌아옵니다(접기).
 *  - 구는 늘 그려 두고(카메라·움직임 유지), 펼친 동안에는 숨기고(화면 낭독기에도 숨김) 움직임을 멈춥니다.
 *  - 초점: 키보드로 분야를 펼치면 첫 지식(또는 고정한 지식)으로, 전체 보기로 돌아오면 그 분야 이름으로 초점을 옮깁니다.
 *    영역 밖에 있던 초점은 건드리지 않습니다 (자리를 비운 사이 저절로 돌아올 때 페이지의 다른 초점을 빼앗지 않음).
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { Locale } from "@/lib/i18nContent";
import { Graph3DCanvas, PREVIEW_DEPTH, type CameraKey, type Canvas3DVariant } from "./Graph3DCanvas";
import { Graph3DBaselineDetail } from "./Graph3DBaselineDetail";
import { graph3dCopy } from "./graph3dCopy";
import { layoutDomainDetail, type DetailVariant, type Pt } from "./graph3dDetailLayout";
import { projectPoint, type Camera3D, type Emphasis3D, type LabelDensity3D, type Layout3D, type View3D } from "./graph3dLayout";
import { domainKey, type DomainId, type KnowledgeGraph } from "./graph3dModel";
import type { ExploreMode } from "./useGraph3DExplore";
import type { Focus3D } from "./useGraph3DInteraction";

/** 펼침 정도가 이만큼 되면 구가 다 사라집니다 */
const GLOBE_FADE = 0.35;

export interface Graph3DStageProps {
  graph: KnowledgeGraph;
  layout: Layout3D;
  view: View3D;
  variant: DetailVariant;
  locale: Locale;
  identity: string;
  mode: ExploreMode;
  pinnedId: string | null;
  camera: Camera3D;
  /** 지금 보이는(펼치는 중·접는 중 포함) 분야와 펼친 정도 */
  shown: DomainId | null;
  unfold: number;
  focus: Focus3D;
  hoverId: string | null;
  rovingId: string | null;
  emphasis: Emphasis3D;
  /** 은은한 움직임 켬 (켬/끔 설정 · 움직임 줄이기 반영) */
  motion: boolean;
  /** 가려졌거나 목록 보기일 때 */
  paused: boolean;
  /** 끌거나 시점이 움직이는 중 */
  moving: boolean;
  density: LabelDensity3D;
  coarse?: boolean;
  describedBy?: string;
  dragGuard?: MutableRefObject<boolean>;
  /** 영역이 초점을 갖고 있었는지 (초점을 옮길지 정함) */
  hadFocus: () => boolean;
  /** 구의 끌기 처리기를 붙일 자리 */
  globeRef?: (element: HTMLDivElement | null) => void;
  globeHandlers?: Record<string, unknown>;
  onHover: (id: string | null) => void;
  onKeyboardFocus: (id: string | null) => void;
  onRove: (id: string) => void;
  onOpen: (domain: DomainId, pinnedId?: string | null) => void;
  onBack: () => void;
  onTogglePin: (id: string) => void;
  onUnpin: () => void;
  onCameraKey?: (key: CameraKey) => void;
  onZoomKey?: (direction: 1 | -1) => void;
}

export function Graph3DStage({
  graph,
  layout,
  view,
  variant,
  locale,
  identity,
  mode,
  pinnedId,
  camera,
  shown,
  unfold,
  focus,
  hoverId,
  rovingId,
  emphasis,
  motion,
  paused,
  moving,
  density,
  coarse = false,
  describedBy,
  dragGuard,
  hadFocus,
  globeRef,
  globeHandlers,
  onHover,
  onKeyboardFocus,
  onRove,
  onOpen,
  onBack,
  onTogglePin,
  onUnpin,
  onCameraKey,
  onZoomKey,
}: Graph3DStageProps) {
  const copy = graph3dCopy(locale);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasVariant: Canvas3DVariant = variant;
  const detail = useMemo(
    () => (shown ? layoutDomainDetail({ graph, domain: shown, width: view.width, variant, gutterLabels: copy.gutters }) : null),
    [graph, shown, view.width, variant, copy.gutters],
  );
  // 펼치기 전 구에서의 자리 — 지금 카메라(앞으로 데려온 시점)로 투영한 고른 분야의 별과 묶음 가운데
  const origins = useMemo(() => {
    const map = new Map<string, Pt>();
    const domain = shown ? graph.domainById.get(shown) : undefined;
    if (!domain) return map;
    for (const id of domain.members) {
      const position = layout.positions.get(id);
      if (!position) continue;
      const point = projectPoint(view, camera, layout, position);
      map.set(id, { x: point.x, y: point.y });
    }
    return map;
  }, [graph, layout, view, camera, shown]);
  const center = useMemo(() => {
    const at = shown ? layout.centers.get(shown) : undefined;
    if (!at) return { x: view.width / 2, y: view.height / 2 };
    const point = projectPoint(view, camera, layout, at);
    return { x: point.x, y: point.y };
  }, [layout, view, camera, shown]);

  const showDetail = Boolean(shown && detail && unfold > 0);
  const globeOpacity = showDetail ? Math.max(0, 1 - unfold / GLOBE_FADE) : 1;
  const globeHidden = showDetail && globeOpacity <= 0;
  const globeLive = mode === "overview" && !showDetail;

  // 전체 보기에서 미리 보는 것: 별을 가리키면 그 분야, 분야·홈 목록의 작업은 그대로. 펼치는 중이면 그 분야.
  const overviewFocus = shown ? domainKey(shown) : focus.focusId && graph.byId.has(focus.focusId) ? domainKey(graph.byId.get(focus.focusId)!.domain) : focus.focusId;
  const starId = globeLive && hoverId && graph.byId.has(hoverId) ? hoverId : null;
  const activeDomain = focus.activeId ? (graph.byId.has(focus.activeId) ? domainKey(graph.byId.get(focus.activeId)!.domain) : focus.activeId) : null;

  // 키보드로 펼쳤으면 첫 지식(고정한 지식)으로 초점을 옮깁니다 — 한 번 펼칠 때마다 한 번.
  const movedFor = useRef<DomainId | null>(null);
  useEffect(() => {
    if (mode !== "detail" || !showDetail || !shown) return;
    if (movedFor.current === shown) return;
    movedFor.current = shown;
    const root = rootRef.current;
    if (!root || typeof document === "undefined") return;
    const active = document.activeElement;
    const inGlobe = Boolean(active && root.querySelector(".kg3-globe")?.contains(active));
    const lost = (!active || active === document.body) && hadFocus();
    if (!inGlobe && !lost) return;
    const target = (pinnedId ? root.querySelector<HTMLElement>(`.kg3-dv [data-node-id="${pinnedId}"]`) : null) ?? root.querySelector<HTMLElement>('.kg3-dv [data-node-id][tabindex="0"]');
    target?.focus({ preventScroll: true });
  }, [mode, showDetail, shown, pinnedId, hadFocus]);

  // 전체 보기로 돌아오면 펼쳤던 분야 이름으로 초점을 돌려줍니다 (초점이 펼친 그림 안에 있었거나 사라졌을 때만).
  const lastDomain = useRef<DomainId | null>(null);
  useEffect(() => {
    if (mode === "detail") {
      lastDomain.current = shown;
      return;
    }
    const domain = lastDomain.current;
    lastDomain.current = null;
    movedFor.current = null;
    if (!domain) return;
    onRove(domainKey(domain));
    const root = rootRef.current;
    if (!root || typeof document === "undefined") return;
    const active = document.activeElement;
    const inDetail = Boolean(active && root.querySelector(".kg3-dv")?.contains(active));
    const lost = (!active || active === document.body) && hadFocus();
    if (!inDetail && !lost) return;
    root.querySelector<HTMLElement>(`.kg3-globe [data-target-id="${domainKey(domain)}"]`)?.focus({ preventScroll: true });
  }, [mode, shown, onRove, hadFocus]);

  return (
    <div ref={rootRef} className="kg3-stage-root" data-mode={mode} data-unfold={showDetail ? (unfold >= 1 ? "open" : "moving") : "closed"} style={{ width: view.width, height: view.height }}>
      <div
        ref={globeRef}
        className="kg3-globe"
        data-live={globeLive ? "true" : undefined}
        aria-hidden={mode === "detail" ? "true" : undefined}
        style={{ opacity: globeOpacity < 1 ? globeOpacity : undefined, visibility: globeHidden ? "hidden" : undefined }}
        {...(globeLive ? globeHandlers : {})}
      >
        <Graph3DCanvas
          graph={graph}
          layout={layout}
          view={view}
          camera={camera}
          variant={canvasVariant}
          locale={locale}
          identity={identity}
          focusId={overviewFocus}
          activeId={globeLive ? activeDomain : null}
          starId={starId}
          hiddenDomain={showDetail ? shown : null}
          depth={PREVIEW_DEPTH}
          emphasis={emphasis}
          rovingId={rovingId}
          moving={moving}
          motion={motion}
          paused={paused || globeHidden}
          density={density}
          coarse={coarse}
          describedBy={describedBy}
          dragGuard={dragGuard}
          onHover={onHover}
          onKeyboardFocus={onKeyboardFocus}
          onOpen={onOpen}
          onRove={onRove}
          onCameraKey={onCameraKey}
          onZoomKey={onZoomKey}
        />
      </div>
      {showDetail && shown && detail && (
        <Graph3DBaselineDetail
          graph={graph}
          domain={graph.domainById.get(shown)!}
          layout={detail}
          variant={variant}
          locale={locale}
          identity={identity}
          focusId={mode === "detail" ? focus.focusId : null}
          pinnedId={mode === "detail" ? pinnedId : null}
          activeId={mode === "detail" ? focus.activeId : null}
          rovingId={rovingId}
          unfold={unfold}
          origins={origins}
          center={center}
          height={view.height}
          describedBy={describedBy}
          onHover={onHover}
          onKeyboardFocus={onKeyboardFocus}
          onActivate={onTogglePin}
          onRove={onRove}
          onBack={onBack}
          onBackgroundClick={onUnpin}
        />
      )}
    </div>
  );
}
