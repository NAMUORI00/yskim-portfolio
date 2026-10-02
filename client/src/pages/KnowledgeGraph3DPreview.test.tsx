import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { portfolioContent } from "@/content";
import { renderProposedGraph } from "@/components/knowledgeMap/renderKnowledgeMap";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HomeView } from "./Home";
import { renderGraph3D } from "./KnowledgeGraph3DPreview";

const homeSource = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./KnowledgeGraph3DPreview.tsx", import.meta.url), "utf8");

function renderHome(renderKnowledgeGraph: typeof renderGraph3D) {
  return renderToStaticMarkup(
    <ThemeProvider defaultTheme="light">
      <LanguageProvider>
        <HomeView renderKnowledgeGraph={renderKnowledgeGraph} />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

/** 오른쪽 레일(aside#knowledge-rail)만 잘라 냅니다. */
function railOf(html: string): string {
  const start = html.indexOf('id="knowledge-rail"');
  return html.slice(start, html.indexOf("</aside>", start));
}

describe("/design/knowledge-graph-3d preview", () => {
  it("is a lazily loaded, noindex review route that leaves the public home and the 2.5D review route alone", () => {
    expect(appSource).toContain('lazy(() => import("./pages/KnowledgeGraph3DPreview"))');
    expect(appSource).toContain('path={"/design/knowledge-graph-3d"}');
    expect(appSource).toContain('path={"/design/knowledge-graph"}');
    expect(appSource).not.toMatch(/^import .*KnowledgeGraph3DPreview/m);
    expect(previewSource).toContain('meta.content = "noindex, nofollow"');
    // 공개 홈은 지금의 층위형 지도(기준)를 그대로 쓰고, 3D 코드를 불러오지 않습니다.
    expect(homeSource).toContain("return <HomeView renderKnowledgeGraph={renderGraph3D} />;");
    expect(homeSource).toContain("knowledgeGraph3d");
  });

  it("swaps only the knowledge graph inside the real home layout", () => {
    const baseline = renderHome(renderProposedGraph);
    const proposal = renderHome(renderGraph3D);

    expect(baseline).toContain('class="km-root km-rail"');
    expect(baseline).not.toContain("kg3-");
    expect(proposal).toContain('class="km-root km-rail kg3-rail"');
    expect(proposal).toContain("kg3-drawer");
    expect(proposal).not.toContain('class="km-root km-rail"');
    expect(proposal).not.toContain('class="km-plane"');

    // 섹션 순서와 내용은 그대로이고, 오른쪽 레일만 다릅니다.
    const order = ['id="about"', 'id="education"', 'id="projects"', 'id="skills"', 'id="research"', 'id="interests"'];
    for (const html of [baseline, proposal]) {
      const positions = order.map((needle) => html.indexOf(needle));
      expect(positions.every((position) => position > 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    }
    const before = (html: string) => html.slice(html.indexOf('id="about"'), html.indexOf('id="knowledge-rail"'));
    expect(before(proposal).replace(/ data-loc="[^"]*"/g, "")).toBe(before(baseline).replace(/ data-loc="[^"]*"/g, ""));

    // 3D 시안은 지식(기술·개념·방법)이 노드이고 프로젝트·연구 글은 노드가 아닙니다. 관심 오픈소스(스타)는 홈의 제 섹션에만 있습니다.
    const rail = railOf(proposal).replace(/ data-loc="[^"]*"/g, "");
    expect(rail.length).toBeGreaterThan(1000);
    expect(rail.match(/class="kg3-domain-name"/g)).toHaveLength(8);
    expect(rail).toContain('data-node-id="channel-control"');
    expect(rail).not.toMatch(/data-node-id="(project|research):/);
    for (const repo of portfolioContent.starred) expect(rail).not.toContain(repo.name);
  });
});
