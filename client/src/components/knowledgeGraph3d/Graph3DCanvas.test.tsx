import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { DARK, LIGHT } from "@/content/theme";
import { localizePortfolioContent } from "@/lib/i18nContent";
import type { LabelBox } from "@/components/knowledgeMap/knowledgeMapLayout";
import { CANVAS_PADDING, computeScene3d, coreLabelSize, navigateDomains, PREVIEW_DEPTH, type NavTarget, type Scene3DInput } from "./Graph3DCanvas";
import { KnowledgeGraph3DDrawer, KnowledgeGraph3DRail } from "./Graph3DRail";
import { graph3dCopy } from "./graph3dCopy";
import { buildKnowledgeGraph, domainKey } from "./graph3dModel";
import { defaultCamera, fitView, layoutGraph3D, RAIL_ASPECT, RAIL_WIDTHS, type Emphasis3D } from "./graph3dLayout";
import { EDGES } from "./knowledgeData";

const english = localizePortfolioContent(portfolioContent, englishTranslations, "en");
const css = readFileSync(new URL("./graph3d.css", import.meta.url), "utf8");
const names = { ko: portfolioContent.profile.name, en: english.profile.name };

/** 테스트 빌드의 jsx-loc 플러그인이 붙이는 data-loc 속성을 지우고 읽습니다. */
function render(element: Parameters<typeof renderToStaticMarkup>[0]): string {
  return renderToStaticMarkup(element).replace(/ data-loc="[^"]*"/g, "");
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.left + b.width - 0.5 && b.left < a.left + a.width - 0.5 && a.top < b.top + b.height - 0.5 && b.top < a.top + a.height - 0.5;
}

const graphs = {
  ko: buildKnowledgeGraph(portfolioContent, portfolioContent, "ko"),
  en: buildKnowledgeGraph(portfolioContent, english, "en"),
};

function setup(locale: "ko" | "en") {
  const graph = graphs[locale];
  return { graph, layout: layoutGraph3D(graph) };
}

function railScene(locale: "ko" | "en", width: number, overrides: Partial<Scene3DInput> = {}) {
  const { graph, layout } = setup(locale);
  const view = fitView(layout, width, Math.round(width * RAIL_ASPECT), CANVAS_PADDING.rail);
  const core = coreLabelSize("rail", names[locale], graph3dCopy(locale).coreCaption);
  const input: Scene3DInput = { graph, layout, view, camera: defaultCamera(layout), variant: "rail", focusId: null, depth: PREVIEW_DEPTH, emphasis: null, density: "quiet", core, ...overrides };
  return { graph, view, scene: computeScene3d(input) };
}

/** 문자 그림 — 브라우저 없이 배치를 눈으로 확인할 때 씁니다 (실패 메시지에 붙음). 분야 이름 머리글자, 가운데(@), 점(·)을 찍습니다. */
function ascii(scene: ReturnType<typeof computeScene3d>, width: number, height: number, cols = 70): string {
  const rows = Math.round((cols * height) / width / 2);
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => " "));
  const put = (x: number, y: number, char: string) => {
    const c = Math.floor((x / width) * cols);
    const r = Math.floor((y / height) * rows);
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = char;
  };
  for (const point of Array.from(scene.points.values())) put(point.x, point.y, "·");
  const core = scene.core.box;
  for (let x = core.left; x < core.left + core.width; x += width / cols) put(x, core.top + core.height / 2, "@");
  for (const label of Array.from(scene.labels.values())) {
    const text = label.id.startsWith("domain:") ? `[${label.id.slice(7)}]` : label.id;
    for (let index = 0; index < text.length; index += 1) put(label.box.left + (index * label.box.width) / text.length, label.box.top + label.box.height / 2, text[index]);
  }
  return grid.map((row) => row.join("")).join("\n");
}

function expectTidyLabels(scene: ReturnType<typeof computeScene3d>, width: number, height: number, context: string) {
  const labels = Array.from(scene.labels.values());
  labels.forEach((label, index) => {
    expect(label.box.left, context).toBeGreaterThanOrEqual(0);
    expect(label.box.top, context).toBeGreaterThanOrEqual(0);
    expect(label.box.left + label.box.width, context).toBeLessThanOrEqual(width);
    expect(label.box.top + label.box.height, context).toBeLessThanOrEqual(height);
    // 가운데 이름(사람 자리)은 어떤 이름표도 덮지 않습니다.
    expect(overlaps(label.box, scene.core.box), `${context}: ${label.id} × core\n${ascii(scene, width, height)}`).toBe(false);
    for (const other of labels.slice(index + 1)) expect(overlaps(label.box, other.box), `${context}: ${label.id} × ${other.id}\n${ascii(scene, width, height)}`).toBe(false);
  });
}

