/*
 * 펼친 분야 — 고른 분야 하나를 종류별 층(개념 → 구현한 방법 → 기술·도구 → 근거)으로 펼친 2.5D 그림.
 * 배치는 graph3dDetailLayout 이 정하고, 여기서는 그리기와 조작(포인터·키보드)만 맡습니다.
 *  - 맨 위에 "← 전체 보기"와 분야 이름(가운데 이름 / 분야)이 늘 남습니다. 그림이 길면 그 아래만 스크롤합니다.
 *  - 지식 칩을 가리키면 미리 보고, 누르거나 Enter 로 고정합니다. 고정한 동안 다른 칩을 가리켜도 설명은 그대로이고 점선 표시만 생깁니다.
 *    칩 사이의 빈틈을 지나가도 펼친 분야는 그대로입니다 (빈 곳을 누르면 고정만 풂).
 *  - 선은 기록된 관계뿐이고, 고른 지식의 선에만 관계 이름(사용·구현·적용·뒷받침·바탕)과 방향 화살표가 붙습니다.
 *    근거로 이어진 선(점선)은 고른 지식·근거에만 그립니다. 층의 위아래는 의존을 뜻하지 않습니다 (아래 안내 글).
 *  - 펼치는 동안(unfold < 1)에는 별이 구에서의 자리에서 층의 자리로 옮겨 오고, 층이 위에서부터 차례로 나타납니다.
 */
import { useCallback, useId, useRef, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ArrowLeft, Pin } from "lucide-react";
import type { Locale } from "@/lib/i18nContent";
import { graph3dCopy } from "./graph3dCopy";
import { DETAIL_METRICS, isDetailNavKey, navigateDetail, type DetailVariant, type DomainDetailLayout, type Pt } from "./graph3dDetailLayout";
import type { KDomain, KnowledgeGraph } from "./graph3dModel";

/** 머리 줄(전체 보기 · 분야 이름) 높이 */
export const DETAIL_HEAD: Record<DetailVariant, number> = { rail: 30, explorer: 42 };

/** 층마다 늦게 시작하는 정도 (펼침 정도의 몫) */
const TIER_STAGGER = 0.12;

export type DetailItemState = "idle" | "focus" | "near" | "dim";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** 층 i 의 펼침 정도 (0–1) — 위층부터 차례로 */
export function tierProgress(unfold: number, index: number, count: number): number {
  const span = Math.max(0.3, 1 - TIER_STAGGER * Math.max(0, count - 1));
  return clamp01((unfold - index * TIER_STAGGER) / span);
}

/** 고른 대상(지식·근거)과 바로 이어진 칩 — 기록된 관계와 근거 선 */
export function detailNeighbors(layout: DomainDetailLayout, focusId: string | null): Set<string> {
  const near = new Set<string>();
  if (!focusId || !layout.items.has(focusId)) return near;
  for (const link of [...layout.links, ...layout.claims]) {
    if (link.source === focusId) near.add(link.target);
    if (link.target === focusId) near.add(link.source);
  }
  return near;
}

export interface Graph3DDomainViewProps {
  graph: KnowledgeGraph;
  domain: KDomain;
  layout: DomainDetailLayout;
  variant: DetailVariant;
  locale: Locale;
  identity: string;
  /** 설명 칸·강조의 기준 — 고정한 것, 없으면 미리 보는 것 */
  focusId: string | null;
  pinnedId: string | null;
  /** 지금 가리키거나 키보드 초점이 있는 칩 */
  activeId: string | null;
  rovingId: string | null;
  /** 0–1 펼친 정도 */
  unfold: number;
  /** 펼치기 전 구에서의 화면 자리 (프레임 기준) */
  origins: Map<string, Pt>;
  /** 분야 묶음 가운데의 화면 자리 (근거 칩이 여기서 나옵니다) */
  center: Pt;
  /** 프레임 높이 */
  height: number;
  describedBy?: string;
  onHover: (id: string | null) => void;
  onKeyboardFocus: (id: string | null) => void;
  onActivate: (id: string) => void;
  onRove: (id: string) => void;
  onBack: () => void;
  onBackgroundClick: () => void;
}

