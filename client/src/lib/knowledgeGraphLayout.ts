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

export interface KnowledgeGraphPointer {
  x: number;
  y: number;
}

export interface ProjectedKnowledgeNode extends PositionedKnowledgeNode {
  influence: number;
  scale: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashFraction(value: string, salt = ""): number {
  let hash = 2166136261;
  for (const char of `${salt}:${value}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

function nodeRadius(node: KnowledgeGraphNode): number {
  if (node.kind === "profile") return 8.5;
  if (node.kind === "project" || node.kind === "research") return 5.2 + node.weight;
  return 3.5 + Math.min(4, node.weight);
}

function rootLevel(kind: KnowledgeGraphNode["kind"]): number {
  if (kind === "profile") return 0;
  if (kind === "project" || kind === "research") return 1;
  if (kind === "note" || kind === "skill" || kind === "repo") return 2;
  return 3;
}

function ringRadius(level: number, width: number, height: number): number {
  const base = Math.min(width, height);
  if (level === 0) return 0;
  if (level === 1) return base * 0.24;
  if (level === 2) return base * 0.37;
  return base * 0.46;
}

function siblingAngleSpread(level: number, count: number): number {
  if (count <= 1) return 0;
  if (level === 1) return (Math.PI * 2) / count;
  if (level === 2) return Math.min(0.58, Math.PI / Math.max(4, count + 2));
  return Math.min(0.44, Math.PI / Math.max(5, count + 3));
}

export function layoutKnowledgeGraph(graph: KnowledgeGraphData, width: number, height: number): PositionedKnowledgeGraph {
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);
  const padding = 22;
  const visualNodePool = graph.nodes.filter((node) => node.kind !== "term" && node.kind !== "note");
  const poolIds = new Set(visualNodePool.map((node) => node.id));
  const visualLinks = graph.links.filter((link) => poolIds.has(link.source) && poolIds.has(link.target));
  const connectedIds = new Set<string>(["profile"]);
  for (const link of visualLinks) {
    connectedIds.add(link.source);
    connectedIds.add(link.target);
  }
  const visualNodes = visualNodePool.filter((node) => connectedIds.has(node.id));
  const nodeIds = new Set(visualNodes.map((node) => node.id));
  const linksByNode = new Map<string, KnowledgeGraphLink[]>();
  const positioned: PositionedKnowledgeNode[] = [];
  const byId = new Map<string, PositionedKnowledgeNode>();
  const angles = new Map<string, number>();

  for (const link of visualLinks) {
    if (!nodeIds.has(link.source) || !nodeIds.has(link.target)) continue;
    linksByNode.set(link.source, [...(linksByNode.get(link.source) ?? []), link]);
    linksByNode.set(link.target, [...(linksByNode.get(link.target) ?? []), link]);
  }

  function parentIdFor(node: KnowledgeGraphNode): string | null {
    const level = rootLevel(node.kind);
    const candidates = (linksByNode.get(node.id) ?? [])
      .map((link) => {
        const otherId = link.source === node.id ? link.target : link.source;
        const other = visualNodes.find((item) => item.id === otherId);
        return other && rootLevel(other.kind) < level ? { id: otherId, link } : null;
      })
      .filter((item): item is { id: string; link: KnowledgeGraphLink } => item !== null)
      .sort((a, b) => b.link.weight - a.link.weight || a.id.localeCompare(b.id));
    return candidates[0]?.id ?? null;
  }

  for (let level = 0; level <= 3; level += 1) {
    const levelNodes = visualNodes
      .filter((node) => rootLevel(node.kind) === level)
      .sort((a, b) => hashFraction(a.id, "order") - hashFraction(b.id, "order") || a.id.localeCompare(b.id));
    const parentGroups = new Map<string, KnowledgeGraphNode[]>();

    for (const node of levelNodes) {
      const parentId = level === 0 ? "root" : parentIdFor(node) ?? "free";
      parentGroups.set(parentId, [...(parentGroups.get(parentId) ?? []), node]);
    }

    for (const [parentId, children] of Array.from(parentGroups.entries())) {
      const parent = byId.get(parentId);
      children.forEach((node: KnowledgeGraphNode, index: number) => {
        const radius = nodeRadius(node);
        const ring = ringRadius(level, width, height);
        const spread = siblingAngleSpread(level, children.length);
        let angle = -Math.PI / 2;
        if (level > 0) {
          if (parent) {
            const parentAngle = angles.get(parentId) ?? -Math.PI / 2;
            const jitter = (hashFraction(node.id, "orbit-jitter") - 0.5) * spread * 0.34;
            angle = parentAngle + (index - (children.length - 1) / 2) * spread + jitter;
          } else {
            const orbitCount = Math.max(1, children.length);
            angle = -Math.PI / 2 + index * ((Math.PI * 2) / orbitCount) + (hashFraction(node.id, "free-orbit") - 0.5) * 0.16;
          }
        }

        const x = centerX + Math.cos(angle) * ring;
        const y = centerY + Math.sin(angle) * ring;
        const positionedNode = {
          ...node,
          x: Math.round(clamp(x, padding, width - padding)),
          y: Math.round(clamp(y, padding, height - padding)),
          radius,
        };
        positioned.push(positionedNode);
        byId.set(node.id, positionedNode);
        angles.set(node.id, angle);
      });
    }
  }

  const links = visualLinks.flatMap((link) => {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    if (!source || !target) return [];
    return [{ ...link, sourceId: link.source, targetId: link.target, source, target }];
  });

  return { nodes: positioned, links };
}

export function projectKnowledgeNode(node: PositionedKnowledgeNode, pointer: KnowledgeGraphPointer | null): ProjectedKnowledgeNode {
  if (!pointer) return { ...node, influence: 0, scale: 1 };
  const distance = Math.hypot(node.x - pointer.x, node.y - pointer.y);
  const influence = clamp(1 - distance / 84, 0, 1);
  return {
    ...node,
    x: node.x,
    y: node.y,
    influence,
    scale: Number((1 + influence * 0.16).toFixed(3)),
  };
}

export function curvedKnowledgeLinkPath(link: PositionedKnowledgeLink, pointer: KnowledgeGraphPointer | null = null): string {
  const source = projectKnowledgeNode(link.source, pointer);
  const target = projectKnowledgeNode(link.target, pointer);
  const sx = source.x;
  const sy = source.y;
  const tx = target.x;
  const ty = target.y;
  const dx = tx - sx;
  const dy = ty - sy;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const bend = (hashFraction(`${link.sourceId}-${link.targetId}`, "neural-path") - 0.5) * clamp(distance * 0.34, 18, 42);
  const c1x = Math.round(sx + dx * 0.34 + normalX * bend);
  const c1y = Math.round(sy + dy * 0.34 + normalY * bend);
  const c2x = Math.round(sx + dx * 0.66 + normalX * bend);
  const c2y = Math.round(sy + dy * 0.66 + normalY * bend);

  return `M ${Math.round(sx)} ${Math.round(sy)} C ${c1x} ${c1y} ${c2x} ${c2y} ${Math.round(tx)} ${Math.round(ty)}`;
}
