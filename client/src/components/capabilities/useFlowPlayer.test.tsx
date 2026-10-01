// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INLINE_STEP_MS, START_DELAY_MS } from "./flowPlayback";
import { useJourney, type Journey } from "./useFlowPlayer";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let journey: Journey | null = null;

function JourneyProbe({ count, flowKey, active = true }: { count: number; flowKey: string; active?: boolean }) {
  journey = useJourney(count, flowKey, active, INLINE_STEP_MS);
  return null;
}

let container: HTMLDivElement;
let root: Root;
let mounted = false;

const view = () => {
  if (!journey) throw new Error("journey not rendered");
  return journey;
};
const show = (count: number, flowKey: string, active = true) =>
  act(() => {
    root.render(<JourneyProbe count={count} flowKey={flowKey} active={active} />);
    mounted = true;
  });
const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (mounted) act(() => root.unmount());
  mounted = false;
  container.remove();
  journey = null;
  vi.useRealTimers();
});

describe("useJourney (자세히 보기 도식)", () => {
  it("plays once at the inline pace and leaves no timer behind; a picked step keeps the others lit", () => {
    show(3, "a");
    expect(view().playing).toBe(true);
    advance(START_DELAY_MS);
    expect(view().step).toBe(0);
    advance(INLINE_STEP_MS);
    advance(INLINE_STEP_MS);
    expect(view()).toMatchObject({ step: 2, playing: false, done: true });
    expect(vi.getTimerCount()).toBe(0);
    advance(INLINE_STEP_MS * 4);
    expect(view().step).toBe(2);
    act(() => view().pick(0));
    expect([0, 1, 2].map((index) => view().phase(index))).toEqual(["now", "on", "on"]);
  });

  it("starts again from the beginning when the flow changes", () => {
    show(3, "a");
    advance(START_DELAY_MS);
    advance(INLINE_STEP_MS);
    expect(view().step).toBe(1);
    show(4, "b");
    expect(view()).toMatchObject({ step: 0, playing: true });
    expect(view().phase(0)).toBe("off");
    advance(START_DELAY_MS);
    expect(view().phase(0)).toBe("now");
  });

  it("sets no timer while inactive and carries on once active again", () => {
    show(3, "a", false);
    advance(START_DELAY_MS * 4);
    expect(view().phase(0)).toBe("off");
    expect(vi.getTimerCount()).toBe(0);
    show(3, "a", true);
    advance(START_DELAY_MS);
    expect(view().phase(0)).toBe("now");
  });

  it("clears its timer when unmounted mid-play", () => {
    show(4, "a");
    advance(START_DELAY_MS);
    expect(vi.getTimerCount()).toBe(1);
    act(() => root.unmount());
    mounted = false;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not autoplay when reduced motion is preferred: every step lit, the first explained", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
    try {
      show(4, "a");
      expect(view()).toMatchObject({ step: 0, playing: false, done: true, reducedMotion: true });
      expect([0, 1, 2, 3].map((index) => view().phase(index))).toEqual(["now", "on", "on", "on"]);
      expect(vi.getTimerCount()).toBe(0);
      act(() => view().pick(2));
      expect(view().step).toBe(2);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      window.matchMedia = original;
    }
  });
});
