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

  it("adds conservative C-3-lite filtering and evidence panels without project navigation", () => {
    const block = projectsBlock();

    expect(source).toContain("const [projectFilters, setProjectFilters] = useState<ProjectFilterSelection>(() => createProjectFilterSelection())");
    expect(source).toContain("PROJECT_FILTER_GROUPS.map((group)");
    expect(source).toContain("filterProjectsBySelection(PROJECTS, projectFilters)");
    expect(block).toContain('className="project-filter-rail"');
    expect(block).toContain('className="project-filter-group"');
    expect(block).toContain("toggleProjectFilter(projectFilters, group.axis, option)");
    expect(block).toContain("projectCategoryLabel(proj.category, locale)");
    expect(block).toContain("projectFocusLabel(proj.focus, locale)");
    expect(block).toContain('className="project-evidence-grid"');
    expect(block).toContain('className="project-evaluation-panel"');
    expect(block).toContain("projectEvidenceMetrics(selectedProject)");
  });

  it("uses B-style year buckets and a capped scroll panel when many projects match", () => {
    const block = projectsBlock();

    expect(source).toContain("const PROJECT_INITIAL_VISIBLE_COUNT = 3");
    expect(source).toContain("const projectBuckets = useMemo(() => projectYearBuckets(visibleProjects, locale), [visibleProjects, locale])");
    expect(source).toContain("const projectHasOverflow = hasProjectOverflow(visibleProjects, PROJECT_INITIAL_VISIBLE_COUNT)");
    expect(block).toContain('className="project-bucket-layout"');
    expect(block).toContain('className="project-year-rail"');
    expect(block).toContain("projectBuckets.map((bucket)");
    expect(block).toContain('className={projectHasOverflow ? "project-scroll-panel has-overflow" : "project-scroll-panel"}');
    expect(block).toContain('className="project-scroll-fade"');
    expect(block).toContain("locale === \"en\" ? \"Scroll for older projects\" : \"이전 연도 프로젝트는 스크롤\"");
  });
});
