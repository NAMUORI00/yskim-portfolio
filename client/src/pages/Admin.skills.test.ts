import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Admin.tsx", import.meta.url), "utf8");

describe("Admin skills editor source", () => {
  it("uses compact chip rows for skill items instead of one full input row per skill", () => {
    const skillsStart = source.lastIndexOf('if (active === "skills")');
    const skillsEnd = source.indexOf('active === "starred"', skillsStart);
    const skillsBlock = source.slice(skillsStart, skillsEnd);

    expect(skillsBlock).toContain('className="admin-skill-chip-list"');
    expect(skillsBlock).toContain('className="admin-skill-chip"');
    expect(skillsBlock).toContain('className="admin-skill-add-form"');
    expect(skillsBlock).toContain("handleSkillAddKeyDown");
    expect(skillsBlock).not.toContain('className="admin-inline-row"');
  });

  it("lets GitHub inferred skills be added one by one into a selected group", () => {
    const importStart = source.indexOf('scope === "skills"');
    const importEnd = source.indexOf('scope === "starred"', importStart);
    const importBlock = source.slice(importStart, importEnd);

    expect(importBlock).toContain("skillCandidateTargetIndex");
    expect(importBlock).toContain("applySkillCandidateItem");
    expect(importBlock).toContain('className="admin-skill-candidate-chip"');
  });
});
