import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LIGHT } from "@/content/theme";
import type { KnowledgeGraphData } from "@/lib/knowledgeGraph";
import { KnowledgeGraphRail } from "./KnowledgeGraphRail";

const graph: KnowledgeGraphData = {
  nodes: [
    { id: "profile", label: "NAMUORI00", kind: "profile", weight: 5, section: "about" },
    { id: "project:a", label: "Project A", kind: "project", weight: 3, section: "projects" },
    { id: "term:rag", label: "RAG", kind: "term", weight: 2 },
  ],
  links: [
    { source: "profile", target: "project:a", kind: "profile", weight: 1 },
    { source: "project:a", target: "term:rag", kind: "term", weight: 1 },
  ],
};

describe("KnowledgeGraphRail", () => {
  it("renders the graph as a passive visualization without click controls", () => {
    const html = renderToStaticMarkup(<KnowledgeGraphRail graph={graph} T={LIGHT} active="about" />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("knowledge-canvas");
    expect(html).toContain("knowledge-root-canvas");
    expect(html).toContain("knowledge-root-spine");
    expect(html).toContain("knowledge-root-thread");
    expect(html).toContain('class="knowledge-hit"');
    expect(html).toContain('class="knowledge-hover-layer"');
    expect(html).toContain('pointer-events="all"');
    expect(html).toContain('data-connects="profile project:a"');
    expect(html).not.toContain('data-node-id="term:rag"');
    expect(html).not.toContain('data-connects="project:a term:rag"');
    expect(html).toContain('data-edge-state="active"');
    expect(html).toContain('knowledge-node-group[data-node-id="profile"]:hover');
    expect(html).not.toContain(":has(");
    expect(html).not.toContain("nodeBreathe");
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("tabindex");
  });
});
