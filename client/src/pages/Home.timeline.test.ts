import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

function timelineBlock() {
  const start = source.indexOf('<SectionTitle id="education"');
  const end = source.indexOf("{/* ── 연구 관심사 ── */}", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Home timeline section", () => {
  it("shows every published timeline entry on the main page instead of only highlighted items", () => {
    const timelineDeclaration = source.match(/const TIMELINE_ENTRIES = content\.education\.filter\([^;]+;/)?.[0] ?? "";

    expect(timelineDeclaration).toContain('item.status === "published"');
    expect(timelineDeclaration).not.toContain("item.highlight");
  });

  it("uses a two-paragraph main-page timeline structure", () => {
    const block = timelineBlock();

    expect(block).toContain('className="timeline-focus-panel"');
    expect(block).toContain('className="timeline-entry-summary"');
    expect(block).toContain('className="timeline-entry-detail"');
    expect(block).toContain("relatedProjects");
  });

  it("auto-scrolls gently only while the timeline is focused or hovered and motion is allowed", () => {
    expect(source).toContain("function useTimelineFocusScroll");
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).toContain("TIMELINE_AUTOSCROLL_STEP");
    expect(source).toContain('"mouseenter"');
    expect(source).toContain('"focusin"');
    expect(source).toContain('"mouseleave"');
    expect(source).toContain('"focusout"');
    expect(source).toContain("pauseAfterUserInput");
    expect(source).toContain('"wheel"');
    expect(source).toContain('"keydown"');
    expect(source).toContain('"pointerdown"');
  });
});
