import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { englishTranslations, portfolioContent } from "@/content";
import { LIGHT } from "@/content/theme";
import { localizePortfolioContent, type Locale } from "@/lib/i18nContent";
import {
  CAREER_GROUP_OF_TYPE,
  CareerExpandAllButton,
  CareerRecords,
  buildCareerGroups,
  careerSplitAreas,
  splitPublicationSource,
  useCareerRecords,
  type CareerRecordsState,
} from "./CareerRecords";

function contentFor(locale: Locale) {
  return localizePortfolioContent(portfolioContent, englishTranslations, locale);
}

const entriesFor = (locale: Locale) => contentFor(locale).education.filter((entry) => entry.status === "published");
const projectsFor = (locale: Locale) => contentFor(locale).projects.filter((project) => project.status === "published");

function Harness({ locale, openAll }: { locale: Locale; openAll: boolean }) {
  const state = useCareerRecords(entriesFor(locale), projectsFor(locale), locale);
  const shown: CareerRecordsState = openAll
    ? { ...state, openKeys: new Set(state.groups.flatMap((group) => group.records.map((record) => record.key))), allOpen: true }
    : state;
  return (
    <>
      <CareerExpandAllButton state={shown} T={LIGHT} locale={locale} />
      <CareerRecords state={shown} T={LIGHT} locale={locale} />
    </>
  );
}

const render = (locale: Locale, openAll = false) => renderToStaticMarkup(<Harness locale={locale} openAll={openAll} />);

/** React 가 글자를 그릴 때와 같은 방식으로 특수 문자를 바꿉니다. */
const html = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const count = (markup: string, needle: string) => markup.split(needle).length - 1;

