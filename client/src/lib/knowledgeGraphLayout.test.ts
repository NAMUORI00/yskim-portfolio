import { describe, expect, it } from "vitest";
import type { KnowledgeGraphData } from "./knowledgeGraph";
import { curvedKnowledgeLinkPath, layoutKnowledgeGraph } from "./knowledgeGraphLayout";

const graph: KnowledgeGraphData = {
  nodes: [
    { id: "profile", label: "NAMUORI00", kind: "profile", weight: 5 },
    { id: "project:a", label: "Project A", kind: "project", weight: 3, section: "projects" },
    { id: "research:r", label: "Research R", kind: "research", weight: 3, section: "research" },
    { id: "note:n", label: "Note N", kind: "note", weight: 2, section: "interests" },
    { id: "skill:python", label: "Python", kind: "skill", weight: 2, section: "skills" },
    { id: "term:rag", label: "RAG", kind: "term", weight: 2 },
  ],
  links: [
    { source: "profile", target: "project:a", kind: "profile", weight: 1 },
    { source: "project:a", target: "note:n", kind: "related", weight: 2 },
    { source: "project:a", target: "term:rag", kind: "term", weight: 1 },
  ],
};

function distanceBetween(layout: ReturnType<typeof layoutKnowledgeGraph>, leftId: string, rightId: string): number {
  const left = layout.nodes.find((node) => node.id === leftId);
  const right = layout.nodes.find((node) => node.id === rightId);
  if (!left || !right) throw new Error(`Missing node pair ${leftId} ${rightId}`);
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function nodeById(layout: ReturnType<typeof layoutKnowledgeGraph>, id: string) {
  const node = layout.nodes.find((item) => item.id === id);
  if (!node) throw new Error(`Missing node ${id}`);
  return node;
}

describe("layoutKnowledgeGraph", () => {
  it("places the profile node as a root origin above the branching layers", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);
    const profile = nodeById(layout, "profile");
    const project = nodeById(layout, "project:a");
    const note = nodeById(layout, "note:n");

    expect(profile.x).toBe(130);
    expect(profile.y).toBeLessThan(118);
    expect(project.y).toBeGreaterThan(profile.y + 34);
    expect(note.y).toBeGreaterThan(project.y + 34);
    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(22);
      expect(node.x).toBeLessThanOrEqual(238);
      expect(node.y).toBeGreaterThanOrEqual(28);
      expect(node.y).toBeLessThanOrEqual(324);
      expect(node.radius).toBeGreaterThan(2);
    }
  });

  it("resolves link coordinates from source and target ids", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);

    expect(layout.links[0]).toEqual(expect.objectContaining({ sourceId: "profile", targetId: "project:a" }));
    expect(layout.links[0].source.x).toBe(130);
    expect(layout.links.length).toBe(2);
  });

  it("generates root-like cubic paths instead of straight line commands", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);
    const path = curvedKnowledgeLinkPath(layout.links[0]);

    expect(path).toMatch(/^M \d+ \d+ C /);
    expect(path).toContain(`M 130 ${nodeById(layout, "profile").y}`);
    expect(path).not.toContain(" L ");
  });

  it("excludes term nodes and term links from the visual root tree", () => {
    const clustered: KnowledgeGraphData = {
      nodes: [
        { id: "profile", label: "NAMUORI00", kind: "profile", weight: 5 },
        { id: "project:a", label: "Project A", kind: "project", weight: 3, section: "projects" },
        { id: "note:linked", label: "Linked Note", kind: "note", weight: 2, section: "interests" },
        { id: "term:unlinked", label: "Unlinked", kind: "term", weight: 2 },
        { id: "term:linked", label: "Linked", kind: "term", weight: 2 },
      ],
      links: [
        { source: "profile", target: "project:a", kind: "profile", weight: 1 },
        { source: "project:a", target: "note:linked", kind: "related", weight: 2.4 },
        { source: "project:a", target: "term:linked", kind: "term", weight: 2.4 },
      ],
    };
    const layout = layoutKnowledgeGraph(clustered, 260, 340);
    const project = nodeById(layout, "project:a");
    const linked = nodeById(layout, "note:linked");

    expect(linked.y).toBeGreaterThan(project.y);
    expect(layout.nodes.some((node) => node.kind === "term")).toBe(false);
    expect(layout.links.some((link) => link.sourceId.startsWith("term:") || link.targetId.startsWith("term:"))).toBe(false);
    expect(distanceBetween(layout, "project:a", "note:linked")).toBeLessThan(120);
  });

  it("omits unlinked visual nodes so the tree stays clean", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);

    expect(layout.nodes.some((node) => node.id === "skill:python")).toBe(false);
    expect(layout.nodes.every((node) => node.id === "profile" || layout.links.some((link) => link.sourceId === node.id || link.targetId === node.id))).toBe(true);
  });
});
