import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { LIGHT } from "@/content/theme";
import { localizePortfolioContent } from "@/lib/i18nContent";
import { CapabilityFlowSection } from "./CapabilityFlowSection";

const published = portfolioContent.projects.filter((project) => project.status === "published");

function render(locale: "ko" | "en") {
  const content = localizePortfolioContent(portfolioContent, englishTranslations, locale);
  return renderToStaticMarkup(
    <CapabilityFlowSection
      T={LIGHT}
      locale={locale}
      skills={content.skills}
      sourceSkills={portfolioContent.skills}
      projects={content.projects.filter((project) => project.status === "published")}
    />,
  );
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("CapabilityFlowSection (compact preview)", () => {
  it("lists all 17 published projects as compact rows with a wide-view action for every flow", () => {
    expect(published.length).toBe(17);
    const html = render("ko");
    expect(count(html, 'class="cfr"')).toBe(17);
    // 프로젝트 17개 흐름 + 스마트팜의 추가 흐름 2개 = 19개, 그리고 위쪽 실제 기록 카드의 재생 단추 1개
    expect(count(html, 'class="cfm-wide"')).toBe(19);
    expect(count(html, 'class="cfm-wide is-primary"')).toBe(1);
    expect(count(html, ">넓게 보기<")).toBeGreaterThanOrEqual(19);
  });

  it("makes the recorded Smartfarm example easy to find and clearly labelled", () => {
    const html = render("ko");
    expect(html).toContain('class="cff"');
    expect(html).toContain("실제 동작 기록 · 시뮬레이터");
    expect(html).toContain("2026-10-01 화면 기록 · 시뮬레이터");
    // 개발용 플러그인이 data-loc 속성을 붙일 수 있어 태그 끝(>)까지는 비교하지 않습니다.
    for (const value of ["16.0", "65.0", "72", "59"]) expect(html).toContain(`>${value}<i`);
    expect(html).toContain("판단 제외");
    expect(html).toContain("실제 농장이 아닌 시뮬레이터 기록");
    // 기록이 있는 프로젝트는 하나, 코드로 확인한 흐름은 둘, 나머지는 설명용 흐름으로 표시됩니다.
    expect(count(html, "기록된 예시 포함")).toBe(1);
    expect(count(html, 'class="cfm-badge is-code"')).toBe(2);
    expect(count(html, 'class="cfm-badge is-explanatory"')).toBe(14);
  });

  it("stays static until the wide view is opened (no dialog, no running animation)", () => {
    const html = render("ko");
    expect(html).not.toContain("cfw-dialog");
    expect(html).not.toContain("is-run");
    expect(html).not.toContain("is-now");
  });

  it("keeps the area filter anchors and the language row", () => {
    const html = render("ko");
    for (let index = 0; index <= 6; index += 1) expect(html).toContain(`id="skill-capability-${index}"`);
  });

  it("renders the English copy", () => {
    const html = render("en");
    expect(html).toContain("Wide view");
    expect(html).toContain("Play in wide view");
    expect(html).toContain("Actual run record · simulator");
    expect(html).toContain("Zone A readings");
    expect(count(html, 'class="cfr"')).toBe(17);
  });
});
