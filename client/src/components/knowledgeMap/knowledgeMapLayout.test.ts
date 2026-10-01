import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { localizePortfolioContent } from "@/lib/i18nContent";
import { buildKnowledgeMap } from "./knowledgeMapModel";
import {
  computeViewport,
  focusPath,
  labelPriority,
  layerTitleBox,
  layoutFloorPlan,
  minimumLayerGap,
  navigateMap,
  placeLabels,
  planeCorners,
  planeTopAt,
  projectPoint,
  RAIL_CAMERA,
  type FloorPoint,
  type LabelBox,
  type LabelRequest,
  type ScreenPoint,
} from "./knowledgeMapLayout";

const ko = buildKnowledgeMap(portfolioContent, portfolioContent, "ko");
const en = buildKnowledgeMap(portfolioContent, localizePortfolioContent(portfolioContent, englishTranslations, "en"), "en");
const plan = layoutFloorPlan(ko);
const spec = { width: 260, camera: RAIL_CAMERA, padX: 6, padTop: 24, padBottom: 10, clearance: 36 };

function centroid(points: FloorPoint[]): FloorPoint {
  return { u: points.reduce((sum, point) => sum + point.u, 0) / points.length, v: points.reduce((sum, point) => sum + point.v, 0) / points.length };
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}

describe("layoutFloorPlan", () => {
  it("is deterministic, language-independent and stays on the plane", () => {
    expect(layoutFloorPlan(ko)).toEqual(plan);
    expect(layoutFloorPlan(en)).toEqual(plan);
    for (const point of Array.from(plan.values())) {
      expect(Math.abs(point.u)).toBeLessThanOrEqual(0.93);
      expect(Math.abs(point.v)).toBeLessThanOrEqual(0.9);
    }
  });

  it("puts research questions on a two-row grid with shared-project questions stacked in one column", () => {
    const research = ko.nodes.filter((node) => node.layer === "research").map((node) => plan.get(node.id)!);
    expect(new Set(research.map((point) => point.v)).size).toBe(2);
    expect(plan.get("research:rag")!.u).toBeCloseTo(plan.get("research:sensor-operations")!.u);
    expect(plan.get("research:edge-llm")!.u).toBeCloseTo(plan.get("research:audio-voice")!.u);
  });

  it("places each linked project under the questions it supports and unlinked projects in the front band", () => {
    for (const project of ko.nodes.filter((node) => node.layer === "project")) {
      const parents = (ko.above.get(project.id) ?? []).map((id) => plan.get(id)!);
      const point = plan.get(project.id)!;
      if (parents.length) {
        const anchor = centroid(parents);
        expect(Math.hypot(point.u - anchor.u, point.v - anchor.v)).toBeLessThan(0.3);
      } else {
        expect(point.v).toBeGreaterThan(0.4);
      }
    }
    // 같은 기술을 쓴 Arduino 프로젝트들은 띠 안에서 이웃합니다.
    const arduino = ["project:golden-glove", "project:smart-home-2017", "project:hangul-clock"].map((id) => plan.get(id)!.u);
    expect(Math.max(...arduino) - Math.min(...arduino)).toBeLessThan(0.6);
  });

  it("keeps nodes of the same layer apart and technologies near the projects that used them", () => {
    expect(minimumLayerGap(ko, plan, "project")).toBeGreaterThan(0.2);
    expect(minimumLayerGap(ko, plan, "tech")).toBeGreaterThan(0.14);
    const qdrant = plan.get("tech:qdrant")!;
    const aerospace = plan.get("project:aerospace-rag")!;
    expect(Math.hypot(qdrant.u - aerospace.u, qdrant.v - aerospace.v)).toBeLessThan(0.3);
  });
});