describe("KnowledgeGraph3DRail markup — the whole view", () => {
  it("opens on the person at the centre and eight field names around, with one keyboard entry point and no wall of labels", () => {
    const html = render(<KnowledgeGraph3DRail content={portfolioContent} T={LIGHT} locale="ko" active="about" focusNodeId={null} />);
    const { graph } = setup("ko");

    expect(html).toContain('id="knowledge-rail"');
    expect(html).toContain('aria-label="3D 지식 지도"');
    expect(html).toContain('role="group"');
    expect(html).toContain(`aria-label="${names.ko}의 지식 지도: 가운데에 ${names.ko}, 둘레에 분야 8곳과 근거가 있는 지식 84개. 분야를 고르면 펼칩니다"`);
    // 가운데는 언어와 관계없이 ME 하나만 표시합니다.
    expect(html).toMatch(/class="kg3-core-label"[^>]*><b[^>]*>Me<\/b><\/span>/);
    for (const domain of graph.domains) expect(html).toContain(`<span class="kg3-domain-name">${domain.label}</span><span class="kg3-domain-count">${domain.evidenced}</span>`);
    expect(html.match(/data-labelled="true"/g)).toHaveLength(graph.domains.length);
    // 가운데 → 분야 정리 선 8개, 모두 같은 모양(굵기를 따로 주지 않음)
    const spokes = html.match(/<line class="kg3-spoke"[^>]*>/g) ?? [];
    expect(spokes).toHaveLength(8);
    for (const spoke of spokes) expect(spoke).not.toMatch(/stroke-width|style=/);
    expect(html).toContain('class="kg3-equator"');
    // 레일에는 지식 이름이 없고(분야 이름만), 고르는 단추는 분야 8개뿐 — Tab 진입점은 하나
    expect(html).not.toContain('class="kg3-label"');
    expect(html.match(/<button[^>]*class="kg3-domain"/g)).toHaveLength(8);
    expect(html.match(/tabindex="0"/g)).toHaveLength(2);
    expect(html.match(/class="kg3-link"/g)).toHaveLength(EDGES.length);
    expect(html).not.toContain('data-tier="near"');
    // 펼친 분야(층 그림)는 아직 없습니다.
    expect(html).not.toContain('class="kg3-dv"');
    expect(html).toContain('data-mode="overview"');
    expect(html).toContain("넓게 보기");
    expect(html).not.toContain("숙련도나 성과를 뜻하지 않습니다");
    expect(html).not.toContain("근거를 찾은 지식 84개를 분야 8곳에 모았습니다");
    expect(html).not.toMatch(/class="[^"]*km-plane/);
    // 파일 경로·관심 오픈소스는 화면에 없습니다.
    expect(html).not.toMatch(/content\/|\.mdx|client\/src|README/);
    for (const repo of portfolioContent.starred) expect(html).not.toContain(repo.name);
  });

  it("lights up the knowledge behind a project hovered in the home list", () => {
    const html = render(<KnowledgeGraph3DRail content={portfolioContent} T={LIGHT} locale="ko" active="projects" focusNodeId="project:music-splitter-web" />);

    expect(html).toContain('data-focus-id="project:music-splitter-web"');
    for (const id of ["spleeter", "fastapi", "spring-security", "upload-pipeline", "source-separation"]) expect(html).toMatch(new RegExp(`data-id="${id}"[^>]*data-state="near"`));
    expect(html).toMatch(/data-id="arduino"[^>]*data-state="dim"/);
    expect(html).toContain("이 작업이 근거가 된 지식");
    expect(html).toContain("AI 음원 분리 웹 서비스");
    expect(html).toContain('href="/projects/music-splitter-web"');
  });

  it("switches to English and the dark theme without moving any star", () => {
    const korean = render(<KnowledgeGraph3DRail content={portfolioContent} T={LIGHT} locale="ko" active="skills" focusNodeId={null} />);
    const html = render(<KnowledgeGraph3DRail content={english} T={DARK} locale="en" active="skills" focusNodeId={null} />);

    expect(html).toContain('aria-label="3D knowledge map"');
    expect(html).toContain('<span class="kg3-domain-name">Retrieval</span>');
    expect(html).toMatch(/class="kg3-core-label"[^>]*><b[^>]*>Me<\/b><\/span>/);
    expect(html).toContain("Wide view");
    expect(html).toContain(DARK.green);
    const positions = (markup: string) => Array.from(markup.matchAll(/class="kg3-star" data-node-id="([^"]+)"[^>]*style="left:([\d.]+)px;top:([\d.]+)px/g), (match) => match.slice(1).join(" "));
    expect(positions(html).length).toBe(98);
    expect(positions(html)).toEqual(positions(korean));
  });

  it("shows a non-interactive globe with the centre and field names in the mobile drawer and a button to open the wide view", () => {
    const html = render(<KnowledgeGraph3DDrawer content={portfolioContent} T={LIGHT} locale="ko" active="about" focusNodeId={null} />);

    expect(html).toContain('class="mobile-knowledge-section km-root km-drawer kg3-drawer"');
    expect(html).toContain("3D 지식 지도 열기");
    expect(html).not.toContain('role="group"');
    expect(html).not.toContain("kg3-star");
    expect(html).toContain("kg3-domain kg3-static-domain");
    expect(html).toContain('class="kg3-core-label"');
  });

  it("keeps motion restrained: no perpetual animation, with reduced-motion and touch rules", () => {
    expect(css).not.toMatch(/infinite/);
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (pointer: coarse)");
    expect(css).toContain("touch-action: none");
    // 펼친 분야는 터치로 세로 스크롤합니다.
    expect(css).toContain("touch-action: pan-y");
  });
});

