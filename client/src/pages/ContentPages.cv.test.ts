import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ContentPages.tsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

describe("CV timeline page source", () => {
  it("exposes a dedicated CV page backed by published timeline entries", () => {
    expect(source).toContain("export function CV");
    expect(source).toContain('status === "published"');
    expect(source).toContain("relatedProjects");
    expect(source).toContain("relatedSkills");
    expect(appSource).toContain('path={"/cv"}');
  });
});
