import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

describe("Home mobile layout", () => {
  it("keeps contacts available in the mobile drawer", () => {
    const drawerStart = source.indexOf('className={`mobile-drawer');
    const drawerEnd = source.indexOf("좌측 고정 사이드바", drawerStart);
    const drawer = source.slice(drawerStart, drawerEnd);

    expect(drawer).toContain("PROFILE.contacts.map");
    expect(drawer).toContain("<ContactIcon");
    expect(drawer).toContain('target="_blank"');
  });

  it("renders mobile knowledge graph inside the hamburger drawer, not the main content flow", () => {
    const drawerStart = source.indexOf('className={`mobile-drawer');
    const drawerEnd = source.indexOf("좌측 고정 사이드바", drawerStart);
    const drawer = source.slice(drawerStart, drawerEnd);
    const mainStart = source.indexOf('id="scroll-area"');
    const mainEnd = source.indexOf("<KnowledgeGraphRail", mainStart);
    const mainContent = source.slice(mainStart, mainEnd);

    expect(source).toContain('import { MobileKnowledgeGraph } from "@/components/MobileKnowledgeGraph"');
    expect(drawer).toContain("<MobileKnowledgeGraph");
    expect(mainContent).not.toContain("<MobileKnowledgeGraph");
    expect(source).toContain(".mobile-knowledge-section { display: none; }");
    expect(source).toContain(".mobile-drawer .mobile-knowledge-section");
    expect(source).toContain("display: block;");
  });
});
