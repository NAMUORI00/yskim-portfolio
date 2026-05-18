import { describe, expect, it } from "vitest";
import { DARK, LIGHT, contrastRatio } from "./theme";

describe("portfolio theme contrast", () => {
  it("keeps light mode text readable", () => {
    expect(contrastRatio(LIGHT.text, LIGHT.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(LIGHT.sub, LIGHT.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(LIGHT.muted, LIGHT.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(LIGHT.green, LIGHT.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps dark mode text readable", () => {
    expect(contrastRatio(DARK.text, DARK.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(DARK.sub, DARK.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(DARK.muted, DARK.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(DARK.green, DARK.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
