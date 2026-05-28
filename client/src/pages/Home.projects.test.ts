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
    expect(block).toContain('aria-pressed={isProjectExpanded}');
    expect(block).toContain("isProjectExpanded ? T.green : T.border");
    expect(block).toContain('locale === "en" ? "Summary" : "요약"');
    expect(block).toContain('locale === "en" ? "Details" : "자세히 보기"');
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
    expect(source).toContain("const projectHasOverflow = hasProjectOverflow(visibleProjects, PROJECT_VISIBLE_COUNT)");
    expect(block).not.toContain('className="project-bucket-layout"');
    expect(block).not.toContain('className="project-year-rail"');
    expect(block).toContain('className={projectHasOverflow ? "project-scroll-panel has-overflow" : "project-scroll-panel"}');
    expect(block).toContain('className="project-scroll-fade"');
    expect(block).toContain("locale === \"en\" ? \"Scroll for more projects\" : \"더 많은 프로젝트는 스크롤\"");
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
    expect(metricBlock).toContain('fontSize: "0.76rem"');
    expect(metricBlock).toContain("fontWeight: 500");
    expect(block).toContain("<span style={{ fontFamily: FONT_MONO, fontSize: \"0.62rem\", color: T.muted }}>");
    expect(block).toContain("{proj.tags.map((tag) => <Tag key={tag} T={T}>{tag}</Tag>)}");
  });
});
