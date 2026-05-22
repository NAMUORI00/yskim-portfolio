import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

function projectRowBlock() {
  const start = source.indexOf('className="proj-row"');
  const end = source.indexOf('<div className={proj.coverImage', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Home project row theme behavior", () => {
  it("keeps project row background owned by React theme state", () => {
    const block = projectRowBlock();

    expect(block).toContain("background: focusedGraphNodeId === graphNodeId ? T.bg : T.surface");
    expect(block).not.toContain("currentTarget.style.background");
  });
});
