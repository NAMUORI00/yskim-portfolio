/*
 * 오른쪽 레일과 휴대폰 서랍의 층위형 지식 지도 — /design/knowledge-graph 미리보기에서만 HomeView 의 지식 그래프 자리에 끼웁니다.
 * - 레일: 위에서부터 연구 질문 · 프로젝트 · 기술 판. 처음 한 번 판이 펼쳐지고, 고른 경로만 떠올라 이어집니다.
 *   홈 목록에서 프로젝트를 가리키면 그 프로젝트의 연구 질문과 기술이 이어지고, 읽는 섹션에 맞춰 해당 층이 살짝 드러납니다.
 * - 서랍(768px 이하): 지도를 작게 보여 주고 단추로 넓게 보기를 엽니다 (조작은 넓게 보기에서).
 * 레일의 폭·높이와 숨는 너비(1180px 이하)는 지금 레일과 같습니다 (#knowledge-rail 에 홈의 반응형 규칙이 그대로 걸림).
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { portfolioContent, type PortfolioContent } from "@/content";
import type { PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { usePrefersReducedMotion } from "@/components/capabilities/useFlowPlayer";
import { canvasViewport, KnowledgeMapCanvas, mapThemeVars, useElementSize } from "./KnowledgeMapCanvas";
import { KnowledgeMapDetail } from "./KnowledgeMapDetail";
import { KnowledgeMapExplorer } from "./KnowledgeMapExplorer";
import { mapCopy } from "./knowledgeMapCopy";
import { buildKnowledgeMap, layerCounts, MAP_LAYERS, type MapLayer, type MapNode } from "./knowledgeMapModel";
import { layoutFloorPlan, RAIL_CAMERA, type MapCamera } from "./knowledgeMapLayout";
import { useMapInteraction, usePinAnnouncement } from "./useMapInteraction";

export interface KnowledgeMapSlotProps {
  /** 현지화된 콘텐츠 (노드 id 는 원본 기준이라 언어가 바뀌어도 같은 자리) */
  content: PortfolioContent;
  T: PortfolioTheme;
  locale: Locale;
  /** 지금 읽는 홈 섹션 id */
  active: string;
  /** 홈 목록에서 가리키거나 연 프로젝트 (project:<slug>) */
  focusNodeId: string | null;
}

const DRAWER_CAMERA: MapCamera = { yaw: 0.28, tilt: 0.4 };
const UNFOLD_MS = 700;

/** 읽고 있는 홈 섹션 → 살짝 드러낼 층 */
export const SECTION_LAYER: Partial<Record<string, MapLayer>> = {
  education: "research",
  research: "research",
  projects: "project",
  skills: "tech",
};

export function useKnowledgeMapData(content: PortfolioContent, locale: Locale) {
  const map = useMemo(() => buildKnowledgeMap(portfolioContent, content, locale), [content, locale]);
  const plan = useMemo(() => layoutFloorPlan(map), [map]);
  const counts = useMemo(() => layerCounts(map), [map]);
  return { map, plan, counts };
}

function canAnimate(): boolean {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return false;
  return !(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/** 처음 한 번만 판을 펼칩니다 (움직임 줄이기·서버 렌더에서는 펼친 상태로 시작). */
function useUnfold(): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(() => (canAnimate() ? 0 : 1));
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    if (reduced || !canAnimate()) {
      setValue(1);
      return;
    }
    started.current = true;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / UNFOLD_MS);
      setValue(1 - (1 - progress) ** 3);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      started.current = false;
      setValue(1);
    };
  }, [reduced]);
  return value;
}

function cssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * 홈 본문에서 노드에 해당하는 자리로 옮겨 가고 잠깐 테두리를 비춥니다.
 * 프로젝트 행(data-kg-node-id) · 연구 분야 카드 · 기술 스택 항목, 없으면(필터로 숨김 등) 그 섹션 제목으로 갑니다.
 */
export function locateInPage(node: MapNode, accent: string, reduced: boolean): boolean {
  if (typeof document === "undefined") return false;
  let target: HTMLElement | null = null;
  if (node.layer === "project") {
    target = document.querySelector<HTMLElement>(`[data-kg-node-id="${cssString(node.id)}"]`) ?? document.getElementById("projects");
  } else if (node.layer === "research") {
    target =
      document.querySelector<HTMLElement>(`a[href="/research/${cssString(node.key)}"]`)?.closest<HTMLElement>("li") ??
      document.getElementById("research");
  } else {
    target =
      Array.from(document.querySelectorAll<HTMLElement>(".stack-items li")).find((item) => item.textContent?.trim() === node.title) ??
      document.getElementById("skills");
  }
  if (!target) return false;
  target.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "center" });
  if (!reduced && typeof target.animate === "function") {
    target.animate([{ boxShadow: `0 0 0 2px ${accent}` }, { boxShadow: `0 0 0 2px ${accent}00` }], { duration: 1800, easing: "ease-out" });
  }
  return true;
}

