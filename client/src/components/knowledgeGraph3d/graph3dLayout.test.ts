import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { localizePortfolioContent } from "@/lib/i18nContent";
import { buildKnowledgeGraph, type KnowledgeGraph } from "./graph3dModel";
import {
  anchorSlots,
  bridgeFraction,
  CAMERA_DISTANCE,
  clampCamera,
  CORE_LABEL,
  coreLabelBox,
  DEFAULT_PITCH,
  defaultCamera,
  domainAnchors,
  domainLabelMisses,
  equatorPath,
  fitView,
  forwardCamera,
  initialPositions,
  labelPriority3d,
  layoutGraph3D,
  nodeRadius,
  normalizeLayout,
  PITCH_LIMITS,
  placeLabels3d,
  projectDomains,
  projectPoint,
  RAIL_ASPECT,
  RAIL_PADDING,
  RAIL_WIDTHS,
  relax,
  zoomAt,
  ZOOM_LIMITS,
  type Camera3D,
  type LabelRequest3D,
  type Vec3,
} from "./graph3dLayout";
import type { LabelBox } from "@/components/knowledgeMap/knowledgeMapLayout";

const ko = buildKnowledgeGraph(portfolioContent, portfolioContent, "ko");
const en = buildKnowledgeGraph(portfolioContent, localizePortfolioContent(portfolioContent, englishTranslations, "en"), "en");
const layout = layoutGraph3D(ko);
const at = (id: string) => layout.positions.get(id)!;
const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/** 대칭 3×3 행렬의 고윳값 (야코비 회전) — 점들이 평면이나 선으로 납작해지지 않았는지 봅니다 */
function eigenvalues(matrix: number[][]): number[] {
  const a = matrix.map((row) => [...row]);
  for (let sweep = 0; sweep < 40; sweep += 1) {
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      if (Math.abs(a[p][q]) < 1e-12) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k += 1) {
        const [kp, kq] = [a[k][p], a[k][q]];
        a[k][p] = c * kp - s * kq;
        a[k][q] = s * kp + c * kq;
      }
      for (let k = 0; k < 3; k += 1) {
        const [pk, qk] = [a[p][k], a[q][k]];
        a[p][k] = c * pk - s * qk;
        a[q][k] = s * pk + c * qk;
      }
    }
  }
  return [a[0][0], a[1][1], a[2][2]].sort((x, y) => y - x);
}

function covariance(points: Vec3[]): number[][] {
  const centre = { x: mean(points.map((p) => p.x)), y: mean(points.map((p) => p.y)), z: mean(points.map((p) => p.z)) };
  const rows = points.map((p) => [p.x - centre.x, p.y - centre.y, p.z - centre.z]);
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => mean(rows.map((row) => row[i] * row[j]))));
}

function overlaps(a: LabelBox, b: LabelBox): boolean {
  return a.left < b.left + b.width - 0.5 && b.left < a.left + a.width - 0.5 && a.top < b.top + b.height - 0.5 && b.top < a.top + a.height - 0.5;
}

/** 자기 분야 가운데가 다른 분야 가운데보다 가까운 노드의 비율 (다리 노드 제외) */
function clusterPurity(graph: KnowledgeGraph): number {
  const members = graph.nodes.filter((node) => bridgeFraction(graph, node.id) < 0.5);
  const inside = members.filter((node) => {
    const own = distance(at(node.id), layout.centers.get(node.domain)!);
    return graph.domains.every((domain) => domain.id === node.domain || distance(at(node.id), layout.centers.get(domain.id)!) > own);
  });
  return inside.length / members.length;
}