export function Graph3DDomainView({
  graph,
  domain,
  layout,
  variant,
  locale,
  identity,
  focusId,
  pinnedId,
  activeId,
  rovingId,
  unfold,
  origins,
  center,
  height,
  describedBy,
  onHover,
  onKeyboardFocus,
  onActivate,
  onRove,
  onBack,
  onBackgroundClick,
}: Graph3DDomainViewProps) {
  const copy = graph3dCopy(locale);
  const metrics = DETAIL_METRICS[variant];
  const head = DETAIL_HEAD[variant];
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const scrollRef = useRef<HTMLDivElement>(null);
  const arrowId = `kg3-arrow-${useId().replace(/[^\w-]/g, "")}`;
  const settled = unfold >= 1;
  const focus = focusId && layout.items.has(focusId) ? focusId : null;
  const near = detailNeighbors(layout, focus);
  const cueId = pinnedId && activeId && activeId !== pinnedId && layout.items.has(activeId) ? activeId : null;
  const roving = rovingId && layout.items.has(rovingId) ? rovingId : (layout.order[0] ?? null);
  const scrollTop = scrollRef.current?.scrollTop ?? 0;
  const tierIndex = new Map(layout.tiers.map((tier, index) => [tier.key, index]));
  const linkFade = clamp01((unfold - 0.82) / 0.18);

  const stateOf = (id: string): DetailItemState => (!focus ? "idle" : id === focus ? "focus" : near.has(id) ? "near" : "dim");

  const register = useCallback(
    (id: string) => (element: HTMLButtonElement | null) => {
      if (element) buttons.current.set(id, element);
      else buttons.current.delete(id);
    },
    [],
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = (event.target as HTMLElement).closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    if (!current || !isDetailNavKey(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    const next = navigateDetail(layout, current, event.key);
    if (next === current) return;
    buttons.current.get(next)?.focus();
    onKeyboardFocus(next);
  };

  /** 칩이 지금 그려질 자리 — 펼치는 동안 구에서의 자리(또는 분야 가운데)에서 층의 자리로 */
  const placement = (id: string) => {
    const item = layout.items.get(id)!;
    const tier = tierIndex.get(item.tier) ?? 0;
    const progress = tierProgress(unfold, tier, layout.tiers.length);
    if (settled) return { progress: 1, dx: 0, dy: 0 };
    const eased = easeInOut(progress);
    const origin = origins.get(id) ?? center;
    const fromX = origin.x;
    const fromY = origin.y - head + scrollTop;
    return { progress, dx: (fromX - item.dot.x) * (1 - eased), dy: (fromY - item.dot.y) * (1 - eased) };
  };

  const node = (id: string) => graph.byId.get(id);
  const supportCount = (evidenceId: string) => layout.claims.filter((claim) => claim.target === evidenceId).length;
  const crossCount = Array.from(layout.external.values()).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="kg3-dv" data-variant={variant} data-unfolding={settled ? undefined : "true"} data-focus={focus ? "true" : undefined} style={{ height }}>
      <div className="kg3-dv-head" style={{ height: head, opacity: settled ? undefined : clamp01(unfold / 0.4) }}>
        <button type="button" className="kg3-back" aria-label={copy.backLabel} title={`${copy.backLabel} (Esc)`} onClick={onBack}>
          <ArrowLeft size={variant === "explorer" ? 14 : 12} aria-hidden="true" />
          {copy.back}
        </button>
        <p className="kg3-dv-title">
          <span className="kg3-dv-path">{identity}</span>
          <span className="kg3-dv-sep" aria-hidden="true">
            /
          </span>
          <b>{domain.label}</b>
          <span className="kg3-dv-count">{domain.evidenced}</span>
        </p>
      </div>
      <div ref={scrollRef} className="kg3-dv-scroll" style={{ top: head }}>
        <div className="kg3-dv-content" style={{ width: layout.width, height: layout.height }}>
          <svg className="kg3-dv-svg" width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false">
            <defs>
              <marker id={arrowId} viewBox="0 0 8 8" refX="13" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                <path className="kg3-dv-arrow" d="M 0 0 L 8 4 L 0 8 Z" />
              </marker>
            </defs>
            <g className="kg3-dv-planes">
              {layout.tiers.map((tier, index) => {
                const progress = tierProgress(unfold, index, layout.tiers.length);
                const [backLeft, backRight, frontRight, frontLeft] = tier.corners;
                const slab = metrics.slab;
                return (
                  <g
                    key={tier.key}
                    className="kg3-dv-plane"
                    data-tier={tier.key}
                    style={settled ? undefined : { opacity: progress, transform: `scaleY(${0.3 + 0.7 * easeInOut(progress)})` }}
                  >
                    <polygon className="kg3-dv-slab" points={`${frontLeft.x},${frontLeft.y} ${frontRight.x},${frontRight.y} ${frontRight.x},${frontRight.y + slab} ${frontLeft.x},${frontLeft.y + slab}`} />
                    <polygon className="kg3-dv-face" points={`${backLeft.x},${backLeft.y} ${backRight.x},${backRight.y} ${frontRight.x},${frontRight.y} ${frontLeft.x},${frontLeft.y}`} />
                  </g>
                );
              })}
            </g>
            {linkFade > 0 && (
              <g className="kg3-dv-links" style={settled ? undefined : { opacity: linkFade }}>
                {layout.links.map((link) => {
                  const state = !focus ? "idle" : link.source === focus || link.target === focus ? "near" : "dim";
                  return (
                    <path
                      key={link.key}
                      className="kg3-dv-link"
                      data-key={link.key}
                      data-relation={link.relation}
                      data-state={state}
                      d={link.d}
                      markerEnd={state === "near" ? `url(#${arrowId})` : undefined}
                    />
                  );
                })}
                {focus &&
                  layout.claims
                    .filter((claim) => claim.source === focus || claim.target === focus)
                    .map((claim) => <path key={claim.key} className="kg3-dv-claim" data-key={claim.key} data-modes={claim.modes?.join(" ")} d={claim.d} />)}
              </g>
            )}
          </svg>
          <div
            className="kg3-dv-overlay"
            role="group"
            aria-label={copy.detailLabel(domain)}
            aria-describedby={describedBy}
            onKeyDown={handleKeyDown}
            onClick={(event) => {
              if (event.target === event.currentTarget) onBackgroundClick();
            }}
          >
            {layout.tiers.map((tier, index) => {
              const progress = tierProgress(unfold, index, layout.tiers.length);
              return (
                <span
                  key={tier.key}
                  className="kg3-dv-tier"
                  data-tier={tier.key}
                  style={{ left: tier.title.left, top: tier.title.top, height: tier.title.height, opacity: settled ? undefined : clamp01((progress - 0.4) / 0.6) }}
                >
                  <span className="kg3-glyph" data-kind={tier.key} aria-hidden="true" />
                  {copy.tiers[tier.key]}
                  <b>{copy.tierCount(tier.key, tier.main, tier.open)}</b>
                </span>
              );
            })}
            {layout.rows.map((row, index) =>
              row.gutter ? (
                <span
                  key={`gutter-${index}`}
                  className="kg3-dv-gutter"
                  data-group={row.group}
                  aria-hidden="true"
                  style={{
                    left: row.gutter.box.left,
                    top: row.gutter.box.top,
                    width: row.gutter.box.width,
                    height: row.gutter.box.height,
                    opacity: settled ? undefined : clamp01((tierProgress(unfold, row.tier, layout.tiers.length) - 0.5) / 0.5),
                  }}
                >
                  {copy.gutters[row.gutter.key]}
                </span>
              ) : null,
            )}
            {layout.order.map((id) => {
              const item = layout.items.get(id)!;
              const knowledge = node(id);
              const evidence = knowledge ? undefined : graph.evidence.get(id);
              const state = stateOf(id);
              const pinned = id === pinnedId;
              const cue = id === cueId;
              const { progress, dx, dy } = placement(id);
              const style: CSSProperties = {
                left: item.box.left,
                top: item.box.top,
                width: item.box.width,
                height: item.box.height,
                fontSize: metrics.font,
                paddingLeft: metrics.dotSpace,
              };
              if (!settled) {
                style.transform = `translate(${Math.round(dx * 10) / 10}px, ${Math.round(dy * 10) / 10}px)`;
                style.opacity = evidence ? progress : clamp01(0.35 + progress);
              }
              const label = knowledge
                ? copy.nodeName(knowledge, domain, graph.neighbors.get(id)?.length ?? 0)
                : evidence
                  ? copy.evidenceName(evidence, supportCount(id))
                  : item.text;
              return (
                <button
                  key={id}
                  ref={register(id)}
                  type="button"
                  className="kg3-dv-item"
                  data-item-id={id}
                  data-tier={item.tier}
                  data-kind={knowledge?.kind ?? "evidence"}
                  data-evidence-kind={evidence?.kind}
                  data-status={knowledge?.status ?? (item.open ? "listed" : "evidenced")}
                  data-state={state}
                  data-pinned={pinned ? "true" : undefined}
                  data-active={id === activeId ? "true" : undefined}
                  data-cue={cue ? "true" : undefined}
                  aria-pressed={pinned}
                  aria-label={label}
                  title={item.truncated && evidence ? evidence.title : undefined}
                  tabIndex={id === roving ? 0 : -1}
                  style={style}
                  onClick={() => onActivate(id)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "touch" || !settled) return;
                    onHover(id);
                  }}
                  onPointerLeave={() => onHover(null)}
                  onFocus={(event) => {
                    onRove(id);
                    let visible = true;
                    try {
                      visible = event.currentTarget.matches(":focus-visible");
                    } catch {
                      /* 예전 브라우저 */
                    }
                    if (visible) onKeyboardFocus(id);
                  }}
                  onBlur={() => onKeyboardFocus(null)}
                >
                  {pinned ? (
                    <Pin className="kg3-dv-pin" size={variant === "explorer" ? 11 : 10} strokeWidth={2.5} aria-hidden="true" style={{ left: metrics.dotSpace / 2 + 1 }} />
                  ) : (
                    <span
                      className="kg3-glyph kg3-dv-glyph"
                      data-kind={knowledge?.kind ?? "evidence"}
                      data-open={item.open ? "true" : undefined}
                      aria-hidden="true"
                      style={{ left: metrics.dotSpace / 2 + 1 }}
                    />
                  )}
                  <span className="kg3-dv-text" style={settled ? undefined : { opacity: clamp01((progress - 0.55) / 0.45) }}>
                    {item.text}
                  </span>
                </button>
              );
            })}
            {focus &&
              settled &&
              layout.links
                .filter((link) => link.source === focus || link.target === focus)
                .map((link) => (
                  <span key={`rel-${link.key}`} className="kg3-dv-rel" data-relation={link.relation} aria-hidden="true" style={{ left: link.mid.x, top: link.mid.y }}>
                    {copy.relationShort[link.relation]}
                  </span>
                ))}
          </div>
        </div>
        <div className="kg3-dv-foot" style={settled ? undefined : { opacity: linkFade }}>
          <ul className="kg3-dv-legend" aria-hidden="true">
            <li data-line="relation">{copy.detailLegend.relation}</li>
            <li data-line="background">{copy.detailLegend.background}</li>
            <li data-line="evidence">{copy.detailLegend.evidence}</li>
            <li data-line="open">{copy.detailLegend.open}</li>
          </ul>

          {crossCount > 0 && <p className="kg3-dv-note">{copy.crossNote(crossCount)}</p>}
        </div>
      </div>
    </div>
  );
}
