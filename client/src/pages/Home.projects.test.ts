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

    expect(source).toContain("const [projectFilter, setProjectFilter] = useState<ProjectFilter>(\"all\")");
    expect(source).toContain("PROJECT_FILTERS.map((filter)");
    expect(source).toContain("filterProjects(PROJECTS, projectFilter)");
    expect(block).toContain('className="project-filter-rail"');
    expect(block).toContain("projectCategoryLabel(proj.category, locale)");
    expect(block).toContain("projectFocusLabel(proj.focus, locale)");
    expect(block).toContain('className="project-evidence-grid"');
    expect(block).toContain('className="project-evaluation-panel"');
    expect(block).toContain("projectEvidenceMetrics(selectedProject)");
  });
});