/** 한 묶음의 마크업 (data-group="id" 부터 다음 묶음 앞까지) */
function groupMarkup(markup: string, id: string) {
  const start = markup.indexOf(`data-group="${id}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = markup.indexOf('data-group="', start + 1);
  return markup.slice(start, next < 0 ? undefined : next);
}

describe("CareerRecords (홈 논문·연구·경력)", () => {
  it("sorts every published record into publications, research experience, paid employment and education by its type", () => {
    for (const locale of ["ko", "en"] as const) {
      const entries = entriesFor(locale);
      const groups = buildCareerGroups(entries, projectsFor(locale), locale);
      expect(groups.map((group) => group.id)).toEqual(["publications", "research", "employment", "background"]);
      // 빠지거나 겹치는 기록이 없습니다.
      expect(groups.flatMap((group) => group.records).length).toBe(entries.length);
      for (const group of groups) {
        for (const record of group.records) expect(CAREER_GROUP_OF_TYPE[record.entry.type]).toBe(group.id);
      }
    }
  });

  it("keeps the graduate student researcher in research experience, apart from the paid internships and teaching assistance", () => {
    const markup = render("ko");
    const research = groupMarkup(markup, "research");
    const employment = groupMarkup(markup, "employment");

    expect(research).toContain("연구 경험");
    expect(research).toContain("연구실 연구 참여");
    expect(research).toContain("석사과정 학생연구원");
    expect(research).toContain("연구참여확약에 따른 석사과정 연구 활동");
    expect(employment).not.toContain("학생연구원");
    expect(employment).not.toContain("머신러닝연구실");

    expect(employment).toContain("경력");
    expect(employment).not.toContain("유급 근무");
    for (const place of ["카카오 · 카카오트랙 연계 현장실습", "틸론소프트", "제주중학교", "제주과학고등학교"]) expect(employment).toContain(place);
    expect(count(employment, 'class="career-item"')).toBe(entriesFor("ko").filter((entry) => entry.type === "work").length);

    const english = render("en");
    expect(groupMarkup(english, "research")).toContain("Graduate Student Researcher");
    expect(groupMarkup(english, "research")).toContain("Lab research participation");
    expect(groupMarkup(english, "employment")).not.toContain("Graduate Student Researcher");
    expect(groupMarkup(english, "employment")).not.toContain("Paid positions");
  });

  it("marks the KCI journal paper and the conference paper as published and the IEEE Access manuscript as under review since its 2026.08 submission, all first author", () => {
    const publications = groupMarkup(render("ko"), "publications");
    expect(publications).toContain('class="career-status is-published">KCI 게재<');
    expect(publications).toContain('class="career-status is-published">발표<');
    expect(publications).toContain('class="career-status is-review">심사 중<');
    expect(publications).toContain("2026.08 투고");
    expect(publications).toContain("IEEE Access");
    expect(publications).toContain("Role-Separated Selective Response for Question Answering in Multi-View Video Surveillance");
    expect(count(publications, "제1저자")).toBe(3);
    // 심사 중인 논문을 게재로 표시하지 않습니다.
    expect(count(publications, "is-published")).toBe(2);
    expect(count(publications, "is-review")).toBe(1);

    const english = groupMarkup(render("en"), "publications");
    expect(english).toContain('class="career-status is-published">Published<');
    expect(english).toContain('class="career-status is-published">Presented<');
    expect(english).toContain('class="career-status is-review">Under review<');
    expect(english).toContain("Submitted 2026.08");
    expect(count(english, "First author")).toBe(3);
  });

  it("reads the status only from the parts after the venue name", () => {
    expect(splitPublicationSource("한국정보기술학회 하계종합학술대회 · 발표 · 제1저자")).toEqual({
      venue: "한국정보기술학회 하계종합학술대회 · 제1저자",
      status: { label: "발표", kind: "published" },
    });
    expect(splitPublicationSource("IEEE Access · Under review · First author")).toEqual({
      venue: "IEEE Access · First author",
      status: { label: "Under review", kind: "review" },
    });
    // 학술대회 이름에 '발표'가 들어 있어도 상태로 읽지 않고, 상태가 없으면 원문을 그대로 둡니다.
    expect(splitPublicationSource("학술발표대회 · 제1저자")).toEqual({ venue: "학술발표대회 · 제1저자" });
  });

  it("keeps every record's full text on the page in both languages, even while folded", () => {
    for (const locale of ["ko", "en"] as const) {
      const markup = render(locale);
      for (const entry of entriesFor(locale)) {
        expect(markup).toContain(html(entry.degree));
        expect(markup).toContain(html(entry.period));
        for (const part of entry.school.split(/\s+·\s+/)) expect(markup).toContain(html(part));
        if (entry.note) expect(markup).toContain(html(entry.note));
        for (const bullet of entry.bullets) expect(markup).toContain(html(bullet));
      }
    }
  });

  it("starts as a folded overview and 'Expand all' opens every record", () => {
    const folded = render("ko");
    const records = entriesFor("ko").length;
    // 개발용 플러그인이 태그 이름 바로 뒤에 data-loc 속성을 붙일 수 있어 속성 순서와 관계없이 셉니다.
    expect(folded.match(/<details\b[^>]*\bclass="career-record"/g) ?? []).toHaveLength(records);
    expect(count(folded, "<summary")).toBe(records);
    expect(folded).not.toContain('open=""');
    expect(folded).toContain('aria-expanded="false"');
    expect(folded).toContain('aria-controls="career-records"');
    expect(folded).toContain(">모두 펼치기<");

    const opened = render("ko", true);
    expect(count(opened, 'open=""')).toBe(records);
    expect(opened).toContain('aria-expanded="true"');
    expect(opened).toContain(">모두 접기<");
    expect(render("en")).toContain(">Expand all<");
  });

  it("puts publications on top and the other lists in two columns only on a wide content area, without a scroll box", () => {
    expect(careerSplitAreas(["publications", "research", "employment", "background"])).toBe(
      '"publications publications" "research employment" "background employment"'
    );
    expect(careerSplitAreas(["publications", "employment"])).toBeNull();
    expect(careerSplitAreas(["research", "background"])).toBeNull();

    const markup = render("ko");
    expect(markup).toContain('class="career-ledger is-split"');
    expect(markup).toContain("--career-areas:");
    // 묶음 순서: 논문 → 연구 경험 → 경력 → 학력·수상·어학
    const order = ["publications", "research", "employment", "background"].map((id) => markup.indexOf(`data-group="${id}"`));
    expect(order).toEqual([...order].sort((left, right) => left - right));

    const css = readFileSync(new URL("./careerRecords.css", import.meta.url), "utf8");
    expect(css).toContain("@container career (min-width: 42rem)");
    expect(css).toContain("grid-template-areas: var(--career-areas);");
    expect(css).not.toMatch(/overflow(-y)?:\s*(auto|scroll)/);
    expect(css).not.toMatch(/max-height/);
  });

  it("follows the home type scale (11px to 16px) and widens controls to 44px on touch screens", () => {
    const css = readFileSync(new URL("./careerRecords.css", import.meta.url), "utf8");
    const sizes = Array.from(css.matchAll(/font-size:\s*([\d.]+)rem/g), (match) => Number(match[1]));
    expect(sizes.length).toBeGreaterThan(8);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(0.6875);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(1);
    const rule = (selector: string) => css.slice(css.indexOf(`${selector} {`), css.indexOf("}", css.indexOf(`${selector} {`)));
    expect(rule(".career-record-title")).toContain("font-size: 0.9375rem;");
    expect(rule(".career-record-note")).toContain("font-size: 0.875rem;");
    expect(rule(".career-record-bullets")).toContain("font-size: 0.875rem;");
    const touch = css.slice(css.indexOf("@media (pointer: coarse)"));
    for (const selector of [".career-expand-all", ".career-chip", "summary.career-record-head"]) expect(touch).toContain(selector);
    expect(touch).toContain("min-height: 2.75rem;");
  });
});
