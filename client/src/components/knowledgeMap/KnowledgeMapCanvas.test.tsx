import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { DARK, LIGHT } from "@/content/theme";
import { localizePortfolioContent } from "@/lib/i18nContent";
import { canvasViewport, computeScene } from "./KnowledgeMapCanvas";
import { KnowledgeMapDrawer, KnowledgeMapRail } from "./KnowledgeMapRail";
import { buildKnowledgeMap, layerCounts, type MapLayer } from "./knowledgeMapModel";
import { layoutFloorPlan, RAIL_CAMERA, type LabelBox } from "./knowledgeMapLayout";

const english = localizePortfolioContent(portfolioContent, englishTranslations, "en");
const css = readFileSync(new URL("./knowledgeMap.css", import.meta.url), "utf8");

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.left + b.width - 0.5 && b.left < a.left + a.width - 0.5 && a.top < b.top + b.height - 0.5 && b.top < a.top + a.height - 0.5;
}

describe("KnowledgeMapRail", () => {
  it("renders a calm default: three titled layers, research names only, no connection lines", () => {
    const html = renderToStaticMarkup(<KnowledgeMapRail content={portfolioContent} T={LIGHT} locale="ko" active="about" focusNodeId={null} />);

    expect(html).toContain('id="knowledge-rail"');
    expect(html).toContain('aria-label="포트폴리오 지식 지도"');
    expect(html).toContain('role="group"');
    expect(html).toContain("지식 지도: 연구 질문 6개, 프로젝트 17개, 기술 29개");
    for (const title of ["연구 질문", "프로젝트", "기술"]) expect(html).toContain(`class="km-layer-name">${title}</span>`);
    for (const label of ["문서 검색", "영상 QA", "센서 운영", "로컬 AI", "음원 분리", "개발 자동화"]) expect(html).toContain(`>${label}</span>`);
    // 고르기 전에는 연결선을 그리지 않고, 키보드 진입점은 하나뿐입니다.
    expect(html).not.toContain('class="km-thread"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain("넓게 보기");
    for (const repo of portfolioContent.starred) expect(html).not.toContain(repo.name);
  });

  it("follows a project hovered in the home list: its research questions and technologies light up, the rest dims", () => {
    const html = renderToStaticMarkup(
      <KnowledgeMapRail content={portfolioContent} T={LIGHT} locale="ko" active="projects" focusNodeId="project:smartfarm-rag" />,
    );

    expect(html).toContain('data-focus-node-id="project:smartfarm-rag"');
    expect(html).toMatch(/data-node-id="project:smartfarm-rag"[^>]*data-state="focus"/);
    expect(html).toMatch(/data-node-id="research:rag"[^>]*data-state="path"/);
    expect(html).toMatch(/data-node-id="research:sensor-operations"[^>]*data-state="path"/);
    expect(html).toMatch(/data-node-id="tech:fastapi"[^>]*data-state="path"/);
    expect(html).toMatch(/data-node-id="project:mv-evirag"[^>]*data-state="dim"/);
    expect(html).toMatch(/data-node-id="tech:arduino"[^>]*data-state="dim"/);
    // 연구 2 → 프로젝트, 프로젝트 → 기술 3 만 잇습니다.
    expect(html.match(/class="km-thread"/g)).toHaveLength(5);
    expect(html).toContain("관련 KCI 논문 1편 게재");
    expect(html).toContain("프로젝트 목록에서 보기");
  });

  it("emphasises the layer of the section being read and switches to English", () => {
    const html = renderToStaticMarkup(<KnowledgeMapRail content={english} T={DARK} locale="en" active="skills" focusNodeId={null} />);

    expect(html).toContain('aria-label="Portfolio knowledge map"');
    expect(html).toMatch(/class="km-layer-title" data-layer="tech" data-emphasis="true"/);
    expect(html).toContain(">Retrieval</span>");
    expect(html).toContain('class="km-layer-name">Stack</span>');
    expect(html).toContain(">Python</span>");
    expect(html).toContain("Wide view");
    expect(html).toContain(DARK.green);
  });

  it("shows a non-interactive thumbnail in the mobile drawer with a button to open the wide view", () => {
    const html = renderToStaticMarkup(<KnowledgeMapDrawer content={portfolioContent} T={LIGHT} locale="ko" active="about" focusNodeId={null} />);

    expect(html).toContain('class="mobile-knowledge-section km-root km-drawer"');
    expect(html).toContain("지식 지도 열기");
    expect(html).not.toContain('role="group"');
    // 지도 노드는 단추가 아닌 그림이고(km-node-static), 조작은 넓게 보기에서 합니다.
    expect(html).not.toContain('class="km-node"');
    expect(html).toContain("km-node km-node-static");
  });

  it("keeps motion restrained: no perpetual animation, reduced-motion and touch rules present", () => {
    expect(css).not.toMatch(/infinite/);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (pointer: coarse)");
  });
});

describe("computeScene geometry on the real portfolio", () => {
  it("never overlaps labels, keeps them inside the rail, and keeps visible layer titles readable", () => {
    for (const locale of ["ko", "en"] as const) {
      const map = buildKnowledgeMap(portfolioContent, locale === "en" ? english : portfolioContent, locale);
      const plan = layoutFloorPlan(map);
      const counts = layerCounts(map);
      for (const width of [200, 230, 260, 290]) {
        const view = canvasViewport("rail", width, RAIL_CAMERA, { locale, counts });
        const states: Array<{ focusId: string | null; emphasis: MapLayer | null }> = [
          ...[null, "research", "project", "tech"].map((emphasis) => ({ focusId: null, emphasis: emphasis as MapLayer | null })),
          ...map.nodes.map((node) => ({ focusId: node.id, emphasis: null })),
        ];
        for (const state of states) {
          const scene = computeScene({ map, plan, view, variant: "rail", locale, density: "quiet", showTitles: true, ...state });
          const labels = Array.from(scene.labels.values());
          labels.forEach((label, index) => {
            expect(label.box.left).toBeGreaterThanOrEqual(0);
            expect(label.box.top).toBeGreaterThanOrEqual(0);
            expect(label.box.left + label.box.width).toBeLessThanOrEqual(width);
            expect(label.box.top + label.box.height).toBeLessThanOrEqual(view.height);
            for (const other of labels.slice(index + 1)) expect(overlaps(label.box, other.box), `${state.focusId}: ${label.id} × ${other.id}`).toBe(false);
            for (const title of scene.titles) {
              if (!scene.coveredTitles.has(title.layer)) expect(overlaps(label.box, title.box)).toBe(false);
            }
          });
          if (state.focusId) expect(scene.labels.has(state.focusId)).toBe(true);
          else for (const node of map.nodes.filter((item) => item.layer === "research")) expect(scene.labels.has(node.id)).toBe(true);
        }
      }
    }
  });
});