describe("computeScene3d — the globe", () => {
  it("paints and stacks far to near, drawing the centre between the far and the near stars, sizing and fading by depth only", () => {
    const { scene, graph } = railScene("ko", 252);
    const depths = scene.order.map((id) => scene.points.get(id)!.depth);
    for (let index = 1; index < depths.length; index += 1) expect(depths[index]).toBeLessThanOrEqual(depths[index - 1]);
    expect(scene.behind).toBeGreaterThan(10);
    expect(scene.behind).toBeLessThan(scene.order.length - 10);
    // 같은 종류라면 가까운 점이 더 크고 진합니다 (연결이 많다고 커지지 않음).
    const techs = graph.nodes.filter((node) => node.kind === "tech" && node.status === "evidenced").map((node) => scene.points.get(node.id)!);
    const nearest = techs.reduce((a, b) => (a.depth < b.depth ? a : b));
    const farthest = techs.reduce((a, b) => (a.depth > b.depth ? a : b));
    expect(nearest.r).toBeGreaterThan(farthest.r);
    expect(nearest.fog).toBeGreaterThan(farthest.fog);
    // 정리 선은 가운데에서 분야 묶음 가운데로 — 분야마다 하나
    expect(scene.spokes.map((spoke) => spoke.domain).sort()).toEqual(graph.domains.map((domain) => domain.id).sort());
  });

  it("shows the centre name and every field name at the opening view in every rail width and language, all tidy", () => {
    for (const locale of ["ko", "en"] as const) {
      for (const width of RAIL_WIDTHS) {
        const height = Math.round(width * RAIL_ASPECT);
        for (const emphasis of [null, "tech", "studied"] as Emphasis3D[]) {
          const { scene, graph } = railScene(locale, width, { emphasis });
          expectTidyLabels(scene, width, height, `${locale} ${width} ${emphasis}`);
          for (const domain of graph.domains) expect(scene.labels.has(domain.key), `${locale} ${width} ${emphasis} ${domain.id}\n${ascii(scene, width, height)}`).toBe(true);
          // 레일은 분야 이름만 — 읽는 섹션에 따라 점만 밝아지고 이름이 더해지지 않습니다.
          expect(Array.from(scene.labels.keys()).every((id) => id.startsWith("domain:")), `${locale} ${width} ${emphasis}`).toBe(true);
          expect(scene.core.box.left).toBeGreaterThanOrEqual(0);
          expect(scene.core.box.left + scene.core.box.width).toBeLessThanOrEqual(width);
        }
      }
    }
  });

  it("previews a field without moving the centre and adds only the pointed star's name", () => {
    for (const width of RAIL_WIDTHS) {
      const height = Math.round(width * RAIL_ASPECT);
      const { graph, scene: idle } = railScene("ko", width);
      for (const domain of graph.domains) {
        const { scene } = railScene("ko", width, { focusId: domain.key });
        expectTidyLabels(scene, width, height, `${width} ${domain.id}`);
        expect(scene.labels.has(domain.key)).toBe(true);
        expect(scene.core).toEqual(idle.core);
        expect(scene.hood?.kind).toBe("domain");
        for (const id of domain.members) expect(scene.states.get(id)).toBe("near");
        const star = domain.members[0];
        const { scene: pointed } = railScene("ko", width, { focusId: domain.key, starId: star });
        // 가리킨 별의 이름만 더하고, 분야 이름표는 하나도 옮기지 않습니다.
        for (const [id, label] of Array.from(scene.labels.entries())) expect(pointed.labels.get(id)?.box, `${width} ${domain.id} ${id}`).toEqual(label.box);
        expect(pointed.labels.has(star), `${width} ${star}`).toBe(true);
      }
    }
  });

  it("hides the opened field's stars from the globe while it unfolds into layers", () => {
    const { scene, graph } = railScene("ko", 240, { focusId: domainKey("retrieval"), hiddenDomain: "retrieval" });
    expect(scene.labels.has(domainKey("retrieval"))).toBe(false);
    expect(graph.domains.filter((domain) => domain.id !== "retrieval").every((domain) => scene.labels.has(domain.key))).toBe(true);
  });

  it("does not tangle labels while the globe is turned to any direction", () => {
    const { layout } = setup("ko");
    for (let step = 0; step < 24; step += 1) {
      const camera = { ...defaultCamera(layout), yaw: layout.yaw + (step / 24) * Math.PI * 2 };
      for (const focusId of [null, domainKey("media"), "project:smartfarm-rag"]) {
        const { scene, view } = railScene("ko", 240, { camera, focusId });
        expectTidyLabels(scene, view.width, view.height, `${step} ${focusId}`);
        // 아무것도 고르지 않았을 때 어느 방향에서도 분야 이름 대부분이 보입니다.
        if (!focusId) expect(scene.domains.filter((item) => scene.labels.has(item.domain.key)).length, `${step}\n${ascii(scene, view.width, view.height)}`).toBeGreaterThanOrEqual(6);
      }
    }
  });
});

