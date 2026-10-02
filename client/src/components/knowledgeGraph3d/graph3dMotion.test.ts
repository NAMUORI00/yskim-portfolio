import { afterEach, describe, expect, it, vi } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { localizePortfolioContent } from "@/lib/i18nContent";
import { CANVAS_PADDING, computeScene3d, PREVIEW_DEPTH, type Canvas3DVariant } from "./Graph3DCanvas";
import { buildKnowledgeGraph } from "./graph3dModel";
import { defaultCamera, fitView, layoutGraph3D, RAIL_ASPECT, RAIL_WIDTHS, ZOOM_LIMITS, type Camera3D, type View3D } from "./graph3dLayout";
import {
  activeFrameSubscribers,
  approach,
  buildMotionModel,
  calmFactor,
  DRIFT_PX,
  driftAmplitude,
  glowStrength,
  motionFrame,
  nodeDrift,
  PARALLAX_MAX,
  PARALLAX_PITCH_SHARE,
  PARALLAX_PX,
  parallaxLimit,
  parallaxTarget,
  subscribeFrames,
  type MotionFrame,
} from "./graph3dMotion";
import { resolveFocus3D } from "./useGraph3DInteraction";

const graph = buildKnowledgeGraph(portfolioContent, portfolioContent, "ko");
const english = buildKnowledgeGraph(portfolioContent, localizePortfolioContent(portfolioContent, englishTranslations, "en"), "en");
const layout = layoutGraph3D(graph);
const model = buildMotionModel(graph, layout);
const still = { yaw: 0, pitch: 0 };

/** 기준 자리에서 가장 멀리 벗어난 거리 (px) */
function maxShift(frame: MotionFrame, base: MotionFrame): number {
  let worst = 0;
  for (const [id, at] of Array.from(frame.nodes.entries())) {
    const origin = base.nodes.get(id)!;
    worst = Math.max(worst, Math.hypot(at.x - origin.x, at.y - origin.y));
  }
  return worst;
}

const views: Array<{ variant: Canvas3DVariant; view: View3D; zoom: number }> = [
  ...RAIL_WIDTHS.map((width) => ({ variant: "rail" as const, view: fitView(layout, width, Math.round(width * RAIL_ASPECT), CANVAS_PADDING.rail), zoom: 1 })),
  ...[1, 1.6, ZOOM_LIMITS[1]].map((zoom) => ({ variant: "explorer" as const, view: fitView(layout, 760, 560, CANVAS_PADDING.explorer), zoom })),
];

describe("resolveFocus3D — hover, keyboard focus and pin are separate", () => {
  const none = { hoverId: null, keyboardId: null, externalId: null, pinnedId: null };

  it("previews what the pointer, then the keyboard, then the home list points at while nothing is pinned", () => {
    expect(resolveFocus3D(graph, none)).toEqual({ focusId: null, activeId: null, cueId: null, mode: "idle" });
    expect(resolveFocus3D(graph, { ...none, externalId: "project:smartfarm-rag" })).toEqual({ focusId: "project:smartfarm-rag", activeId: null, cueId: null, mode: "preview" });
    expect(resolveFocus3D(graph, { ...none, keyboardId: "lora", externalId: "project:smartfarm-rag" })).toEqual({ focusId: "lora", activeId: "lora", cueId: null, mode: "preview" });
    expect(resolveFocus3D(graph, { ...none, hoverId: "python", keyboardId: "lora" })).toEqual({ focusId: "python", activeId: "python", cueId: null, mode: "preview" });
  });

  it("keeps a pin as the focus while other items are pointed at, focused or hovered in the home list", () => {
    const pinned = { ...none, pinnedId: "channel-control" };
    expect(resolveFocus3D(graph, pinned)).toEqual({ focusId: "channel-control", activeId: null, cueId: null, mode: "pinned" });
    expect(resolveFocus3D(graph, { ...pinned, hoverId: "python" })).toEqual({ focusId: "channel-control", activeId: "python", cueId: "python", mode: "pinned" });
    expect(resolveFocus3D(graph, { ...pinned, keyboardId: "domain:media" })).toEqual({ focusId: "channel-control", activeId: "domain:media", cueId: "domain:media", mode: "pinned" });
    expect(resolveFocus3D(graph, { ...pinned, externalId: "project:music-splitter-web" })).toEqual({ focusId: "channel-control", activeId: null, cueId: null, mode: "pinned" });
    // 고정한 것을 가리키면 가벼운 표시 없이 고정 그대로, 모르는 id 는 무시합니다.
    expect(resolveFocus3D(graph, { ...pinned, hoverId: "channel-control" })).toEqual({ focusId: "channel-control", activeId: "channel-control", cueId: null, mode: "pinned" });
    expect(resolveFocus3D(graph, { ...none, pinnedId: "missing", hoverId: "lora" })).toEqual({ focusId: "lora", activeId: "lora", cueId: null, mode: "preview" });
  });
});