export function KnowledgeMapRail({ content, T, locale, active, focusNodeId }: KnowledgeMapSlotProps) {
  const copy = mapCopy(locale);
  const { map, plan, counts } = useKnowledgeMapData(content, locale);
  const interaction = useMapInteraction(map, focusNodeId);
  const announcement = usePinAnnouncement(map, interaction.pinnedId, locale);
  const reduced = usePrefersReducedMotion();
  const unfold = useUnfold();
  const [frameRef, frame] = useElementSize<HTMLDivElement>({ width: 252, height: 0 });
  const view = useMemo(() => canvasViewport("rail", frame.width, RAIL_CAMERA, { locale, counts, unfold }), [frame.width, locale, counts, unfold]);
  const vars = useMemo(() => mapThemeVars(T, T.sidebarBg), [T]);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const expandRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const focusNode = interaction.focusId ? (map.byId.get(interaction.focusId) ?? null) : null;
  const locate = (node: MapNode) => locateInPage(node, T.green, reduced);

  return (
    <aside id="knowledge-rail" className="km-root km-rail" aria-label={copy.railLabel} style={vars} data-focus-node-id={focusNode?.id ?? ""}>
      <div className="km-head">
        <span className="km-kicker">{copy.kicker}</span>
        <button ref={expandRef} type="button" className="km-expand" aria-haspopup="dialog" aria-label={copy.expandLabel} onClick={() => setExplorerOpen(true)}>
          <Maximize2 size={12} aria-hidden="true" />
          {copy.expand}
        </button>
      </div>
      <p className="km-sub">{copy.subtitle}</p>
      <div ref={frameRef} className="km-canvas-frame">
        {map.nodes.length > 0 ? (
          <KnowledgeMapCanvas
            map={map}
            plan={plan}
            view={view}
            variant="rail"
            locale={locale}
            focusId={interaction.focusId}
            pinnedId={interaction.pinnedId}
            emphasis={SECTION_LAYER[active] ?? null}
            rovingId={interaction.rovingId ?? interaction.pinnedId}
            moving={unfold < 1}
            describedBy={hintId}
            onHover={interaction.setHover}
            onKeyboardFocus={interaction.setKeyboard}
            onActivate={interaction.togglePin}
            onRove={interaction.setRovingId}
            onEscape={() => interaction.setPinned(null)}
            onBackgroundClick={() => interaction.setPinned(null)}
          />
        ) : (
          <p className="km-hint">{copy.emptyMap}</p>
        )}
      </div>
      <p id={hintId} className="km-sr">
        {copy.hint}
      </p>
      <KnowledgeMapDetail
        map={map}
        node={focusNode}
        pinnedId={interaction.pinnedId}
        locale={locale}
        counts={counts}
        onPick={(id) => {
          interaction.setPinned(id);
          interaction.setRovingId(id);
        }}
        onUnpin={() => interaction.setPinned(null)}
        onLocate={locate}
      />
      <p className="km-sr" aria-live="polite">
        {announcement}
      </p>
      {explorerOpen && (
        <KnowledgeMapExplorer
          open
          onOpenChange={setExplorerOpen}
          map={map}
          plan={plan}
          T={T}
          locale={locale}
          pinnedId={interaction.pinnedId}
          onPin={interaction.setPinned}
          returnFocusRef={expandRef}
          onLocate={(node) => {
            setExplorerOpen(false);
            window.setTimeout(() => locate(node), 80);
          }}
        />
      )}
    </aside>
  );
}

/** 휴대폰 서랍: 지도를 작게 보여 주고 넓게 보기를 여는 단추만 둡니다. */
export function KnowledgeMapDrawer({ content, T, locale }: KnowledgeMapSlotProps) {
  const copy = mapCopy(locale);
  const { map, plan, counts } = useKnowledgeMapData(content, locale);
  const [frameRef, frame] = useElementSize<HTMLDivElement>({ width: 212, height: 0 });
  const view = useMemo(
    () => canvasViewport("drawer", frame.width, DRAWER_CAMERA, { locale, counts, showTitles: false }),
    [frame.width, locale, counts],
  );
  const vars = useMemo(() => mapThemeVars(T, T.sidebarBg), [T]);
  const [open, setOpen] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  return (
    <section id="mobile-knowledge-graph" className="mobile-knowledge-section km-root km-drawer" aria-label={copy.railLabel} style={vars}>
      <span className="km-kicker">{copy.kicker}</span>
      <div ref={frameRef} className="km-canvas-frame">
        <KnowledgeMapCanvas map={map} plan={plan} view={view} variant="drawer" locale={locale} focusId={null} pinnedId={null} interactive={false} showTitles={false} />
      </div>
      <ul className="km-legend" aria-hidden="true">
        {MAP_LAYERS.map((layer) => (
          <li key={layer}>
            <span className="km-layer-glyph" data-layer={layer} />
            {copy.layers[layer]} <b>{counts[layer]}</b>
          </li>
        ))}
      </ul>
      <button ref={openRef} type="button" className="km-expand km-drawer-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Maximize2 size={12} aria-hidden="true" />
        {copy.openMap}
      </button>
      {open && (
        <KnowledgeMapExplorer
          open
          onOpenChange={setOpen}
          map={map}
          plan={plan}
          T={T}
          locale={locale}
          pinnedId={pinnedId}
          onPin={setPinnedId}
          returnFocusRef={openRef}
        />
      )}
    </section>
  );
}
