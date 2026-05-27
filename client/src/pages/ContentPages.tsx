import { Link, useRoute } from "wouter";
import { useEffect, useMemo } from "react";
import { englishTranslations, portfolioContent } from "@/content";
import { toMarkdownHtml } from "@/content/markdown";
import { DARK, FONT_MONO, FONT_SANS, LIGHT } from "@/content/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { readAdminPreviewDraftFromLocation, withAdminPreviewUrl } from "@/lib/adminPreview";
import { applyDocumentMetadata } from "@/lib/documentMetadata";
import { localizePortfolioContent, uiText } from "@/lib/i18nContent";

function usePalette() {
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useLanguage();
  const previewDraft = useMemo(() => readAdminPreviewDraftFromLocation(), []);
  const previewId = previewDraft?.id ?? null;
  const sourceContent = previewDraft?.content ?? portfolioContent;
  const sourceTranslations = previewDraft?.translations ?? englishTranslations;
  const content = useMemo(() => localizePortfolioContent(sourceContent, sourceTranslations, locale), [locale, sourceContent, sourceTranslations]);
  useEffect(() => {
    applyDocumentMetadata(content.site, locale);
  }, [content.site, locale]);
  const label = (key: string, fallback: string) => (locale === "en" ? uiText(sourceTranslations, key, fallback) : fallback);
  const previewHref = (path: string) => withAdminPreviewUrl(path, previewId);
  return { T: theme === "dark" ? DARK : LIGHT, theme, toggleTheme, locale, toggleLocale, content, label, previewHref };
}

function PageFrame({ children, title }: { children: React.ReactNode; title: string }) {
  const { T, theme, toggleTheme, locale, toggleLocale, label, previewHref } = usePalette();
  return (
    <main style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: "880px", margin: "0 auto", padding: "32px 24px 56px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "32px" }}>
          <div>
            <Link href={previewHref("/")} style={{ color: T.green, fontFamily: FONT_MONO, fontSize: "0.75rem", textDecoration: "none" }}>
              ← {label("portfolio", "Portfolio")}
            </Link>
            <h1 style={{ margin: "14px 0 0", fontSize: "2rem", lineHeight: 1.3 }}>{title}</h1>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              onClick={toggleLocale}
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
              {locale === "en" ? "KO" : "EN"}
            </button>
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
          </div>
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

function timelineTypeLabel(type: string, locale: string): string {
  const ko: Record<string, string> = {
    education: "학력",
    research: "연구",
    publication: "논문",
    project: "프로젝트",
    award: "수상",
    talk: "발표",
    work: "경력",
    milestone: "이정표",
  };
  const en: Record<string, string> = {
    education: "Education",
    research: "Research",
    publication: "Publication",
    project: "Project",
    award: "Award",
    talk: "Talk",
    work: "Work",
    milestone: "Milestone",
  };
  return (locale === "en" ? en : ko)[type] ?? type;
}

export function CV() {
  const { T, content, locale, previewHref } = usePalette();
  const timeline = content.education.filter((item) => item.status === "published");

  return (
    <PageFrame title={locale === "en" ? "CV Timeline" : "CV 타임라인"}>
      <div style={{ display: "grid", gap: "14px" }}>
        {timeline.map((item) => {
          const relatedProjects = content.projects.filter((project) => item.relatedProjects.includes(project.slug));
          return (
            <article key={`${item.type}:${item.degree}:${item.period}`} style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: "6px", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: "0.72rem", color: T.green, marginBottom: "7px" }}>
                    {timelineTypeLabel(item.type, locale)} · {item.period}
                  </div>
                  <h2 style={{ margin: "0 0 6px", fontSize: "1.08rem", lineHeight: 1.45 }}>{item.degree}</h2>
                  <div style={{ color: T.sub, fontSize: "0.9rem" }}>{item.school}</div>
                </div>
                {item.current && (
                  <span style={{ color: T.green, background: T.greenBg, border: `1px solid ${T.green}40`, borderRadius: "999px", padding: "4px 9px", fontFamily: FONT_MONO, fontSize: "0.68rem" }}>
                    {locale === "en" ? "Current" : "진행 중"}
                  </span>
                )}
              </div>
              {item.note && <p style={{ color: T.sub, lineHeight: 1.7, margin: "12px 0 0" }}>{item.note}</p>}
              {item.bullets.length > 0 && (
                <ul style={{ color: T.sub, lineHeight: 1.7, margin: "12px 0 0", paddingLeft: "1.1rem" }}>
                  {item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              )}
              {(item.links.length > 0 || relatedProjects.length > 0 || item.relatedSkills.length > 0) && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
                  {item.links.map((link) => (
                    <a key={`${link.label}:${link.href}`} href={link.href} target="_blank" rel="noopener noreferrer" style={{ color: T.green, border: `1px solid ${T.green}40`, background: T.greenBg, borderRadius: "999px", padding: "5px 9px", fontFamily: FONT_MONO, fontSize: "0.7rem", textDecoration: "none" }}>
                      {link.label}
                    </a>
                  ))}
                  {relatedProjects.map((project) => (
                    <Link key={project.slug} href={previewHref(`/projects/${project.slug}`)} style={{ color: T.green, border: `1px solid ${T.border}`, borderRadius: "999px", padding: "5px 9px", fontFamily: FONT_MONO, fontSize: "0.7rem", textDecoration: "none" }}>
                      {project.name}
                    </Link>
                  ))}
                  {item.relatedSkills.map((skill) => (
                    <span key={skill} style={{ color: T.sub, border: `1px solid ${T.border}`, borderRadius: "999px", padding: "5px 9px", fontFamily: FONT_MONO, fontSize: "0.7rem" }}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </PageFrame>
  );
}

export function Notes() {
  const { T, content, previewHref } = usePalette();
  const notes = content.notes.filter((note) => note.status === "published");
  return (
    <PageFrame title="Notes">
      <div style={{ display: "grid", gap: "12px" }}>
        {notes.map((note) => (
          <Link
            key={note.slug}
            href={previewHref(`/notes/${note.slug}`)}
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
  const { T, content, locale } = usePalette();
  const note = content.notes.find((item) => item.slug === params?.slug);
  if (!note) return <PageFrame title="Note not found">{locale === "en" ? "This note does not exist." : "존재하지 않는 노트입니다."}</PageFrame>;
  const relatedProjects = content.projects.filter((project) => note.relatedProjects.includes(project.slug));
  const relatedResearch = content.research.filter((research) => note.relatedResearch.includes(research.slug));
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
  const { content, locale } = usePalette();
  const project = content.projects.find((item) => item.slug === params?.slug);
  if (!project) return <PageFrame title="Project not found">{locale === "en" ? "This project does not exist." : "존재하지 않는 프로젝트입니다."}</PageFrame>;
  return (
    <PageFrame title={project.name}>
      <MarkdownBody markdown={project.body} />
    </PageFrame>
  );
}

export function ResearchDetail() {
  const [, params] = useRoute("/research/:slug");
  const { content, locale } = usePalette();
  const research = content.research.find((item) => item.slug === params?.slug);
  if (!research) return <PageFrame title="Research not found">{locale === "en" ? "This research item does not exist." : "존재하지 않는 연구 항목입니다."}</PageFrame>;
  return (
    <PageFrame title={research.title}>
      <MarkdownBody markdown={research.body} />
    </PageFrame>
  );
}
