import { describe, expect, it } from "vitest";
import type { KnowledgeGraphData } from "./knowledgeGraph";
import { curvedKnowledgeLinkPath, layoutKnowledgeGraph, projectKnowledgeNode } from "./knowledgeGraphLayout";

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
    { source: "profile", target: "skill:python", kind: "skill", weight: 0.8 },
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
  it("places the profile node at the center and connected nodes on orbital rings", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);
    const profile = nodeById(layout, "profile");
    const project = nodeById(layout, "project:a");
    const skill = nodeById(layout, "skill:python");

    expect(profile.x).toBe(130);
    expect(profile.y).toBe(170);
    expect(distanceBetween(layout, "profile", "project:a")).toBeGreaterThanOrEqual(54);
    expect(distanceBetween(layout, "profile", "project:a")).toBeLessThanOrEqual(78);
    expect(distanceBetween(layout, "profile", "skill:python")).toBeGreaterThanOrEqual(88);
    expect(skill.kind).toBe("skill");
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

  it("generates neural curved paths instead of straight line commands", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);
    const path = curvedKnowledgeLinkPath(layout.links[0]);

    expect(path).toMatch(/^M \d+ \d+ C /);
    expect(path).toContain(`M 130 170`);
    expect(path).not.toContain(" L ");
  });

  it("excludes notes and terms while keeping linked skills in the visual neural graph", () => {
    const clustered: KnowledgeGraphData = {
      nodes: [
        { id: "profile", label: "NAMUORI00", kind: "profile", weight: 5 },
        { id: "project:a", label: "Project A", kind: "project", weight: 3, section: "projects" },
        { id: "skill:cuda", label: "CUDA", kind: "skill", weight: 2, section: "skills" },
        { id: "note:linked", label: "Linked Note", kind: "note", weight: 2, section: "interests" },
        { id: "term:unlinked", label: "Unlinked", kind: "term", weight: 2 },
        { id: "term:linked", label: "Linked", kind: "term", weight: 2 },
      ],
      links: [
        { source: "profile", target: "project:a", kind: "profile", weight: 1 },
        { source: "profile", target: "skill:cuda", kind: "skill", weight: 1 },
        { source: "project:a", target: "note:linked", kind: "related", weight: 2.4 },
        { source: "project:a", target: "term:linked", kind: "term", weight: 2.4 },
      ],
    };
    const layout = layoutKnowledgeGraph(clustered, 260, 340);

    expect(layout.nodes.some((node) => node.kind === "term")).toBe(false);
    expect(layout.nodes.some((node) => node.kind === "note")).toBe(false);
    expect(layout.nodes.some((node) => node.id === "skill:cuda")).toBe(true);
    expect(layout.links.some((link) => link.sourceId.startsWith("term:") || link.targetId.startsWith("term:"))).toBe(false);
    expect(layout.links.some((link) => link.sourceId.startsWith("note:") || link.targetId.startsWith("note:"))).toBe(false);
  });

  it("omits unlinked visual nodes so the graph stays clean", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);

    expect(layout.nodes.some((node) => node.id === "skill:python")).toBe(true);
    expect(layout.nodes.every((node) => node.id === "profile" || layout.links.some((link) => link.sourceId === node.id || link.targetId === node.id))).toBe(true);
  });

  it("highlights nearby nodes without moving them away from the pointer", () => {
    const layout = layoutKnowledgeGraph(graph, 260, 340);
    const project = nodeById(layout, "project:a");
    const projected = projectKnowledgeNode(project, { x: project.x + 8, y: project.y });

    expect(projected.x).toBe(project.x);
    expect(projected.y).toBe(project.y);
    expect(projected.scale).toBeGreaterThan(1.08);
    expect(projected.influence).toBeGreaterThan(0.7);
  });
});