describe("layoutGraph3D", () => {
  it("is deterministic (no randomness) and identical in both languages", () => {
    const anchors = domainAnchors(ko);
    const fresh = normalizeLayout(ko, relax(ko, anchors, initialPositions(ko, anchors)));
    expect(fresh).toEqual(layout.positions);
    const english = layoutGraph3D(en);
    expect(english.positions).toEqual(layout.positions);
    expect(english.yaw).toBe(layout.yaw);
  });

  it("forms one legible cluster per field, with the clusters apart from each other", () => {
    expect(clusterPurity(ko)).toBeGreaterThan(0.9);
    const ids = ko.domains.map((domain) => domain.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const gap = distance(layout.centers.get(ids[i])!, layout.centers.get(ids[j])!);
        expect(gap, `${ids[i]} ↔ ${ids[j]}`).toBeGreaterThan(0.9 * (layout.spread.get(ids[i])! + layout.spread.get(ids[j])!));
      }
    }
  });

  it("fills a real 3D volume — not a plane, not stacked sheets — with fields placed all around", () => {
    const [major, middle, minor] = eigenvalues(covariance(Array.from(layout.positions.values())));
    expect(minor / major).toBeGreaterThan(0.3);
    expect(middle / major).toBeGreaterThan(0.4);
    // 분야 가운데들도 위아래·앞뒤로 퍼져 있습니다 (한 줄·한 판이 아님).
    const [cMajor, , cMinor] = eigenvalues(covariance(Array.from(layout.centers.values())));
    expect(cMinor / cMajor).toBeGreaterThan(0.25);
    expect(anchorSlots(8).map((slot) => slot.y)).toEqual([...anchorSlots(8).map((slot) => slot.y)].sort((a, b) => b - a));
  });

  it("keeps linked knowledge close and lets cross-field bridges sit between their fields", () => {
    const linked: number[] = [];
    const linkedPairs = new Set(ko.links.map((link) => `${link.source}|${link.target}`));
    const unlinked: number[] = [];
    for (let i = 0; i < ko.nodes.length; i += 1) {
      for (let j = i + 1; j < ko.nodes.length; j += 1) {
        const a = ko.nodes[i].id;
        const b = ko.nodes[j].id;
        (linkedPairs.has(`${a}|${b}`) || linkedPairs.has(`${b}|${a}`) ? linked : unlinked).push(distance(at(a), at(b)));
      }
    }
    expect(mean(linked)).toBeLessThan(0.6 * mean(unlinked));
    // Python 은 AI·ML 묶음에 있지만 다른 분야와 많이 이어져 있어, 순수한 AI·ML 노드보다 다른 분야 쪽으로 나와 있습니다.
    const ml = layout.centers.get("ml")!;
    expect(distance(at("python"), ml)).toBeGreaterThan(distance(at("hydra"), ml));
  });

  it("keeps every node apart in space", () => {
    const points = Array.from(layout.positions.values());
    let closest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) closest = Math.min(closest, distance(points[i], points[j]));
    expect(closest).toBeGreaterThan(0.06);
  });

  it("opens on a view where every field name fits the rail around the centre name, from the narrowest to the widest, in both languages", () => {
    expect(domainLabelMisses(ko, layout, layout.yaw)).toBe(0);
  });

  it("is a globe around the person: the centre stays clear, every field sits on the shell around it, all around", () => {
    // 가운데(원점)는 사람 자리 — 어느 노드도 가운데 가까이 오지 않습니다.
    const nearest = Math.min(...ko.nodes.map((node) => Math.hypot(at(node.id).x, at(node.id).y, at(node.id).z)));
    expect(nearest).toBeGreaterThan(0.4);
    // 분야 묶음 가운데는 모두 겉면 근처(원점에서 비슷한 거리)에 있습니다.
    const radii = ko.domains.map((domain) => Math.hypot(layout.centers.get(domain.id)!.x, layout.centers.get(domain.id)!.y, layout.centers.get(domain.id)!.z));
    expect(Math.min(...radii) / Math.max(...radii)).toBeGreaterThan(0.6);
    // 분야가 위·아래·앞·뒤로 둘러쌉니다 (분야 가운데들의 평균이 거의 원점).
    const centres = ko.domains.map((domain) => layout.centers.get(domain.id)!);
    const middle = { x: mean(centres.map((c) => c.x)), y: mean(centres.map((c) => c.y)), z: mean(centres.map((c) => c.z)) };
    expect(Math.hypot(middle.x, middle.y, middle.z)).toBeLessThan(0.25);
    expect(layout.shell).toBeGreaterThan(0.5);
    expect(layout.shell).toBeLessThanOrEqual(1);
  });

  it("keeps field clusters off the centre name at the opening view, in every rail width", () => {
    for (const width of RAIL_WIDTHS) {
      const view = fitView(layout, width, Math.round(width * RAIL_ASPECT), RAIL_PADDING);
      const camera = defaultCamera(layout);
      const core = coreLabelBox(view, camera, CORE_LABEL.width, CORE_LABEL.height);
      for (const { domain, point } of projectDomains(ko, layout, view, camera)) {
        const inside = point.x > core.left && point.x < core.left + core.width && point.y > core.top && point.y < core.top + core.height;
        expect(inside, `${width} ${domain.id}`).toBe(false);
      }
    }
  });

  it("brings a chosen field forward to the middle of the view before it unfolds", () => {
    const view = fitView(layout, 252, Math.round(252 * RAIL_ASPECT), RAIL_PADDING);
    for (const domain of ko.domains) {
      const camera = forwardCamera(layout, domain.id);
      const centre = projectPoint(view, camera, layout, layout.centers.get(domain.id)!);
      // 가로 가운데, 카메라 쪽(원근 배율 1 이상), 세로도 가운데 근처
      expect(Math.abs(centre.x - view.cx), domain.id).toBeLessThan(0.5);
      expect(centre.scale, domain.id).toBeGreaterThan(1);
      expect(Math.abs(centre.y - view.cy), domain.id).toBeLessThan(view.height * 0.2);
      // 다른 분야보다 앞에 있습니다.
      for (const other of ko.domains) {
        if (other.id === domain.id) continue;
        expect(projectPoint(view, camera, layout, layout.centers.get(other.id)!).depth, `${domain.id} ${other.id}`).toBeGreaterThan(centre.depth);
      }
    }
  });

  it("draws the equator ring as a closed path around the centre", () => {
    const view = fitView(layout, 252, Math.round(252 * RAIL_ASPECT), RAIL_PADDING);
    const path = equatorPath(view, defaultCamera(layout), layout);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.trim().endsWith("Z")).toBe(true);
    expect(path.match(/L /g)).toHaveLength(47);
  });
});