describe("breathing motion", () => {
  const times = Array.from({ length: 600 }, (_, index) => index * 0.5);

  it("is deterministic, never longer than one unit, and the same in both languages", () => {
    for (const t of [0, 0.7, 3.1, 9.4, 27.2, 61, 300]) {
      for (const node of graph.nodes) {
        const v = nodeDrift(model, node.id, t);
        expect(Math.hypot(v.x, v.y, v.z)).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
    expect(nodeDrift(buildMotionModel(graph, layout), "lora", 5.5)).toEqual(nodeDrift(model, "lora", 5.5));
    expect(nodeDrift(buildMotionModel(english, layoutGraph3D(english)), "lora", 5.5)).toEqual(nodeDrift(model, "lora", 5.5));
  });

  it("moves each field as one slowly breathing cluster rather than as independent jitter", () => {
    const series = (id: string) => times.map((t) => nodeDrift(model, id, t));
    const correlation = (a: string, b: string) => {
      const x = series(a);
      const y = series(b);
      let dot = 0;
      let xx = 0;
      let yy = 0;
      x.forEach((p, index) => {
        const q = y[index];
        dot += p.x * q.x + p.y * q.y + p.z * q.z;
        xx += p.x * p.x + p.y * p.y + p.z * p.z;
        yy += q.x * q.x + q.y * q.y + q.z * q.z;
      });
      return dot / Math.sqrt(xx * yy);
    };
    const members = graph.domains.map((domain) => domain.members.slice(0, 4));
    const within: number[] = [];
    const across: number[] = [];
    members.forEach((group, index) => {
      for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) within.push(correlation(group[i], group[j]));
      const other = members[(index + 1) % members.length];
      for (const a of group) for (const b of other) across.push(correlation(a, b));
    });
    const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean(within)).toBeGreaterThan(0.4);
    expect(Math.abs(mean(across))).toBeLessThan(0.15);
    // 느린 움직임: 0.5초 사이의 변화가 세기의 0.4 배 아래입니다 (레일 2.4px 기준 초당 2px 이하 — 떨림이 아님).
    for (const node of graph.nodes) {
      const path = series(node.id);
      for (let index = 1; index < path.length; index += 1) {
        expect(Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y, path[index].z - path[index - 1].z)).toBeLessThan(0.4);
      }
    }
  });
});

