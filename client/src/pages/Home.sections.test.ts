import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
const previewSource = readFileSync(new URL("./CapabilitiesPreview.tsx", import.meta.url), "utf8");

function sourceBetween(text: string, startNeedle: string, endNeedle: string) {
  const start = text.indexOf(startNeedle);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe("Home technology stack and research sections", () => {
  it("names the sections '기술 스택' and '연구 관심 분야' in the page and the navigation (Korean and English)", () => {
    const navLabel = (id: string) => portfolioContent.site.navigation.find((item) => item.id === id)?.label;
    expect(navLabel("skills")).toBe("기술 스택");
    expect(navLabel("research")).toBe("연구 관심 분야");
    expect(englishTranslations.ui?.nav?.skills).toBe("Technology Stack");
    expect(englishTranslations.ui?.nav?.research).toBe("Research Interests");
    expect(source).toContain('locale === "en" ? "Technology Stack" : "기술 스택"');
    expect(source).toContain('locale === "en" ? "Research Interests" : "연구 관심 분야"');
    expect(source).not.toContain("기술로 할 수 있는 일");
  });

  it("shows the skills as a concise technology inventory without a capability showcase or project animations", () => {
    const skills = sourceBetween(source, '<SectionTitle id="skills"', "{/* ── 관심 저장소 ── */}");
    expect(skills).toContain('<dl className="stack-inventory">');
    expect(skills).toContain("SKILL_GROUPS.map((group)");
    expect(skills).toContain("group.items.map((item)");
    // 이전 개요·바로가기와 영역별 프로젝트 목록, 흐름 시안은 기술 섹션에 두지 않습니다.
    expect(source).not.toContain("relatedSkillProjects");
    expect(source).not.toContain("skill-capability-");
    expect(source).not.toContain("CapabilityFlowSection");
    expect(skills).not.toContain("/projects/");
  });

  it("keeps the local review route on the same final home arrangement", () => {
    expect(previewSource).toContain("return <HomeView />;");
    expect(previewSource).not.toContain("capabilitiesPreview");
    expect(previewSource).toContain('meta.content = "noindex, nofollow"');
    expect(source).not.toContain("capabilitiesPreview");
  });
});
