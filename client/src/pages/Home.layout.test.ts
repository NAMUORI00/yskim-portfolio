import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

describe("Home desktop rail layout", () => {
  it("keeps the desktop rails pinned to the viewport edges instead of centering the three-column shell", () => {
    const shellStart = source.indexOf("return (");
    const sidebarStart = source.indexOf('id="sidebar"', shellStart);
    const shell = source.slice(shellStart, sidebarStart);

    expect(shell).toContain('display: "flex"');
    expect(shell).not.toContain('justifyContent: "center"');
  });

  it("lets the scroll area fill the space between the fixed side rails", () => {
    const scrollStart = source.indexOf('id="scroll-area"');
    const scrollInnerStart = source.indexOf('className="scroll-inner"', scrollStart);
    const scrollArea = source.slice(scrollStart, scrollInnerStart);
    const scrollInner = source.slice(scrollInnerStart, source.indexOf(">", scrollInnerStart));

    expect(scrollArea).toContain("flex: 1");
    expect(scrollArea).not.toContain('maxWidth: "1040px"');
    expect(scrollInner).not.toContain('margin: "0 auto"');
  });
});
