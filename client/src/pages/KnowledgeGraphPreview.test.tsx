import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { portfolioContent } from "@/content";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HomeView } from "./Home";
import { readGraphVariant, renderProposedGraph } from "./KnowledgeGraphPreview";

const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./KnowledgeGraphPreview.tsx", import.meta.url), "utf8");

function renderHome(renderKnowledgeGraph?: typeof renderProposedGraph) {
  return renderToStaticMarkup(
    <ThemeProvider defaultTheme="light">
      <LanguageProvider>
        <HomeView renderKnowledgeGraph={renderKnowledgeGraph} />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("/design/knowledge-graph preview", () => {
  it("is a lazily loaded, noindex review route that uses the approved map on the public home", () => {
    expect(appSource).toContain('lazy(() => import("./pages/KnowledgeGraphPreview"))');
    expect(appSource).toContain('path={"/design/knowledge-graph"}');
    expect(previewSource).toContain('meta.content = "noindex, nofollow"');
    expect(homeSource).toContain('return <HomeView renderKnowledgeGraph={renderGraph3D} />;');

  });

  it("reads the original/proposed switch from the address", () => {
    expect(readGraphVariant("")).toBe("proposed");
    expect(readGraphVariant("?lang=en")).toBe("proposed");
    expect(readGraphVariant("?graph=original&lang=en")).toBe("original");
  });

  it("swaps only the knowledge graph inside the real home layout", () => {
    const original = renderHome();
    const proposed = renderHome(renderProposedGraph);

    expect(original).toContain('class="knowledge-canvas knowledge-neural-canvas"');
    expect(original).toContain('class="mobile-knowledge-canvas"');
    expect(original).not.toContain("km-rail");
    expect(proposed).toContain('class="km-root km-rail"');
    expect(proposed).toContain("km-drawer");
    expect(proposed).not.toContain('class="knowledge-canvas knowledge-neural-canvas"');
    expect(proposed).not.toContain('class="mobile-knowledge-canvas"');

    // 섹션 순서와 내용(자기소개·경력 포함)은 그대로입니다.
    const order = ['id="about"', 'id="education"', 'id="projects"', 'id="skills"', 'id="research"', 'id="interests"'];
    for (const html of [original, proposed]) {
      const positions = order.map((needle) => html.indexOf(needle));
      expect(positions.every((position) => position > 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      expect(html).toContain("About Me");
    }
    // 최근에 뺀 요소(노트·OPIc·유료 표시·사이드바 한 줄 소개)를 시안이 되살리지 않습니다.
    for (const removed of ["OPIc", "유료", "Notes", "노트", portfolioContent.profile.headline]) {
      expect(proposed.includes(removed)).toBe(original.includes(removed));
    }
    expect(proposed).not.toContain(portfolioContent.profile.headline);
  });
});