describe("motionFrame — one projection for dots, hit targets, links and field names", () => {
  it("equals the deterministic baseline scene when the strength is zero", () => {
    for (const { variant, view, zoom } of views) {
      const camera: Camera3D = { ...defaultCamera(layout), zoom };
      const scene = computeScene3d({ graph, layout, view, camera, variant, focusId: null, depth: PREVIEW_DEPTH, emphasis: null, density: "quiet" });
      const frame = motionFrame({ model, layout, view, camera, time: 12.3, amplitude: 0, parallax: still });
      for (const [id, point] of Array.from(scene.points.entries())) {
        expect(frame.nodes.get(id)!.x).toBeCloseTo(point.x, 9);
        expect(frame.nodes.get(id)!.y).toBeCloseTo(point.y, 9);
      }
      for (const item of scene.domains) {
        const at = frame.domains.get(item.domain.id)!;
        expect(at.x).toBeCloseTo(item.x, 9);
        expect(at.y).toBeCloseTo(item.y, 9);
        expect(at.scale).toBe(1);
      }
    }
  });

  it("keeps every point within a few pixels of its place, in every rail width and the zoomed wide view", () => {
    for (const { variant, view, zoom } of views) {
      const camera: Camera3D = { ...defaultCamera(layout), zoom };
      const base = motionFrame({ model, layout, view, camera, time: 0, amplitude: 0, parallax: still });
      const amplitude = driftAmplitude(variant, view, camera);
      const limit = parallaxLimit(variant, view, camera, layout);
      let breathing = 0;
      let tilted = 0;
      for (const time of [0.4, 2.9, 7.7, 15.2, 33.3, 71.8]) {
        breathing = Math.max(breathing, maxShift(motionFrame({ model, layout, view, camera, time, amplitude, parallax: still }), base));
        for (const parallax of [
          { yaw: limit, pitch: limit * PARALLAX_PITCH_SHARE },
          { yaw: -limit, pitch: -limit * PARALLAX_PITCH_SHARE },
        ]) {
          tilted = Math.max(tilted, maxShift(motionFrame({ model, layout, view, camera, time, amplitude, parallax }), base));
        }
      }
      // 원근 배율(가까운 점이 최대 1.4배 안팎)까지 넣어도 몇 px 안입니다.
      expect(breathing, `${variant} ${view.width} ${zoom}`).toBeLessThanOrEqual(DRIFT_PX[variant] * 1.5);
      expect(breathing, `${variant} ${view.width} ${zoom}`).toBeGreaterThan(DRIFT_PX[variant] * 0.3);
      expect(tilted, `${variant} ${view.width} ${zoom}`).toBeLessThanOrEqual((DRIFT_PX[variant] + PARALLAX_PX[variant]) * 1.5);
    }
  });

  it("tilts at most 3° toward the pointer, eases without overshooting, and never changes the user's camera", () => {
    for (const { variant, view, zoom } of views) {
      const camera: Camera3D = { ...defaultCamera(layout), zoom };
      const limit = parallaxLimit(variant, view, camera, layout);
      expect(limit).toBeGreaterThan(0);
      expect(limit).toBeLessThanOrEqual(PARALLAX_MAX);
      expect(parallaxTarget(null, view, limit)).toEqual(still);
      expect(parallaxTarget({ x: view.width / 2, y: view.height / 2 }, view, limit)).toEqual(still);
      const corner = parallaxTarget({ x: view.width * 3, y: -view.height }, view, limit);
      expect(corner.yaw).toBeCloseTo(limit);
      expect(corner.pitch).toBeCloseTo(-limit * PARALLAX_PITCH_SHARE);
      const before = { ...camera };
      motionFrame({ model, layout, view, camera, time: 3, amplitude: driftAmplitude(variant, view, camera), parallax: corner });
      expect(camera).toEqual(before);
    }
    expect(parallaxLimit("drawer", views[0].view, defaultCamera(layout), layout)).toBe(0);
    let value = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      const next = approach(value, 1, 33, 450);
      expect(next).toBeGreaterThan(value);
      expect(next).toBeLessThanOrEqual(1);
      value = next;
    }
    expect(value).toBeGreaterThan(0.95);
  });

  it("calms points near the pointer and the chosen point so click targets stay put", () => {
    expect(calmFactor(0, 14, 56)).toBe(0);
    expect(calmFactor(14, 14, 56)).toBe(0);
    expect(calmFactor(56, 14, 56)).toBe(1);
    let previous = 0;
    for (let distance = 0; distance <= 70; distance += 2) {
      const factor = calmFactor(distance, 14, 56);
      expect(factor).toBeGreaterThanOrEqual(previous);
      previous = factor;
    }
    expect(glowStrength(0, 26)).toBe(1);
    expect(glowStrength(26, 26)).toBe(0);
    const { view } = views[1];
    const camera = defaultCamera(layout);
    const base = motionFrame({ model, layout, view, camera, time: 0, amplitude: 0, parallax: still });
    const calm = new Map([["lora", 0]]);
    for (const time of [1.5, 9, 20]) {
      const frame = motionFrame({ model, layout, view, camera, time, amplitude: driftAmplitude("rail", view, camera), parallax: still, calm });
      expect(frame.nodes.get("lora")).toEqual(base.nodes.get("lora"));
      expect(frame.nodes.get("python")).not.toEqual(base.nodes.get("python"));
    }
  });
});

describe("frame clock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs one requestAnimationFrame chain for every subscriber and stops when the last one leaves", () => {
    const queue = new Map<number, FrameRequestCallback>();
    let next = 0;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      next += 1;
      queue.set(next, callback);
      return next;
    });
    vi.stubGlobal("cancelAnimationFrame", (handle: number) => queue.delete(handle));
    const calls: string[] = [];
    const stopA = subscribeFrames(() => calls.push("a"));
    const stopB = subscribeFrames(() => calls.push("b"));
    expect(queue.size).toBe(1);
    expect(activeFrameSubscribers()).toBe(2);
    for (const time of [16, 32]) {
      const callbacks = Array.from(queue.values());
      queue.clear();
      callbacks.forEach((callback) => callback(time));
      expect(queue.size).toBe(1);
    }
    expect(calls).toEqual(["a", "b", "a", "b"]);
    stopA();
    expect(queue.size).toBe(1);
    stopB();
    expect(queue.size).toBe(0);
    expect(activeFrameSubscribers()).toBe(0);
  });
});
