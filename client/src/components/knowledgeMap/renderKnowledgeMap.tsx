import { KnowledgeGraphRail } from "@/components/KnowledgeGraphRail";
import { LazyBoundary } from "@/components/LazyBoundary";
import { MobileKnowledgeGraph } from "@/components/MobileKnowledgeGraph";
import type { KnowledgeGraphSlot } from "@/pages/Home";
import { KnowledgeMapDrawer, KnowledgeMapRail } from "./KnowledgeMapRail";

export function renderProposedGraph(slot: KnowledgeGraphSlot) {
  const { placement, graph, ...props } = slot;
  if (placement === "drawer") {
    return (
      <LazyBoundary fallback={<MobileKnowledgeGraph graph={graph} T={props.T} active={props.active} />}>
        <KnowledgeMapDrawer {...props} />
      </LazyBoundary>
    );
  }
  return (
    <LazyBoundary fallback={<KnowledgeGraphRail graph={graph} T={props.T} active={props.active} focusNodeId={props.focusNodeId} />}>
      <KnowledgeMapRail {...props} />
    </LazyBoundary>
  );
}