describe("wide view globe and mobile thumbnail", () => {
  const { graph, layout } = setup("ko");
  const explorer = (zoom: number) => {
    const view = fitView(layout, 760, 560, CANVAS_PADDING.explorer);
    const core = coreLabelSize("explorer", names.ko, graph3dCopy("ko").coreCaption);
    const scene = computeScene3d({ graph, layout, view, camera: { ...defaultCamera(layout), zoom }, variant: "explorer", focusId: null, depth: 2, emphasis: null, density: "rich", core });
    return { scene, view };
  };
  const named = (scene: ReturnType<typeof computeScene3d>, kind: "tech" | "concept" | "method") => graph.nodes.filter((node) => node.kind === kind && scene.labels.has(node.id)).length;

  it("starts the wide view with fields, concepts and methods around the centre, and adds technology names as it zooms in", () => {
    const wide = explorer(1);
    const close = explorer(2);
    expectTidyLabels(wide.scene, wide.view.width, wide.view.height, "zoom 1");
    expectTidyLabels(close.scene, close.view.width, close.view.height, "zoom 2");
    for (const domain of graph.domains) expect(wide.scene.labels.has(domain.key), `${domain.id}\n${ascii(wide.scene, wide.view.width, wide.view.height, 110)}`).toBe(true);
    expect(named(wide.scene, "concept") + named(wide.scene, "method")).toBeGreaterThan(20);
    expect(named(wide.scene, "tech")).toBe(0);
    expect(named(close.scene, "tech")).toBeGreaterThan(12);
    expect(close.scene.labels.size).toBeGreaterThan(wide.scene.labels.size);
  });

  it("keeps the mobile thumbnail to the centre and field names", () => {
    const view = fitView(layout, 300, 330, CANVAS_PADDING.drawer);
    const core = coreLabelSize("drawer", names.ko, graph3dCopy("ko").coreCaption);
    const scene = computeScene3d({ graph, layout, view, camera: defaultCamera(layout), variant: "drawer", focusId: null, depth: 1, emphasis: null, density: "quiet", core });
    expect(Array.from(scene.labels.keys()).sort()).toEqual(graph.domains.map((domain) => domain.key).sort());
  });
});

describe("navigateDomains", () => {
  const { graph } = setup("ko");
  const { scene } = railScene("ko", 252);
  const targets = new Map<string, NavTarget>();
  for (const item of scene.domains) targets.set(item.domain.key, { id: item.domain.key, x: item.x, y: item.y });

  it("moves between fields in the pressed direction on screen, and through them in order with Home, End, PageUp and PageDown", () => {
    for (const domain of graph.domains) {
      for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const) {
        const next = navigateDomains(graph, targets, domain.key, key);
        expect(next.startsWith("domain:")).toBe(true);
        if (next === domain.key) continue;
        const from = targets.get(domain.key)!;
        const to = targets.get(next)!;
        if (key === "ArrowLeft") expect(to.x).toBeLessThan(from.x);
        if (key === "ArrowRight") expect(to.x).toBeGreaterThan(from.x);
        if (key === "ArrowUp") expect(to.y).toBeLessThan(from.y);
        if (key === "ArrowDown") expect(to.y).toBeGreaterThan(from.y);
      }
    }
    const order = graph.domains.map((domain) => domain.key);
    expect(navigateDomains(graph, targets, order[3], "Home")).toBe(order[0]);
    expect(navigateDomains(graph, targets, order[3], "End")).toBe(order[order.length - 1]);
    expect(navigateDomains(graph, targets, order[0], "PageDown")).toBe(order[1]);
    expect(navigateDomains(graph, targets, order[0], "PageUp")).toBe(order[order.length - 1]);
  });
});
