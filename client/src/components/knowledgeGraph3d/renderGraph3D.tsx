import { LazyBoundary } from "@/components/LazyBoundary";
import { renderProposedGraph } from "@/components/knowledgeMap/renderKnowledgeMap";
import type { KnowledgeGraphSlot } from "@/pages/Home";
import { KnowledgeGraph3DDrawer, KnowledgeGraph3DRail } from "./Graph3DRail";

/** /design/knowledge-graph-3d 의 지식 그래프 자리 — 시안에서 오류가 나면 그 자리만 지금 쓰는 층위형 지도(기준)로 돌아갑니다. */
export function renderGraph3D(slot: KnowledgeGraphSlot) {
  const { placement, graph: _graph, ...props } = slot;
  if (placement === "drawer") {
    return (
      <LazyBoundary fallback={renderProposedGraph(slot)}>
        <KnowledgeGraph3DDrawer {...props} />
      </LazyBoundary>
    );
  }
  return (
    <LazyBoundary fallback={renderProposedGraph(slot)}>
      <KnowledgeGraph3DRail {...props} />
    </LazyBoundary>
  );
}