describe("projection", () => {
  it("keeps connections between layers vertical and flattens lifts when looking straight down", () => {
    const view = computeViewport(spec);
    const top = projectPoint(view, "research", { u: 0.2, v: 0.1 });
    const bottom = projectPoint(view, "tech", { u: 0.2, v: 0.1 });
    expect(bottom.x).toBeCloseTo(top.x);
    expect(bottom.y).toBeGreaterThan(top.y);
    expect(projectPoint(view, "project", { u: 0, v: 0 }, 10).y).toBeLessThan(projectPoint(view, "project", { u: 0, v: 0 }).y);
    const flat = computeViewport({ ...spec, camera: { yaw: 0, tilt: 1 } });
    expect(projectPoint(flat, "project", { u: 0, v: 0 }, 10).y).toBeCloseTo(projectPoint(flat, "project", { u: 0, v: 0 }).y);
  });

  it("fits the planes to the canvas width without the three layers touching", () => {
    const view = computeViewport(spec);
    for (const layer of ["research", "project", "tech"] as const) {
      for (const corner of planeCorners(view, layer)) {
        expect(corner.x).toBeGreaterThanOrEqual(5.9);
        expect(corner.x).toBeLessThanOrEqual(254.1);
      }
    }
    const research = planeCorners(view, "research");
    const project = planeCorners(view, "project");
    // 같은 세로줄에서 위 판의 아래 끝과 아래 판의 위 끝 사이가 비어 있습니다.
    for (let x = 40; x <= 220; x += 10) {
      const upperBottom = Math.max(...research.map((corner, index) => {
        const next = research[(index + 1) % 4];
        const low = Math.min(corner.x, next.x);
        const high = Math.max(corner.x, next.x);
        return x >= low && x <= high && high - low > 0.01 ? corner.y + ((next.y - corner.y) * (x - corner.x)) / (next.x - corner.x) : -Infinity;
      }));
      const lowerTop = planeTopAt(project, x);
      if (lowerTop !== null && Number.isFinite(upperBottom)) expect(lowerTop - upperBottom).toBeGreaterThanOrEqual(spec.clearance - 0.5);
    }
    expect(view.height).toBeGreaterThan(200);
  });

  it("unfolds from closely stacked planes without changing the canvas height", () => {
    const folded = computeViewport({ ...spec, unfold: 0 });
    const open = computeViewport({ ...spec, unfold: 1 });
    expect(folded.height).toBe(open.height);
    expect(folded.centers.tech - folded.centers.research).toBeLessThan(open.centers.tech - open.centers.research);
    expect(folded.centers.project).toBeCloseTo(open.centers.project);
  });

  it("places each layer title just above its plane's back edge", () => {
    const view = computeViewport(spec);
    for (const layer of ["research", "project", "tech"] as const) {
      const box = layerTitleBox(view, layer, 90, 16);
      const corners = planeCorners(view, layer);
      for (let x = box.left; x <= box.left + box.width; x += 3) {
        const top = planeTopAt(corners, x);
        if (top !== null) expect(box.top + box.height).toBeLessThanOrEqual(top);
      }
    }
  });
});

describe("focusPath", () => {
  it("traces a research question down to its projects and their technologies only", () => {
    const path = focusPath(ko, "research:video-qa")!;
    expect(path.nodes.has("project:mv-evirag")).toBe(true);
    expect(path.nodes.has("tech:lora")).toBe(true);
    expect(path.nodes.has("project:smartfarm-rag")).toBe(false);
    expect(path.nodes.has("research:rag")).toBe(false);
    expect(path.links.has("research:video-qa>project:mv-evirag")).toBe(true);
  });

  it("traces a technology back up to the projects that used it and their research questions", () => {
    const path = focusPath(ko, "tech:cuda")!;
    expect(Array.from(path.nodes).sort()).toEqual(["project:music-source-separation", "research:audio-voice", "research:edge-llm", "tech:cuda"].sort());
  });

  it("ignores unknown or empty ids", () => {
    expect(focusPath(ko, null)).toBeNull();
    expect(focusPath(ko, "project:missing")).toBeNull();
  });
});