describe("perspective projection", () => {
  const view = fitView(layout, 252, Math.round(252 * RAIL_ASPECT), RAIL_PADDING);
  const camera = defaultCamera(layout);

  it("draws nearer points larger and clearer, and the orbit centre at the projection centre", () => {
    const centre = projectPoint(view, camera, layout, { x: 0, y: 0, z: 0 });
    expect(centre.x).toBeCloseTo(view.cx);
    expect(centre.y).toBeCloseTo(view.cy);
    expect(centre.scale).toBeCloseTo(1);
    const projected = ko.nodes.map((node) => projectPoint(view, camera, layout, at(node.id))).sort((a, b) => a.depth - b.depth);
    for (let index = 1; index < projected.length; index += 1) {
      expect(projected[index].scale).toBeLessThanOrEqual(projected[index - 1].scale);
      expect(projected[index].fog).toBeLessThanOrEqual(projected[index - 1].fog);
    }
    expect(projected[0].scale / projected[projected.length - 1].scale).toBeGreaterThan(1.3);
  });

  it("keeps the map inside the rail while orbiting through every direction and the whole tilt range", () => {
    const points = Array.from(layout.positions.values());
    for (const width of RAIL_WIDTHS) {
      const height = Math.round(width * RAIL_ASPECT);
      const fit = fitView(layout, width, height, RAIL_PADDING);
      const extent = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
      for (let step = 0; step < 48; step += 1) {
        for (const pitch of [PITCH_LIMITS[0], DEFAULT_PITCH, (PITCH_LIMITS[0] + PITCH_LIMITS[1]) / 2, PITCH_LIMITS[1]]) {
          const turned: Camera3D = { ...camera, yaw: (step / 48) * Math.PI * 2 + 0.05, pitch };
          for (const point of points) {
            const p = projectPoint(fit, turned, layout, point);
            extent.left = Math.min(extent.left, p.x);
            extent.right = Math.max(extent.right, p.x);
            extent.top = Math.min(extent.top, p.y);
            extent.bottom = Math.max(extent.bottom, p.y);
          }
        }
      }
      expect(extent.left).toBeGreaterThanOrEqual(RAIL_PADDING.padX - 1.5);
      expect(extent.right).toBeLessThanOrEqual(width - RAIL_PADDING.padX + 1.5);
      expect(extent.top).toBeGreaterThanOrEqual(RAIL_PADDING.padTop - 1.5);
      expect(extent.bottom).toBeLessThanOrEqual(height - RAIL_PADDING.padBottom + 1.5);
      // 맞춤이 헐겁지 않습니다 — 그래프가 레일 폭이나 높이 가운데 한쪽을 거의 다 씁니다.
      const usedWidth = (extent.right - extent.left) / (width - 2 * RAIL_PADDING.padX);
      const usedHeight = (extent.bottom - extent.top) / (height - RAIL_PADDING.padTop - RAIL_PADDING.padBottom);
      expect(Math.max(usedWidth, usedHeight)).toBeGreaterThan(0.9);
      expect(Math.min(usedWidth, usedHeight)).toBeGreaterThan(0.7);
    }
  });

  it("zooms around the pointer and only lets a zoomed view pan", () => {
    const point = at("channel-control");
    const before = projectPoint(view, camera, layout, point);
    const zoomed = zoomAt(camera, view, 1.6, before.x, before.y);
    const after = projectPoint(view, zoomed, layout, point);
    expect(zoomed.zoom).toBeCloseTo(1.6);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(clampCamera({ ...camera, panX: 80, panY: -80 }, view)).toMatchObject({ panX: 0, panY: 0 });
    expect(clampCamera({ ...camera, zoom: 9, pitch: 3 }).zoom).toBe(ZOOM_LIMITS[1]);
    expect(clampCamera({ ...camera, zoom: 9, pitch: 3 }).pitch).toBe(PITCH_LIMITS[1]);
    expect(CAMERA_DISTANCE).toBeGreaterThan(layout.radius * 2.5);
  });
});

