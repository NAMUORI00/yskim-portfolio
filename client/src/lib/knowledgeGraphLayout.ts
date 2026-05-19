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

function levelY(level: number, height: number): number {
  if (level === 0) return Math.round(clamp(height * 0.24, 62, 94));
  if (level === 1) return Math.round(height * 0.43);
  if (level === 2) return Math.round(height * 0.63);
  return Math.round(height * 0.82);
}

function branchSpread(level: number, width: number): number {
  if (level === 1) return width * 0.22;
  if (level === 2) return width * 0.16;
  return width * 0.11;
}

export function layoutKnowledgeGraph(graph: KnowledgeGraphData, width: number, height: number): PositionedKnowledgeGraph {
  const centerX = Math.round(width / 2);
  const padding = 22;
  const visualNodePool = graph.nodes.filter((node) => node.kind !== "term");
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

    const freeNodes = parentGroups.get("free") ?? [];
    const freeCount = freeNodes.length;
    let freeIndex = 0;

    for (const [parentId, children] of Array.from(parentGroups.entries())) {
      const parent = byId.get(parentId);
      const spread = branchSpread(level, width);
      children.forEach((node: KnowledgeGraphNode, index: number) => {
        const radius = nodeRadius(node);
        let x = centerX;
        if (level > 0) {
          const siblingOffset = (index - (children.length - 1) / 2) * spread;
          const jitter = (hashFraction(node.id, "root-x") - 0.5) * spread * 0.48;
          if (parent) {
            const drift = (hashFraction(`${parentId}-${node.id}`, "branch") - 0.5) * spread * 0.72;
            x = parent.x + siblingOffset + drift + jitter;
          } else {
            const globalOffset = (freeIndex - (freeCount - 1) / 2) * (width * 0.72) / Math.max(1, freeCount);
            x = centerX + globalOffset + jitter;
            freeIndex += 1;
          }
        }

        const y = levelY(level, height) + (level === 0 ? 0 : Math.round((hashFraction(node.id, "root-y") - 0.5) * 18));
        const positionedNode = {
          ...node,
          x: Math.round(clamp(x, padding, width - padding)),
          y: Math.round(clamp(y, padding + 6, height - 16)),
          radius,
        };
        positioned.push(positionedNode);
        byId.set(node.id, positionedNode);
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

export function curvedKnowledgeLinkPath(link: PositionedKnowledgeLink): string {
  const sx = link.source.x;
  const sy = link.source.y;
  const tx = link.target.x;
  const ty = link.target.y;
  const dx = tx - sx;
  const dy = ty - sy;
  const vertical = Math.max(28, Math.abs(dy));
  const sway = (hashFraction(`${link.sourceId}-${link.targetId}`, "root-path") - 0.5) * 22;
  const c1x = Math.round(sx + dx * 0.18 + sway);
  const c1y = Math.round(sy + vertical * 0.42);
  const c2x = Math.round(tx - dx * 0.22 - sway * 0.65);
  const c2y = Math.round(ty - vertical * 0.28);

  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`;
}