describe("labelPriority", () => {
  type LabelContext = Parameters<typeof labelPriority>[2];
  const quiet: LabelContext = { path: null, focusId: null, emphasis: null, density: "quiet" };

  it("shows only research names by default and adds featured projects or shared tools for the section being read", () => {
    const labelled = (context: LabelContext) => ko.nodes.filter((node) => labelPriority(ko, node, context) !== null).map((node) => node.id);
    expect(labelled(quiet).every((id) => id.startsWith("research:"))).toBe(true);
    expect(labelled({ ...quiet, emphasis: "project" })).toEqual(expect.arrayContaining(["project:smartfarm-rag", "project:mv-evirag", "project:music-splitter-web"]));
    expect(labelled({ ...quiet, emphasis: "project" })).not.toContain("project:unity-hackathon");
    expect(labelled({ ...quiet, emphasis: "tech" })).toContain("tech:python");
    expect(labelled({ ...quiet, emphasis: "tech" })).not.toContain("tech:lora");
  });

  it("labels only the focused path while keeping other research names for orientation", () => {
    const path = focusPath(ko, "project:mv-evirag");
    const context = { path, focusId: "project:mv-evirag", emphasis: null, density: "quiet" as const };
    const priority = (id: string) => labelPriority(ko, ko.byId.get(id)!, context);
    expect(priority("project:mv-evirag")).toBe(1000);
    expect(priority("tech:lora")).toBeGreaterThan(300);
    expect(priority("research:rag")).toBe(100);
    expect(priority("project:smartfarm-rag")).toBeNull();
    expect(priority("tech:arduino")).toBeNull();
  });
});

describe("placeLabels", () => {
  const bounds = { left: 0, top: 0, width: 200, height: 120 };

  it("never overlaps two labels and keeps every label inside the canvas", () => {
    const requests: LabelRequest[] = Array.from({ length: 12 }, (_, index) => ({
      id: `n${index}`,
      x: 20 + (index % 6) * 30,
      y: 30 + Math.floor(index / 6) * 30,
      radius: 4,
      width: 46,
      height: 15,
      priority: 10,
      sides: ["right", "left", "above", "below"],
    }));
    const placed = Array.from(placeLabels(requests, bounds, []).values());
    expect(placed.length).toBeGreaterThan(3);
    for (const [index, label] of placed.entries()) {
      expect(label.box.left).toBeGreaterThanOrEqual(0);
      expect(label.box.left + label.box.width).toBeLessThanOrEqual(200);
      for (const other of placed.slice(index + 1)) expect(overlaps(label.box, other.box)).toBe(false);
    }
  });

  it("keeps clear of reserved boxes but still places a forced label", () => {
    const reserved = [{ left: 0, top: 0, width: 200, height: 120 }];
    const free = placeLabels([{ id: "a", x: 100, y: 60, radius: 4, width: 40, height: 15, priority: 1, sides: ["right"] }], bounds, [], reserved);
    expect(free.size).toBe(0);
    const forced = placeLabels([{ id: "a", x: 100, y: 60, radius: 4, width: 40, height: 15, priority: 1, sides: ["right"], force: true }], bounds, [], reserved);
    expect(forced.get("a")?.side).toBe("right");
  });

  it("slides an above label beside a neighbour instead of dropping it", () => {
    const placed = placeLabels(
      [
        { id: "left", x: 40, y: 60, radius: 4, width: 60, height: 15, priority: 2, sides: ["above"] },
        { id: "right", x: 95, y: 60, radius: 4, width: 60, height: 15, priority: 1, sides: ["above"] },
      ],
      bounds,
      [],
    );
    expect(placed.size).toBe(2);
    expect(overlaps(placed.get("left")!.box, placed.get("right")!.box)).toBe(false);
  });
});

describe("navigateMap", () => {
  const view = computeViewport(spec);
  const positions = new Map<string, ScreenPoint>(ko.nodes.map((node) => [node.id, projectPoint(view, node.layer, plan.get(node.id)!)]));

  it("moves within a layer from left to right and stops at the ends", () => {
    const research = ko.nodes.filter((node) => node.layer === "research").sort((a, b) => positions.get(a.id)!.x - positions.get(b.id)!.x);
    expect(navigateMap(ko, positions, research[0].id, "ArrowRight")).toBe(research[1].id);
    expect(navigateMap(ko, positions, research[0].id, "ArrowLeft")).toBe(research[0].id);
    expect(navigateMap(ko, positions, research[1].id, "End")).toBe(research[research.length - 1].id);
  });

  it("moves down to a connected project and up to a connected research question", () => {
    expect(ko.below.get("research:rag")).toContain(navigateMap(ko, positions, "research:rag", "ArrowDown"));
    expect(ko.above.get("project:music-source-separation")).toContain(navigateMap(ko, positions, "project:music-source-separation", "ArrowUp"));
    expect(navigateMap(ko, positions, "research:rag", "ArrowUp")).toBe("research:rag");
  });
});
