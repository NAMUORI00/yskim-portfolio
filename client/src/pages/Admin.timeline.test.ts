import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Admin.tsx", import.meta.url), "utf8");

describe("Admin timeline editor source", () => {
  const timelineStart = source.lastIndexOf('if (active === "education")');
  const timelineEnd = source.indexOf('if (active === "projects")', timelineStart);
  const timelineBlock = source.slice(timelineStart, timelineEnd);

  it("supports CV-style timeline metadata, status, and highlighting", () => {
    expect(timelineBlock).toContain("TIMELINE_TYPE_OPTIONS");
    expect(timelineBlock).toContain('label="Type"');
    expect(timelineBlock).toContain('label="Status"');
    expect(timelineBlock).toContain('label="Highlight on home"');
    expect(timelineBlock).toContain('label="Start date"');
    expect(timelineBlock).toContain('label="End date"');
  });

  it("edits timeline bullets, links, and graph relations as repeatable lists", () => {
    expect(timelineBlock).toContain("renderTimelineStringList");
    expect(timelineBlock).toContain("renderTimelineLinks");
    expect(timelineBlock).toContain('label: "Bullets"');
    expect(timelineBlock).toContain('label: "Related projects"');
    expect(timelineBlock).toContain('label: "Related skills"');
  });
});
