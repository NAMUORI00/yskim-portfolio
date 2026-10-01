import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
const careerCss = readFileSync(new URL("../components/careerRecords.css", import.meta.url), "utf8");

function careerBlock() {
  const start = source.indexOf('id="education"');
  const end = source.indexOf("{/* ── 연구 관심사 ── */}", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("Home 논문·연구·경력 section", () => {
  it("shows every published record on the main page instead of only highlighted items", () => {
    const timelineDeclaration = source.match(/const TIMELINE_ENTRIES = content\.education\.filter\([^;]+;/)?.[0] ?? "";

    expect(timelineDeclaration).toContain('item.status === "published"');
    expect(timelineDeclaration).not.toContain("item.highlight");
    expect(source).toContain("useCareerRecords(TIMELINE_ENTRIES, PROJECTS, locale)");
  });

  it("splits publications, research experience, paid employment and education into separate lists instead of one mixed timeline", () => {
    const block = careerBlock();

    expect(source).toContain('import { CareerExpandAllButton, CareerRecords, useCareerRecords } from "@/components/CareerRecords";');
    expect(block).toContain("<CareerRecords state={careerRecords} T={T} locale={locale} />");
    // '모두 펼치기'는 섹션 제목 줄 오른쪽에 둡니다.
    expect(block).toContain("action={<CareerExpandAllButton state={careerRecords} T={T} locale={locale} />}");
    expect(source).toContain("{action}");
    // 예전의 한 줄 타임라인과 스크롤하면 4개씩 더 불러오는 방식은 쓰지 않습니다.
    expect(source).not.toContain("timeline-connection-list");
    expect(source).not.toContain("useTimelineProgressiveReveal");
    expect(source).not.toContain("TIMELINE_BATCH_SIZE");
    expect(source).not.toContain("timeline-load-more");
  });

  it("keeps archive detail on the main page instead of depending on a CV link or auto-scroll panel", () => {
    const block = careerBlock();

    expect(block).not.toContain('previewHref("/cv")');
    expect(block).not.toContain('className="timeline-focus-panel"');
    expect(source).not.toContain("function useTimelineFocusScroll");
    expect(source).not.toContain("TIMELINE_AUTOSCROLL_STEP");
  });

  it("folds descriptions behind each record instead of clipping them or adding a scroll box", () => {
    expect(careerCss).not.toMatch(/max-height/);
    expect(careerCss).not.toMatch(/overflow(-y)?:\s*(auto|scroll)/);
    expect(careerCss).not.toMatch(/line-clamp/);
    expect(careerCss).not.toMatch(/opacity:\s*0\.\d/);
  });
});
