import { useMemo } from "react";
import { KnowledgeMapCanvas, canvasViewport } from "../knowledgeMap/KnowledgeMapCanvas";
import { layoutFloorPlan, RAIL_CAMERA, EXPLORER_CAMERA } from "../knowledgeMap/knowledgeMapLayout";
import { layerCounts, type KnowledgeMap, type MapLayer } from "../knowledgeMap/knowledgeMapModel";
import type { Graph3DDomainViewProps } from "./Graph3DDomainView";

/** Share the original 2.5D renderer; keep knowledge IDs so the single detail panel stays in sync. */
export function Graph3DBaselineDetail(p: Graph3DDomainViewProps) {
  const map = useMemo<KnowledgeMap>(() => {
    const nodes = p.graph.nodes.filter(n => n.domain === p.domain.id).map(n => ({
      id: n.id, key: n.id, title: n.title,
      label: n.label + (n.status === "evidenced" ? "" : p.locale === "ko" ? " · 관심/목록" : " · interest/listed"),
      layer: (n.kind === "concept" ? "research" : n.kind === "method" ? "project" : "tech") as MapLayer,
      order: n.order,
    }));
    const byId = new Map(nodes.map(n => [n.id, n]));
    const links = p.graph.links.filter(l => byId.has(l.source) && byId.has(l.target));
    const below = new Map(nodes.map(n => [n.id, [] as string[]]));
    const above = new Map(nodes.map(n => [n.id, [] as string[]]));
    for (const l of links) { below.get(l.source)!.push(l.target); above.get(l.target)!.push(l.source); }
    return { nodes, links, byId, below, above };
  }, [p.graph, p.domain.id, p.locale]);
  const plan = useMemo(() => layoutFloorPlan(map), [map]);
  const view = useMemo(() => canvasViewport(p.variant, Math.max(160, p.layout.width - 16), p.variant === "rail" ? RAIL_CAMERA : EXPLORER_CAMERA,
    { locale: p.locale, counts: layerCounts(map), unfold: p.unfold, maxHeight: p.height - 46 }), [map, p.variant, p.layout.width, p.height, p.locale, p.unfold]);
  return <div className="kg3-dv kg3-dv-scroll" data-variant={p.variant} data-unfolding={p.unfold < 1 ? "true" : undefined} style={{height:p.height,overflowY:"auto",position:"absolute",inset:0}}>
    <div className="kg3-dv-head">
      <button type="button" className="km-chip kg3-back" onClick={p.onBack} aria-label={p.locale === "ko" ? "전체 보기로 돌아가기" : "Return to whole view"}>{p.locale === "ko" ? "전체 보기" : "Whole view"}</button>
      <span className="kg3-dv-title">{p.domain.label}</span>
    </div>
    <KnowledgeMapCanvas map={map} plan={plan} view={view} variant={p.variant} locale={p.locale}
      focusId={p.focusId} pinnedId={p.pinnedId} rovingId={p.rovingId} moving={p.unfold < 1}
      layerLabels={p.locale === "ko" ? {research:"개념",project:"구현한 방법",tech:"기술·도구"} : {research:"Concepts",project:"Methods",tech:"Technologies"}}
      onHover={p.onHover} onKeyboardFocus={p.onKeyboardFocus} onActivate={p.onActivate} onRove={id => { p.onRove(id); p.onKeyboardFocus(id); }}
      onEscape={p.pinnedId ? p.onBackgroundClick : p.onBack} onBackgroundClick={p.onBackgroundClick} />
  </div>;
}
