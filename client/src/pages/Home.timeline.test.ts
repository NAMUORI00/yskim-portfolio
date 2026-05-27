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

  it("uses a connected B-type expandable timeline structure", () => {
    const block = timelineBlock();

    expect(block).toContain('className="timeline-connection-list"');
    expect(block).toContain('className="timeline-connection-entry"');
    expect(block).toContain('className="timeline-entry-toggle"');
    expect(block).toContain("aria-expanded");
    expect(block).toContain('className="timeline-entry-summary"');
    expect(block).toContain('className={isExpanded ? "timeline-entry-detail expanded" : "timeline-entry-detail collapsed"}');
    expect(block).toContain('className="timeline-chip-connector"');
    expect(block).toContain('className="timeline-chip-panel"');
    expect(block).toContain("timelineLinks");
    expect(block).toContain("relatedProjects");
    expect(source).toContain("function isCvArchiveHref");
    expect(source).toContain("expandedTimelineKeys");
    expect(source).toContain("toggleTimelineEntry");
  });

  it("keeps archive detail on the main page instead of depending on a CV link or auto-scroll panel", () => {
    const block = timelineBlock();

    expect(block).not.toContain('previewHref("/cv")');
    expect(block).not.toContain('className="timeline-focus-panel"');
    expect(source).not.toContain("function useTimelineFocusScroll");
    expect(source).not.toContain("TIMELINE_AUTOSCROLL_STEP");
  });
});
