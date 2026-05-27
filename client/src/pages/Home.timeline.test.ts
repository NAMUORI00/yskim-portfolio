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

    expect(source).toContain("function buildTimelineChipItems");
    expect(block).toContain('className="timeline-connection-list"');
    expect(block).toContain('className="timeline-connection-entry"');
    expect(block).toContain('className="timeline-entry-toggle"');
    expect(block).toContain("aria-expanded");
    expect(block).toContain('className="timeline-toggle-icon"');
    expect(block).toContain('className="timeline-entry-summary"');
    expect(block).toContain('className={isExpanded ? "timeline-entry-detail expanded" : "timeline-entry-detail collapsed"}');
    expect(block).toContain('className="timeline-chip-connector"');
    expect(block).toContain('className="timeline-chip-panel"');
    expect(block).toContain("timelineChipItems");
    expect(block).not.toContain("timelineLinks.map");
    expect(block).not.toContain("relatedProjects.map");
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

  it("keeps expanded content structured, readable, and unclipped", () => {
    const block = timelineBlock();

    expect(block).toContain('className="timeline-entry-note"');
    expect(block).toContain('className="timeline-entry-bullets"');
    expect(block).not.toContain('detailParts.join(" ")');
    expect(source).toContain(".timeline-entry-detail.expanded");
    expect(source).toContain("max-height: none");
    expect(source).not.toContain("max-height: 18rem");
    expect(source).not.toContain("opacity: 0.72");
    expect(source).not.toContain("margin-top: 2.35rem");
  });
});