describe("placeLabels3d", () => {
  const bounds = { left: 0, top: 0, width: 200, height: 120 };

  it("never overlaps two labels, keeps them inside, and places higher priority first", () => {
    const requests: LabelRequest3D[] = Array.from({ length: 14 }, (_, index) => ({
      id: `n${index}`,
      x: 20 + (index % 7) * 26,
      y: 30 + Math.floor(index / 7) * 34,
      radius: 4,
      width: 46,
      height: 15,
      priority: index === 13 ? 99 : 10,
      sides: ["right", "left", "above", "below"],
    }));
    const placed = placeLabels3d(requests, bounds, []);
    expect(placed.has("n13")).toBe(true);
    const boxes = Array.from(placed.values(), (label) => label.box);
    expect(boxes.length).toBeGreaterThan(5);
    boxes.forEach((box, index) => {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.left + box.width).toBeLessThanOrEqual(200);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.top + box.height).toBeLessThanOrEqual(120);
      for (const other of boxes.slice(index + 1)) expect(overlaps(box, other)).toBe(false);
    });
  });

  it("writes a field name over its cluster when nothing is chosen, but keeps it off highlighted dots otherwise", () => {
    const dot = { id: "dot", x: 100, y: 60, r: 4 };
    const field = { id: "field", x: 100, y: 60, radius: 10, width: 60, height: 18, priority: 900, sides: ["center", "above", "below"] as const };
    expect(placeLabels3d([{ ...field, sides: [...field.sides], dotCost: 0 }], bounds, [dot]).get("field")!.side).toBe("center");
    expect(placeLabels3d([{ ...field, sides: [...field.sides] }], bounds, [dot]).get("field")!.side).not.toBe("center");
  });
});

describe("node size and label threshold", () => {
  it("sizes dots by kind only — never by how many links or sources a node has", () => {
    const radii = new Map<string, Set<number>>();
    for (const node of ko.nodes) {
      const key = `${node.kind}:${node.status === "evidenced"}`;
      radii.set(key, new Set([...Array.from(radii.get(key) ?? []), nodeRadius(node)]));
    }
    for (const [key, values] of Array.from(radii.entries())) expect(values.size, key).toBe(1);
    expect(nodeRadius(ko.byId.get("python")!)).toBe(nodeRadius(ko.byId.get("vite")!));
    expect((ko.neighbors.get("python") ?? []).length).toBeGreaterThan((ko.neighbors.get("vite") ?? []).length);
  });

  const context = { hood: null, emphasis: null, density: "quiet" as const, zoom: 1 };
  const labelled = (overrides: Partial<Parameters<typeof labelPriority3d>[1]>) =>
    ko.nodes.filter((node) => labelPriority3d(node, { ...context, ...overrides }) !== null).map((node) => node.id);

  it("shows only field names in the quiet rail, adding technologies or studied knowledge for the section being read", () => {
    expect(labelled({})).toEqual([]);
    expect(labelled({ emphasis: "tech" })).toEqual(expect.arrayContaining(["python", "fastapi", "arduino"]));
    expect(labelled({ emphasis: "tech" })).not.toContain("docker");
    expect(labelled({ emphasis: "studied" })).toEqual(expect.arrayContaining(["channel-control", "selective-prediction", "evidence-tracing"]));
    expect(labelled({ emphasis: "studied" })).not.toContain("crud");
  });

  it("reveals more names as the wide view zooms in, with interest and stack-only items last", () => {
    const wide = labelled({ density: "rich" });
    const closer = labelled({ density: "rich", zoom: 1.5 });
    const closest = labelled({ density: "rich", zoom: 2.2 });
    expect(wide.length).toBeLessThan(closer.length);
    expect(closer.length).toBeLessThan(closest.length);
    expect(closest).toHaveLength(ko.nodes.length);
    expect(wide).not.toContain("python");
    expect(closer).not.toContain("docker");
  });
});
