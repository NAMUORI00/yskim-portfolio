import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

function projectsBlock() {
  const start = source.indexOf('<SectionTitle id="projects"');
  const end = source.indexOf("{/* ── 기술 스택 ── */}", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

function sourceBetween(text: string, startNeedle: string, endNeedle: string) {
  const start = text.indexOf(startNeedle);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  expect(end).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe("Home projects section", () => {
  it("keeps project details in the Projects section instead of linking to a project route", () => {
    const block = projectsBlock();

    expect(block).not.toContain('href={previewHref(`/projects/${proj.slug}`)}');
    expect(block).not.toContain('>{label("detail", "Detail")}');
    expect(block).toContain("selectedProjectSlug");
    expect(block).toContain("selectedProject");
    expect(block).toContain("setSelectedProjectSlug");
    expect(source).toContain("useState<string | null>(null)");
    expect(source).not.toContain("useState<string | null>(() => PROJECTS[0]?.slug ?? null)");
    expect(block).toContain('className="project-detail-button"');
    expect(block).toContain("aria-controls={projectDetailPanelId}");
    expect(block).toContain("aria-expanded={isProjectExpanded}");
    expect(block).toContain('className="project-detail-panel"');
    expect(block).toContain('className="project-detail-body markdown-body"');
    expect(block).toContain("toMarkdownHtml(selectedProject.body)");
  });

  it("keeps GitHub as the only project-row navigation link", () => {
    const block = projectsBlock();

    expect(block).toContain("{proj.link && <ExternalLink href={proj.link} T={T}>GitHub</ExternalLink>}");
    expect(block).not.toContain("previewHref(`/projects/");
  });

  it("starts collapsed and toggles the selected project back to summary mode", () => {
    const block = projectsBlock();

    expect(source).toContain("const selectedProject = PROJECTS.find((project) => project.slug === selectedProjectSlug) ?? null");
    expect(source).not.toContain("const selectedProject = PROJECTS.find((project) => project.slug === selectedProjectSlug) ?? PROJECTS[0] ?? null");
    expect(block).toContain("const isProjectExpanded = selectedProjectSlug === proj.slug");
    expect(block).toContain("setSelectedProjectSlug(isProjectExpanded ? null : proj.slug)");
    expect(block).toContain('aria-expanded={isProjectExpanded}');
    expect(block).toContain('aria-haspopup="dialog"');
    expect(block).toContain("isProjectExpanded ? T.green : T.border");
    expect(block).toContain('<ProjectDialog');
    expect(block).toContain('locale === "en" ? "Wide view" : "넓게 보기"');
    expect(block).not.toContain("setSelectedProjectSlug(proj.slug);");
  });

  it("uses seven compact project filter chips including show all", () => {
    const block = projectsBlock();

    expect(source).toContain("const [projectFilters, setProjectFilters] = useState<ProjectFilterSelection>(() => createProjectFilterSelection())");
    expect(source).toContain("PROJECT_FILTERS.map((filter)");
    expect(source).toContain("filterProjectsBySelection(PROJECTS, projectFilters)");
    expect(block).toContain('className="project-filter-rail"');
    expect(block).not.toContain('className="project-filter-group"');
    expect(block).toContain("toggleProjectFilterChip(projectFilters, filter)");
    expect(block).toContain("isProjectFilterSelected(projectFilters, filter)");
    expect(block).toContain("projectCategoryLabel(proj.category, locale)");
    expect(block).toContain("projectFocusLabel(proj.focus, locale)");
    expect(block).toContain('className="project-evidence-grid"');
    expect(block).toContain('className="project-evaluation-panel"');
    expect(block).toContain("projectEvidenceMetrics(selectedProject)");
  });

  it("shows seven projects before using the side scroll panel", () => {
    const block = projectsBlock();

    expect(source).toContain("const PROJECT_VISIBLE_COUNT = 7");
    expect(source).toContain("const projectHasOverflow = !showAllProjects && hasProjectOverflow(visibleProjects, PROJECT_VISIBLE_COUNT)");
    expect(block).not.toContain('className="project-bucket-layout"');
    expect(block).not.toContain('className="project-year-rail"');
    expect(block).toContain('className={projectHasOverflow ? "project-scroll-panel has-overflow" : "project-scroll-panel"}');
    expect(block).toContain('className="project-scroll-fade"');
    expect(block).toContain("setShowAllProjects(!showAllProjects)");
  });

  it("uses sans for project reading controls and emphasized metrics while preserving mono for compact tokens", () => {
    const block = projectsBlock();
    const projectNameBlock = sourceBetween(block, "{proj.private ? <LockIcon color={T.muted} />", "{proj.highlight &&");
    const filterButtonCss = sourceBetween(source, ".project-filter-rail button {", ".project-filter-rail button:hover");
    const axisBadgeCss = sourceBetween(source, ".project-axis-badge {", ".project-axis-badge.muted");
    const detailButtonCss = sourceBetween(source, ".project-detail-button {", ".project-detail-button:hover");
    const metricBlock = sourceBetween(block, "{/* 정량 성과 */}", "{/* 태그 */}");

    expect(projectNameBlock).toContain("fontFamily: FONT_SANS");
    expect(projectNameBlock).not.toContain("fontFamily: FONT_MONO");
    expect(filterButtonCss).toContain("font-family: ${FONT_SANS};");
    expect(axisBadgeCss).toContain("font-family: ${FONT_SANS};");
    expect(detailButtonCss).toContain("font-family: ${FONT_SANS};");
    expect(metricBlock).toContain("fontFamily: FONT_SANS");
    expect(metricBlock).toContain('fontSize: "0.8125rem"');
    expect(metricBlock).toContain("fontWeight: 500");
    expect(block).toContain("<span style={{ fontFamily: FONT_MONO, fontSize: \"0.75rem\", color: T.muted }}>");
    expect(block).toContain("{proj.tags.map((tag) => <Tag key={tag} T={T}>{tag}</Tag>)}");
  });

  it("keeps a compact reading hierarchy in project rows: name > description > metadata, nothing tiny or oversized", () => {
    const block = projectsBlock();
    const nameBlock = sourceBetween(block, "{proj.private ? <LockIcon color={T.muted} />", "{proj.highlight &&");
    const descBlock = sourceBetween(block, "{/* 설명 */}", "{projectRole(proj) &&");
    const axisBadgeCss = sourceBetween(source, ".project-axis-badge {", ".project-axis-badge.muted");

    expect(nameBlock).toContain('fontSize: "0.9375rem"');
    expect(descBlock).toContain('fontSize: "0.875rem"');
    expect(axisBadgeCss).toContain("font-size: 0.75rem;");
    // 프로젝트 목록의 글자는 0.6875rem(11px)보다 작지 않고 1rem보다 크지 않습니다.
    const sizes = [...block.matchAll(/fontSize: "([\d.]+)rem"/g)].map((match) => Number(match[1]));
    expect(sizes.length).toBeGreaterThan(4);
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(0.6875);
      expect(size).toBeLessThanOrEqual(1);
    }
  });

  it("keeps project controls compact for a mouse and widens them to 44px on touch screens", () => {
    const detailButtonCss = sourceBetween(source, ".project-detail-button {", ".project-detail-button:hover");
    const filterButtonCss = sourceBetween(source, ".project-filter-rail button {", ".project-filter-rail button:hover");
    const scrollHintCss = sourceBetween(source, ".project-scroll-hint {", ".project-scroll-hint:hover");

    for (const css of [detailButtonCss, scrollHintCss]) expect(css).toContain("min-height: 2.25rem;");
    expect(filterButtonCss).toContain("min-height: 2rem;");
    const touchCss = sourceBetween(source, "@media (pointer: coarse) {", ".mobile-overlay {");
    for (const selector of [".project-filter-rail button", ".project-detail-button", ".project-external-link", ".project-scroll-hint"]) {
      expect(touchCss).toContain(selector);
    }
    expect(touchCss).toContain("min-height: 2.75rem;");
    // 휴대폰 폭에서도 필터 단추 글자를 줄이지 않습니다.
    const mobileCss = sourceBetween(source, "@media (max-width: 768px) {", "@media (pointer: coarse) {");
    expect(sourceBetween(mobileCss, ".project-filter-rail button {", "}")).not.toContain("font-size");
  });

  it("lazy-loads the one-sentence outcome, flow diagram and optional details inside the expanded project panel", () => {
    const block = projectsBlock();
    const panel = sourceBetween(block, 'className="project-detail-panel"', '{projectHasOverflow && <div className="project-scroll-fade"');

    expect(source).toContain('const ProjectInsightPanel = lazy(() => import("@/components/capabilities/ProjectInsightPanel"));');
    expect(source).not.toContain('import ProjectInsightPanel from');
    expect(panel).toContain("<Suspense");
    expect(panel).toContain("<LazyBoundary");
    expect(panel).toContain("<ProjectInsightPanel project={selectedProject} T={T} locale={locale} wideMode />");
    // 이름·기간·구분은 바로 위 행에 있으므로 패널 머리에서 되풀이하지 않습니다.
    expect(panel).not.toContain("project-detail-head");
    expect(panel).not.toContain("projectProofLevelLabel");
    // 소개 전문은 패널 안 단추로 열고, 패널을 불러오지 못하면 대체 문구 아래에서 바로 열 수 있게 둡니다.
    const fallback = sourceBetween(panel, "<LazyBoundary", "<Suspense");
    expect(fallback).toContain('<details className="project-detail-source">');
    expect(fallback).toContain("toMarkdownHtml(selectedProject.body)");
    expect(panel.split("toMarkdownHtml(selectedProject.body)")).toHaveLength(2);
    // 한 줄 성과는 프런트매터 지표(metrics)가 있을 때만 다시 보여 줍니다.
    expect(panel).toContain("selectedProject.metrics.length > 0 && projectEvidenceMetrics(selectedProject).length > 0");
    expect(panel).toContain('role="region"');
  });
});
