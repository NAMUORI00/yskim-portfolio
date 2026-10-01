/*
 * 층위형 지식 지도 캔버스 — SVG 로 판·연결선·점을 그리고, 그 위의 HTML 단추가 이름표와 조작(포인터·키보드)을 맡습니다.
 * 레일·서랍·넓게 보기가 함께 씁니다. 좌표를 1px 단위로 계산하므로 레일 폭이 바뀌어도 글자 크기는 그대로입니다.
 * - 고른 노드(가리킴 → 키보드 → 홈 목록 → 고정 순)의 경로만 떠올라 선으로 잇고, 나머지는 흐리게 둡니다.
 * - 처음 한 번 판이 펼쳐지는 것과 고른 경로가 떠오르는 것 말고는 움직이지 않습니다 (반복 애니메이션 없음).
 */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { DARK, FONT_MONO, FONT_SANS, type PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { mapCopy } from "./knowledgeMapCopy";
import { layerCounts, MAP_LAYERS, type KnowledgeMap, type MapLayer, type MapNode } from "./knowledgeMapModel";
import {
  computeViewport,
  estimateTextWidth,
  focusPath,
  isMapKey,
  labelPriority,
  layerTitleBox,
  linkKey,
  navigateMap,
  placeLabels,
  planeCorners,
  projectPoint,
  titleClearance,
  type FloorPlan,
  type LabelBox,
  type LabelDensity,
  type LabelRequest,
  type LabelSide,
  type MapCamera,
  type MapKey,
  type ScreenPoint,
  type Viewport,
} from "./knowledgeMapLayout";
import "./knowledgeMap.css";

export type CanvasVariant = "rail" | "drawer" | "explorer";
type NodeState = "idle" | "emphasis" | "focus" | "path" | "dim";

/** 고른 경로의 노드가 떠오르는 높이 (px, 세운 기준 — 화면에서는 기울기만큼 줄어듦) */
const LIFT: Record<MapLayer, number> = { research: 9, project: 8, tech: 6 };
const FOCUS_LIFT = 5;
const MARK: Record<MapLayer, number> = { research: 5, project: 4, tech: 3.6 };
const TYPE: Record<CanvasVariant, Record<MapLayer, number>> = {
  rail: { research: 12, project: 11, tech: 11 },
  drawer: { research: 11, project: 10.5, tech: 10.5 },
  explorer: { research: 13, project: 12, tech: 11.5 },
};

/** 이름표 글자 크기 — 가장 좁은 레일(1180px 바로 위 화면)에서만 연구 질문 이름을 11px 로 줄입니다. */
export function labelType(variant: CanvasVariant, width: number): Record<MapLayer, number> {
  return variant === "rail" && width < 216 ? { ...TYPE.rail, research: 11 } : TYPE[variant];
}

/** 누르는 자리 (점보다 넓게, 이웃 노드와 너무 겹치지 않게) */
const HIT: Record<MapLayer, number> = { research: 26, project: 20, tech: 18 };
const EXPLORER_HIT: Record<MapLayer, number> = { research: 30, project: 24, tech: 22 };
const TITLE_HEIGHT = 16;
const TITLE_FONT = 11.5;
const GRID_U = [-0.5, 0, 0.5];
const GRID_V = [-1 / 3, 1 / 3];

const PADDING: Record<CanvasVariant, { padX: number; padTop: number; padBottom: number }> = {
  rail: { padX: 6, padTop: 24, padBottom: 10 },
  drawer: { padX: 4, padTop: 18, padBottom: 6 },
  explorer: { padX: 28, padTop: 40, padBottom: 28 },
};

/** 홈 테마 색과 글꼴을 지도 CSS 변수로 넘깁니다 (판 색은 포인트 초록에 투명도만 바꿔 씁니다). */
export function mapThemeVars(T: PortfolioTheme, panel: string): CSSProperties {
  const dark = T.bg === DARK.bg;
  return {
    "--km-bg": T.bg,
    "--km-panel": panel,
    "--km-border": T.border,
    "--km-ink": T.text,
    "--km-sub": T.sub,
    "--km-muted": T.muted,
    "--km-green": T.green,
    "--km-green-bg": T.greenBg,
    "--km-plane": `${T.green}${dark ? "10" : "09"}`,
    "--km-plane-top": `${T.green}${dark ? "18" : "11"}`,
    "--km-plane-strong": `${T.green}${dark ? "26" : "1a"}`,
    "--km-plane-edge": `${T.green}${dark ? "4a" : "3d"}`,
    "--km-plane-edge-strong": `${T.green}${dark ? "99" : "80"}`,
    "--km-slab": `${T.green}${dark ? "30" : "22"}`,
    "--km-grid": `${T.green}${dark ? "26" : "1f"}`,
    "--km-scrim": dark ? "rgba(0, 0, 0, 0.66)" : "rgba(16, 20, 16, 0.5)",
    "--km-shadow": dark ? "0 28px 90px rgba(0, 0, 0, 0.55)" : "0 28px 90px rgba(0, 0, 0, 0.24)",
    "--km-sans": FONT_SANS,
    "--km-mono": FONT_MONO,
  } as CSSProperties;
}

export function layerTitleWidth(locale: Locale, layer: MapLayer, count: number): number {
  return 7 + 5 + estimateTextWidth(mapCopy(locale).layers[layer], TITLE_FONT, false, true) + 5 + estimateTextWidth(String(count), 11, true) + 8;
}

export interface CanvasViewportOptions {
  locale: Locale;
  counts: Record<MapLayer, number>;
  maxHeight?: number;
  unfold?: number;
  showTitles?: boolean;
}

/** 캔버스 폭과 각도로 판 크기·간격을 정합니다. 층 제목이 판 사이 띠에 들어가도록 간격을 비웁니다. */
export function canvasViewport(variant: CanvasVariant, width: number, camera: MapCamera, options: CanvasViewportOptions): Viewport {
  const showTitles = options.showTitles ?? variant !== "drawer";
  const titleWidth = Math.max(...MAP_LAYERS.map((layer) => layerTitleWidth(options.locale, layer, options.counts[layer])));
  return computeViewport({
    width,
    camera,
    ...PADDING[variant],
    clearance: showTitles ? titleClearance(camera, titleWidth, TITLE_HEIGHT) : 14,
    maxHeight: options.maxHeight,
    unfold: options.unfold,
    maxScale: variant === "explorer" ? 300 : undefined,
  });
}

/* ── 작은 훅 ─────────────────────────────── */

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** 요소의 실제 크기 (ResizeObserver) — 측정 전이나 서버 렌더에서는 fallback 을 씁니다. */
export function useElementSize<T extends HTMLElement>(fallback: { width: number; height: number }) {
  const [element, ref] = useState<T | null>(null);
  const [size, setSize] = useState(fallback);
  useIsomorphicLayoutEffect(() => {
    if (!element) return;
    const update = () => {
      const width = Math.round(element.clientWidth) || fallback.width;
      const height = Math.round(element.clientHeight) || fallback.height;
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, fallback.width, fallback.height]);
  return [ref, size] as const;
}

/* ── 그리기 도우미 ─────────────────────────── */

function pointsAttr(points: ScreenPoint[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

/** 판의 두께 — 가장 아래 모서리에 붙은 두 변을 아래로 내려 종이 한 장의 옆면처럼 보이게 합니다. */
function slabPoints(corners: ScreenPoint[], depth: number): string {
  const bottom = corners.reduce((best, corner, index) => (corner.y > corners[best].y + 0.01 ? index : best), 0);
  const previous = corners[(bottom + corners.length - 1) % corners.length];
  const current = corners[bottom];
  const next = corners[(bottom + 1) % corners.length];
  const down = (point: ScreenPoint) => ({ x: point.x, y: point.y + depth });
  return pointsAttr([previous, current, next, down(next), down(current), down(previous)]);
}

function Glyph({ node }: { node: MapNode }) {
  if (node.layer === "research") return <circle className="km-dot" r={MARK.research} />;
  if (node.layer === "project") return <circle className="km-dot" r={node.featured ? MARK.project + 0.6 : MARK.project} />;
  const half = MARK.tech;
  return <path className="km-dot" d={`M 0 ${-half} L ${half} 0 L 0 ${half} L ${-half} 0 Z`} />;
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}

function isFocusVisible(element: HTMLElement): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

/* ── 캔버스 ─────────────────────────────── */

export interface KnowledgeMapCanvasProps {
  map: KnowledgeMap;
  plan: FloorPlan;
  view: Viewport;
  variant: CanvasVariant;
  locale: Locale;
  focusId: string | null;
  pinnedId: string | null;
  /** 고른 것이 없을 때 살짝 드러낼 층 (지금 읽는 홈 섹션) */
  emphasis?: MapLayer | null;
  rovingId?: string | null;
  /** false 면 단추 없이 그림만 (서랍의 미리보기) */
  interactive?: boolean;
  /** 각도·펼침을 움직이는 동안 위치 전환 효과를 끕니다 */
  moving?: boolean;
  density?: LabelDensity;
  showTitles?: boolean;
  describedBy?: string;
  onHover?: (id: string | null) => void;
  onKeyboardFocus?: (id: string | null) => void;
  onActivate?: (id: string) => void;
  onRove?: (id: string) => void;
  onEscape?: () => void;
  /** 노드가 없는 빈 곳을 눌렀을 때 (레일: 고정 풀기) */
  onBackgroundClick?: () => void;
  /** Shift+화살표 (넓게 보기의 각도 조절) */
  onCameraKey?: (key: MapKey) => void;
}

export interface NodePosition {
  /** 판 위 자리 */
  base: ScreenPoint;
  /** 떠오른 자리 (고른 경로가 아니면 base 와 같음) */
  top: ScreenPoint;
  lift: number;
}

export interface SceneInput {
  map: KnowledgeMap;
  plan: FloorPlan;
  view: Viewport;
  variant: CanvasVariant;
  locale: Locale;
  focusId: string | null;
  emphasis: MapLayer | null;
  density: LabelDensity;
  showTitles: boolean;
}

/** 화면 자리·상태·층 제목·이름표·연결선을 한 번에 계산합니다 (그리기와 테스트가 함께 씀). */
export function computeScene({ map, plan, view, variant, locale, focusId, emphasis, density, showTitles }: SceneInput) {
  const path = focusPath(map, focusId);
  const counts = layerCounts(map);
  const type = labelType(variant, view.width);
  const positions = new Map<string, NodePosition>();
  for (const node of map.nodes) {
    const point = plan.get(node.id);
    if (!point) continue;
    const lift = path?.nodes.has(node.id) ? LIFT[node.layer] + (node.id === focusId ? FOCUS_LIFT : 0) : 0;
    positions.set(node.id, { base: projectPoint(view, node.layer, point), top: projectPoint(view, node.layer, point, lift), lift });
  }
  const states = new Map<string, NodeState>(
    map.nodes.map((node) => [
      node.id,
      !path ? (emphasis === node.layer ? "emphasis" : "idle") : node.id === focusId ? "focus" : path.nodes.has(node.id) ? "path" : "dim",
    ]),
  );
  const titles = showTitles
    ? MAP_LAYERS.map((layer) => ({ layer, box: layerTitleBox(view, layer, layerTitleWidth(locale, layer, counts[layer]), TITLE_HEIGHT) }))
    : [];

  const requests: LabelRequest[] = [];
  for (const node of map.nodes) {
    const position = positions.get(node.id);
    const priority = labelPriority(map, node, { path, focusId, emphasis, density });
    if (!position || priority === null) continue;
    if (variant === "drawer" && node.layer !== "research") continue;
    const fontSize = type[node.layer];
    const back = (plan.get(node.id)?.v ?? 0) < -0.1;
    const x = position.top.x;
    // 가장자리 가까이의 이름표는 안쪽으로 먼저 놓아 봅니다.
    const sides: LabelSide[] =
      node.layer === "research"
        ? back
          ? ["above", "right", "left", "below"]
          : ["below", "right", "left", "above"]
        : x > view.width * 0.64
          ? ["left", "below", "above", "right"]
          : x < view.width * 0.36
            ? ["right", "below", "above", "left"]
            : ["right", "left", "below", "above"];
    requests.push({
      id: node.id,
      x,
      y: position.top.y,
      radius: MARK[node.layer] + 1,
      width: estimateTextWidth(node.label, fontSize, node.layer === "tech", node.layer === "research") + 8,
      // .km-label 의 줄 높이(1.2)와 위아래 여백(1px)에 맞춥니다.
      height: Math.round(fontSize * 1.2 + 2),
      priority,
      sides,
      force: node.id === focusId || (!path && node.layer === "research"),
    });
  }
  // 이름표가 덮으면 안 되는 점: 고른 경로의 점, 아무것도 고르지 않았을 때는 연구 질문과 이름표가 붙는 점만 (조용한 점은 덮어도 됨)
  const requested = new Set(requests.map((request) => request.id));
  const obstacles = map.nodes.flatMap((node) => {
    const position = positions.get(node.id);
    const blocks = path ? states.get(node.id) !== "dim" : node.layer === "research" || requested.has(node.id);
    return position && blocks ? [{ id: node.id, x: position.top.x, y: position.top.y, r: MARK[node.layer] }] : [];
  });
  // 고른 경로가 있으면 경로 이름표가 먼저입니다. 층 제목 자리를 비워 두지 않고, 이름표가 덮는 제목만 흐리게 감춥니다.
  const labels = placeLabels(
    requests,
    { left: 2, top: 1, width: view.width - 4, height: view.height - 2 },
    obstacles,
    path ? [] : titles.map((title) => title.box),
  );
  const coveredTitles = new Set(
    titles
      .filter((title) => Array.from(labels.values()).some((label) => boxesOverlap(label.box, title.box)))
      .map((title) => title.layer),
  );

  const threads = path
    ? map.links.flatMap((link) => {
        if (!path.links.has(linkKey(link.source, link.target))) return [];
        const a = positions.get(link.source)?.top;
        const b = positions.get(link.target)?.top;
        if (!a || !b) return [];
        return [{ key: linkKey(link.source, link.target), a, b, direct: link.source === focusId || link.target === focusId }];
      })
    : [];

  return { path, counts, positions, states, titles, coveredTitles, requests, labels, threads };
}

export function KnowledgeMapCanvas({
  map,
  plan,
  view,
  variant,
  locale,
  focusId,
  pinnedId,
  emphasis = null,
  rovingId = null,
  interactive = true,
  moving = false,
  density = "quiet",
  showTitles = variant !== "drawer",
  describedBy,
  onHover,
  onKeyboardFocus,
  onActivate,
  onRove,
  onEscape,
  onBackgroundClick,
  onCameraKey,
}: KnowledgeMapCanvasProps) {
  const copy = mapCopy(locale);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const scene = useMemo(
    () => computeScene({ map, plan, view, variant, locale, focusId, emphasis, density, showTitles }),
    [map, plan, view, variant, locale, focusId, emphasis, density, showTitles],
  );
  const { path, counts } = scene;

  const fallbackRoving = map.nodes.find((node) => node.layer === "research")?.id ?? map.nodes[0]?.id ?? null;
  const roving = rovingId && map.byId.has(rovingId) ? rovingId : fallbackRoving;
  const hitSize = variant === "explorer" ? EXPLORER_HIT : HIT;
  const type = labelType(variant, view.width);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]")?.dataset.nodeId;
    if (!current) return;
    if (event.key === "Escape") {
      if (pinnedId) onEscape?.();
      return;
    }
    if (event.shiftKey && onCameraKey && event.key.startsWith("Arrow") && isMapKey(event.key)) {
      event.preventDefault();
      onCameraKey(event.key);
      return;
    }
    if (!isMapKey(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    const base = new Map(Array.from(scene.positions.entries(), ([id, position]) => [id, position.base]));
    const next = navigateMap(map, base, current, event.key);
    if (next !== current) buttons.current.get(next)?.focus();
  };

  return (
    <div
      className="km-canvas"
      data-variant={variant}
      data-moving={moving ? "true" : undefined}
      data-focus={focusId ? "true" : undefined}
      style={{ height: view.height }}
    >
      <svg className="km-svg" width={view.width} height={view.height} viewBox={`0 0 ${view.width} ${view.height}`} aria-hidden="true" focusable="false">
        {MAP_LAYERS.map((layer) => {
          const corners = planeCorners(view, layer);
          return (
            <g key={layer} className="km-plane" data-layer={layer} data-emphasis={!path && emphasis === layer ? "true" : undefined}>
              {view.rise > 0.05 && <polygon className="km-plane-slab" points={slabPoints(corners, 3.2 * view.rise)} />}
              <polygon className="km-plane-face" points={pointsAttr(corners)} />
              <g className="km-plane-grid">
                {GRID_U.map((u) => {
                  const a = projectPoint(view, layer, { u, v: -1 });
                  const b = projectPoint(view, layer, { u, v: 1 });
                  return <line key={`u${u}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
                })}
                {GRID_V.map((v) => {
                  const a = projectPoint(view, layer, { u: -1, v });
                  const b = projectPoint(view, layer, { u: 1, v });
                  return <line key={`v${v}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
                })}
              </g>
            </g>
          );
        })}
        <g className="km-threads">
          {scene.threads.map((thread) => (
            <line
              key={thread.key}
              className="km-thread"
              data-direct={thread.direct ? "true" : undefined}
              x1={thread.a.x}
              y1={thread.a.y}
              x2={thread.b.x}
              y2={thread.b.y}
              style={{ "--km-len": Math.ceil(Math.hypot(thread.b.x - thread.a.x, thread.b.y - thread.a.y)) } as CSSProperties}
            />
          ))}
        </g>
        <g className="km-marks">
          {map.nodes.map((node) => {
            const position = scene.positions.get(node.id);
            if (!position) return null;
            return (
              <g
                key={node.id}
                className="km-mark"
                data-layer={node.layer}
                data-state={scene.states.get(node.id)}
                data-featured={node.featured ? "true" : undefined}
              >
                {position.lift > 0 && (
                  <>
                    <ellipse className="km-shadow" cx={position.base.x} cy={position.base.y} rx={5} ry={Math.max(1.2, 5 * view.tilt)} />
                    <line className="km-stem" x1={position.base.x} y1={position.base.y} x2={position.top.x} y2={position.top.y} />
                  </>
                )}
                <g className="km-glyph" style={{ transform: `translate(${position.top.x.toFixed(1)}px, ${position.top.y.toFixed(1)}px)` }}>
                  {node.id === focusId && <circle className="km-halo" r={MARK[node.layer] + 5} />}
                  <Glyph node={node} />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
      <div
        className="km-overlay"
        role={interactive ? "group" : undefined}
        aria-label={interactive ? copy.groupLabel(counts) : undefined}
        aria-describedby={interactive ? describedBy : undefined}
        aria-hidden={interactive ? undefined : "true"}
        onKeyDown={interactive ? handleKeyDown : undefined}
        onClick={(event) => {
          if (interactive && event.target === event.currentTarget) onBackgroundClick?.();
        }}
      >
        {scene.titles.map(({ layer, box }) => (
          <div
            key={layer}
            className="km-layer-title"
            data-layer={layer}
            data-emphasis={!path && emphasis === layer ? "true" : undefined}
            data-covered={scene.coveredTitles.has(layer) ? "true" : undefined}
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            aria-hidden="true"
          >
            <span className="km-layer-glyph" data-layer={layer} />
            <span className="km-layer-name">{copy.layers[layer]}</span>
            <span className="km-layer-count">{counts[layer]}</span>
          </div>
        ))}
        {map.nodes.map((node) => {
          const position = scene.positions.get(node.id);
          if (!position) return null;
          const state = scene.states.get(node.id);
          const label = scene.labels.get(node.id);
          const hit = interactive ? hitSize[node.layer] : 0;
          const text = label && (
            <span
              className="km-label"
              data-side={label.side}
              style={{
                left: label.box.left - (position.top.x - hit / 2),
                top: label.box.top - (position.top.y - hit / 2),
                fontSize: type[node.layer],
              }}
            >
              {node.label}
            </span>
          );
          if (!interactive) {
            return text ? (
              <span key={node.id} className="km-node km-node-static" data-layer={node.layer} data-state={state} style={{ left: position.top.x, top: position.top.y }}>
                {text}
              </span>
            ) : null;
          }
          const up = map.above.get(node.id)?.length ?? 0;
          const down = map.below.get(node.id)?.length ?? 0;
          return (
            <button
              key={node.id}
              ref={(element) => {
                if (element) buttons.current.set(node.id, element);
                else buttons.current.delete(node.id);
              }}
              type="button"
              className="km-node"
              data-node-id={node.id}
              data-layer={node.layer}
              data-state={state}
              data-labelled={label ? "true" : undefined}
              aria-label={copy.nodeName(node, up, down)}
              aria-pressed={pinnedId === node.id}
              tabIndex={node.id === roving ? 0 : -1}
              style={{ left: position.top.x, top: position.top.y, width: hit, height: hit }}
              onClick={() => onActivate?.(node.id)}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") onHover?.(node.id);
              }}
              onPointerLeave={() => onHover?.(null)}
              onFocus={(event) => {
                onRove?.(node.id);
                if (isFocusVisible(event.currentTarget)) onKeyboardFocus?.(node.id);
              }}
              onBlur={() => onKeyboardFocus?.(null)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
