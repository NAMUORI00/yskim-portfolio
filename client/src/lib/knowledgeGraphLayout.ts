import type { KnowledgeGraphData, KnowledgeGraphLink, KnowledgeGraphNode } from "./knowledgeGraph";

export interface PositionedKnowledgeNode extends KnowledgeGraphNode {
  x: number;
  y: number;
  radius: number;
}

export interface PositionedKnowledgeLink extends Omit<KnowledgeGraphLink, "source" | "target"> {
  sourceId: string;
  targetId: string;
  source: PositionedKnowledgeNode;
  target: PositionedKnowledgeNode;
}

export interface PositionedKnowledgeGraph {
  nodes: PositionedKnowledgeNode[];
  links: PositionedKnowledgeLink[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ringForKind(kind: KnowledgeGraphNode["kind"]): number {
  if (kind === "profile") return 0;
  if (kind === "project" || kind === "research") return 0.48;
  if (kind === "note" || kind === "skill") return 0.66;
  return 0.82;
}

function phaseForKind(kind: KnowledgeGraphNode["kind"]): number {
  if (kind === "project") return -Math.PI / 2;
  if (kind === "research") return -0.1;
  if (kind === "note") return 1.4;
  if (kind === "skill") return 2.4;
  if (kind === "repo") return 3.4;
  return 4.2;
}

function nodeRadius(node: KnowledgeGraphNode): number {
  if (node.kind === "profile") return 8.5;
  if (node.kind === "project" || node.kind === "research") return 5.2 + node.weight;
  return 3.5 + Math.min(4, node.weight);
}

export function layoutKnowledgeGraph(graph: KnowledgeGraphData, width: number, height: number): PositionedKnowledgeGraph {
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);
  const padding = 16;
  const maxRadius = Math.max(32, Math.min(width, height) / 2 - padding);
  const groups = new Map<KnowledgeGraphNode["kind"], KnowledgeGraphNode[]>();

  for (const node of graph.nodes) {
    const bucket = groups.get(node.kind) ?? [];
    bucket.push(node);
    groups.set(node.kind, bucket);
  }

  const positioned = graph.nodes.map((node) => {
    if (node.kind === "profile") {
      return { ...node, x: centerX, y: centerY, radius: nodeRadius(node) };
    }

    const bucket = groups.get(node.kind) ?? [node];
    const index = Math.max(0, bucket.findIndex((item) => item.id === node.id));
    const angleStep = (Math.PI * 2) / Math.max(bucket.length, 1);
    const angle = phaseForKind(node.kind) + angleStep * index;
    const wave = 1 + (index % 3) * 0.05;
    const distance = maxRadius * ringForKind(node.kind) * wave;
    const radius = nodeRadius(node);

    return {
      ...node,
      x: Math.round(clamp(centerX + Math.cos(angle) * distance, padding, width - padding)),
      y: Math.round(clamp(centerY + Math.sin(angle) * distance, padding, height - padding)),
      radius,
    };
  });

  const byId = new Map(positioned.map((node) => [node.id, node]));
  const links = graph.links.flatMap((link) => {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target) return [];
    return [{ ...link, sourceId: link.source, targetId: link.target, source, target }];
  });

  return { nodes: positioned, links };
}
