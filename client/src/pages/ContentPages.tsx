import { Link, useRoute } from "wouter";
import { portfolioContent } from "@/content";
import { toMarkdownHtml } from "@/content/markdown";
import { DARK, FONT_MONO, FONT_SANS, LIGHT } from "@/content/theme";
import { useTheme } from "@/contexts/ThemeContext";

function usePalette() {
  const { theme, toggleTheme } = useTheme();
  return { T: theme === "dark" ? DARK : LIGHT, theme, toggleTheme };
}

function PageFrame({ children, title }: { children: React.ReactNode; title: string }) {
  const { T, theme, toggleTheme } = usePalette();
  return (
    <main style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "32px 24px 56px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "32px" }}>
          <div>
            <Link href="/" style={{ color: T.green, fontFamily: FONT_MONO, fontSize: "0.75rem", textDecoration: "none" }}>
              ← Portfolio
            </Link>
            <h1 style={{ margin: "14px 0 0", fontSize: "2rem", lineHeight: 1.3 }}>{title}</h1>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              alignSelf: "flex-start",
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.sub,
              borderRadius: "4px",
              padding: "8px 12px",
              fontFamily: FONT_MONO,
              cursor: "pointer",
            }}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </header>
        {children}
      </div>
    </main>
  );
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const { T } = usePalette();
  return (
    <article
      className="markdown-body"
      style={{ color: T.sub }}
      dangerouslySetInnerHTML={{ __html: toMarkdownHtml(markdown) }}
    />
  );
}

export function Notes() {
  const { T } = usePalette();
  const notes = portfolioContent.notes.filter((note) => note.status === "published");
  return (
    <PageFrame title="Notes">
      <div style={{ display: "grid", gap: "12px" }}>
        {notes.map((note) => (
          <Link
            key={note.slug}
            href={`/notes/${note.slug}`}
            style={{
              display: "block",
              padding: "18px 20px",
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            <div style={{ fontFamily: FONT_MONO, fontSize: "0.72rem", color: T.green, marginBottom: "8px" }}>{note.date}</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>{note.title}</h2>
            <p style={{ margin: 0, color: T.sub }}>{note.summary}</p>
          </Link>
        ))}
      </div>
    </PageFrame>
  );
}

export function NoteDetail() {
  const [, params] = useRoute("/notes/:slug");
  const note = portfolioContent.notes.find((item) => item.slug === params?.slug);
  const { T } = usePalette();
  if (!note) return <PageFrame title="Note not found">존재하지 않는 노트입니다.</PageFrame>;
  const relatedProjects = portfolioContent.projects.filter((project) => note.relatedProjects.includes(project.slug));
  const relatedResearch = portfolioContent.research.filter((research) => note.relatedResearch.includes(research.slug));
  return (
    <PageFrame title={note.title}>
      <p style={{ color: T.sub, marginTop: "-18px" }}>{note.summary}</p>
      <MarkdownBody markdown={note.body} />
      <section style={{ borderTop: `1px solid ${T.border}`, marginTop: "28px", paddingTop: "18px" }}>
        <h2 style={{ fontSize: "1rem" }}>Related</h2>
        {[...relatedProjects.map((item) => item.name), ...relatedResearch.map((item) => item.title)].map((label) => (
          <span key={label} style={{ display: "inline-block", margin: "0 6px 6px 0", color: T.green, fontFamily: FONT_MONO }}>
            {label}
          </span>
        ))}
      </section>
    </PageFrame>
  );
}

export function ProjectDetail() {
  const [, params] = useRoute("/projects/:slug");
  const project = portfolioContent.projects.find((item) => item.slug === params?.slug);
  if (!project) return <PageFrame title="Project not found">존재하지 않는 프로젝트입니다.</PageFrame>;
  return (
    <PageFrame title={project.name}>
      <MarkdownBody markdown={project.body} />
    </PageFrame>
  );
}

export function ResearchDetail() {
  const [, params] = useRoute("/research/:slug");
  const research = portfolioContent.research.find((item) => item.slug === params?.slug);
  if (!research) return <PageFrame title="Research not found">존재하지 않는 연구 항목입니다.</PageFrame>;
  return (
    <PageFrame title={research.title}>
      <MarkdownBody markdown={research.body} />
    </PageFrame>
  );
}
