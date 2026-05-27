/*
 * Design: Minimal Two-Column Portfolio / CV  (v5 — 타이포그래피 정비)
 * ─────────────────────────────────────────────────────────────────────────
 * Philosophy: 학술 이력서 + 개발자 포트폴리오의 교차점.
 *   타이포그래피가 주인공. 색상은 포레스트 그린 단 하나.
 *
 * 폰트 전략 (한글·영문 괴리 최소화):
 *   FONT_SANS  : Pretendard Variable  — 본문·UI 전체 (한글+영문 자간 통일)
 *   FONT_SERIF : Noto Serif KR        — 순수 한글 제목 전용
 *   FONT_MONO  : JetBrains Mono       — 코드·수치·날짜·기술 레이블 전용
 *
 * 핵심 원칙:
 *   1. 한글·영문 혼용 텍스트 → 반드시 FONT_SANS (Pretendard)
 *   2. 순수 한글 섹션 제목   → FONT_SERIF 허용
 *   3. 날짜·기술태그·수치   → FONT_MONO
 *
 * Layout: 좌측 고정 사이드바 + 우측 스크롤 콘텐츠
 * Colors: #1a1a1a (텍스트), #2d6a4f (포인트), #f5f5f3 (배경)
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { englishTranslations, getProfileAvatarUrl, portfolioContent, type ProjectEntry, type TimelineLink } from "@/content";
import { DARK, FONT_MONO, FONT_SANS, FONT_SERIF, LIGHT, type PortfolioTheme } from "@/content/theme";
import { KnowledgeGraphRail } from "@/components/KnowledgeGraphRail";
import { MobileKnowledgeGraph } from "@/components/MobileKnowledgeGraph";
import { readAdminPreviewDraftFromLocation, withAdminPreviewUrl } from "@/lib/adminPreview";
import { buildCoverPreview, buildResearchDiagramPreview, type CoverPreviewPayload } from "@/lib/coverPreview";
import { applyDocumentMetadata } from "@/lib/documentMetadata";
import { localizePortfolioContent, uiText } from "@/lib/i18nContent";
import { buildKnowledgeGraph } from "@/lib/knowledgeGraph";
import { activeSectionForAnchor, scrollEndPaddingForCenteredSection, scrollTopForElementCenter } from "@/lib/scroll";

const ACTIVE_SECTION_ANCHOR_RATIO = 0.5;
const ACTIVE_SCROLL_END_TOLERANCE = 4;
const MIN_SCROLL_END_PADDING = 48;
const SCROLL_END_PADDING_GAP = 16;
const TIMELINE_BATCH_SIZE = 4;

/* ── SVG 아이콘 컴포넌트 ── */
function NavIcon({ type, color, size = 13 }: { type: string; color: string; size?: number }) {
  const s = { width: size, height: size, flexShrink: 0 } as React.CSSProperties;
  if (type === "user") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
  if (type === "graduation") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  );
  if (type === "flask") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M9 3h6M9 3v8l-4 9h14l-4-9V3"/>
    </svg>
  );
  if (type === "code") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  );
  if (type === "layers") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  );
  if (type === "star") return (
    <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
  return null;
}

function RepoIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill={color}>
      <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
    </svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill={color}>
      <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
    </svg>
  );
}

function TrendIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}

function ExternalArrow({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <path d="M7 17L17 7M17 7H7M17 7v10"/>
    </svg>
  );
}

function ContactIcon({ type, color }: { type: string; color: string }) {
  if (type === "email") {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    );
  }
  if (type === "github") {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill={color}>
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  );
}

/* ── 스크롤 앵커 기반 활성 섹션 훅 ── */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const container = document.getElementById("scroll-area");
    if (!container) return;

    let frame: number | null = null;
    const updateActive = () => {
      frame = null;
      const containerTop = container.getBoundingClientRect().top;
      const sections = ids.flatMap((id) => {
        const el = document.getElementById(id);
        return el ? [{ id, top: el.getBoundingClientRect().top - containerTop }] : [];
      });
      const isAtEnd = container.scrollTop + container.clientHeight >= container.scrollHeight - ACTIVE_SCROLL_END_TOLERANCE;
      const anchorTop = container.clientHeight * ACTIVE_SECTION_ANCHOR_RATIO;
      const next = activeSectionForAnchor(sections, anchorTop, isAtEnd);
      if (next) setActive(next);
    };
    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updateActive);
    };

    updateActive();
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [ids]);
  return active;
}

function useScrollEndPadding(lastSectionId: string) {
  const [padding, setPadding] = useState(MIN_SCROLL_END_PADDING);

  useEffect(() => {
    const container = document.getElementById("scroll-area");
    const scrollInner = container?.querySelector(".scroll-inner") as HTMLElement | null;
    const lastSection = document.getElementById(lastSectionId);
    const footer = scrollInner?.querySelector("footer") as HTMLElement | null;
    if (!container || !scrollInner || !lastSection) return;

    let frame: number | null = null;
    const updatePadding = () => {
      frame = null;
      const innerRect = scrollInner.getBoundingClientRect();
      const sectionRect = lastSection.getBoundingClientRect();
      const contentEndRect = (footer ?? scrollInner).getBoundingClientRect();
      const next = scrollEndPaddingForCenteredSection({
        containerHeight: container.clientHeight,
        sectionCenterOffset: sectionRect.top - innerRect.top + sectionRect.height / 2,
        contentBottomOffset: contentEndRect.bottom - innerRect.top,
        minPadding: MIN_SCROLL_END_PADDING,
        gap: SCROLL_END_PADDING_GAP,
      });
      setPadding((current) => (current === next ? current : next));
    };
    const scheduleUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(updatePadding);
    };

    updatePadding();
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);
    observer.observe(scrollInner);
    observer.observe(lastSection);
    if (footer) observer.observe(footer);
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [lastSectionId]);

  return `${padding}px`;
}

function useTimelineProgressiveReveal(totalCount: number) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(TIMELINE_BATCH_SIZE, totalCount));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = visibleCount < totalCount;

  const revealMore = useCallback(() => {
    setVisibleCount((current) => Math.min(totalCount, current + TIMELINE_BATCH_SIZE));
  }, [totalCount]);

  useEffect(() => {
    setVisibleCount((current) => {
      const minimum = Math.min(TIMELINE_BATCH_SIZE, totalCount);
      return Math.min(Math.max(current, minimum), totalCount);
    });
  }, [totalCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const root = document.getElementById("scroll-area");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) revealMore();
      },
      { root, rootMargin: "400px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, revealMore]);

  return { visibleCount, hasMore, revealMore, sentinelRef };
}

/* ── fade-up 애니메이션 훅 ── */
function useFadeIn(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
}

/* ── FadeSection ── */
function FadeSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  useFadeIn(ref as React.RefObject<HTMLElement>);
  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        opacity: 1,
        transform: "translateY(0)",
        transition: "transform 0.25s ease",
        marginBottom: "3.5rem",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

/* ── SectionTitle ── */
function SectionTitle({
  id, children, icon, T
}: { id: string; children: React.ReactNode; icon?: string; T: typeof LIGHT }) {
  return (
    <div
      id={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "1.5rem",
        paddingBottom: "0.65rem",
        borderBottom: `1px solid ${T.border}`,
        scrollMarginTop: "2rem",
      }}
    >
      {icon && <NavIcon type={icon} color={T.green} size={14} />}
      <h2
        style={{
          fontFamily: FONT_SANS,
          fontSize: "0.68rem",
          fontWeight: 600,
          color: T.muted,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {children}
      </h2>
    </div>
  );
}

/* ── Tag ── */
function Tag({ children, T }: { children: React.ReactNode; T: typeof LIGHT }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: FONT_MONO,
        fontSize: "0.65rem",
        color: T.sub,
        background: T.bg,
        border: `1px solid ${T.border}`,
        padding: "1px 7px",
        borderRadius: "2px",
      }}
    >
      {children}
    </span>
  );
}

/* ── ExternalLink ── */
function ExternalLink({ href, children, T }: { href: string; children: React.ReactNode; T: typeof LIGHT }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: T.green,
        textDecoration: "none",
        fontFamily: FONT_MONO,
        fontSize: "0.72rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {children}
      <ExternalArrow color={T.green} />
    </a>
  );
}

function timelineTypeLabel(type: string, locale: "ko" | "en"): string {
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

function isCvArchiveHref(href: string): boolean {
  try {
    const url = new URL(href, "https://namuori.net");
    return url.pathname.replace(/\/+$/, "") === "/cv";
  } catch {
    return href.trim().replace(/\/+$/, "") === "/cv";
  }
}

type TimelineChipItem = {
  key: string;
  label: string;
  href?: string;
  kind: "link" | "project" | "skill";
  external?: boolean;
};

function normalizeTimelineChipLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function timelineHrefTail(href: string): string {
  try {
    const url = new URL(href, "https://namuori.net");
    const parts = url.pathname.split("/").filter(Boolean);
    return normalizeTimelineChipLabel(parts[parts.length - 1] ?? "");
  } catch {
    const parts = href.split(/[/?#]/)[0].split("/").filter(Boolean);
    return normalizeTimelineChipLabel(parts[parts.length - 1] ?? href);
  }
}

function matchesTimelineProject(link: TimelineLink, project: Pick<ProjectEntry, "name" | "slug">): boolean {
  const label = normalizeTimelineChipLabel(link.label);
  const hrefTail = timelineHrefTail(link.href);
  const projectName = normalizeTimelineChipLabel(project.name);
  const projectSlug = normalizeTimelineChipLabel(project.slug);
  return label === projectName || label === projectSlug || hrefTail === projectSlug;
}

function buildTimelineChipItems({
  links,
  relatedProjects,
  relatedSkills,
  previewHref,
}: {
  links: TimelineLink[];
  relatedProjects: Pick<ProjectEntry, "name" | "slug">[];
  relatedSkills: string[];
  previewHref: (path: string) => string;
}): TimelineChipItem[] {
  const seen = new Set<string>();
  const items: TimelineChipItem[] = [];
  const add = (item: TimelineChipItem) => {
    const identity = `${item.kind}:${normalizeTimelineChipLabel(item.label)}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    items.push(item);
  };

  relatedProjects.forEach((project) => {
    add({
      key: `project:${project.slug}`,
      kind: "project",
      label: project.name,
      href: previewHref(`/projects/${project.slug}`),
    });
  });

  links
    .filter((link) => !isCvArchiveHref(link.href))
    .filter((link) => !relatedProjects.some((project) => matchesTimelineProject(link, project)))
    .forEach((link) => {
      add({
        key: `link:${link.label}:${link.href}`,
        kind: "link",
        label: link.label,
        href: link.href,
        external: true,
      });
    });

  relatedSkills.slice(0, 5).forEach((skill) => {
    add({
      key: `skill:${skill}`,
      kind: "skill",
      label: skill,
    });
  });

  return items;
}

function ThemeModeIcon({ theme }: { theme: "light" | "dark" }) {
  if (theme === "dark") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    );
  }

  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  );
}

function PreferenceSegmentedControl({
  T,
  theme,
  locale,
  onTheme,
  onLocale,
  themeLabel,
  localeLabel,
  style,
}: {
  T: PortfolioTheme;
  theme: "light" | "dark";
  locale: "ko" | "en";
  onTheme?: () => void;
  onLocale: () => void;
  themeLabel: string;
  localeLabel: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="preference-control"
      style={{
        borderColor: T.border,
        background: T.bg,
        ...style,
      }}
    >
      <button
        type="button"
        className="preference-segment"
        onClick={onTheme}
        disabled={!onTheme}
        aria-label="테마 전환"
        title={themeLabel}
        style={{ color: T.sub }}
      >
        <ThemeModeIcon theme={theme} />
        <span>{theme === "dark" ? "Light" : "Dark"}</span>
      </button>
      <span className="preference-divider" style={{ background: T.border }} />
      <button
        type="button"
        className="preference-segment"
        onClick={onLocale}
        aria-label={locale === "en" ? "Switch language to Korean" : "영어 페이지로 전환"}
        title={localeLabel}
        style={{ color: T.sub }}
      >
        <span className="preference-code">{locale === "en" ? "KO" : "EN"}</span>
      </button>
    </div>
  );
}

/* ════════════════════════════
   메인 컴포넌트
════════════════════════════ */
export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useLanguage();
  const T = theme === "dark" ? DARK : LIGHT;
  const previewDraft = useMemo(() => readAdminPreviewDraftFromLocation(), []);
  const previewId = previewDraft?.id ?? null;
  const sourceContent = previewDraft?.content ?? portfolioContent;
  const sourceTranslations = previewDraft?.translations ?? englishTranslations;
  const content = useMemo(() => localizePortfolioContent(sourceContent, sourceTranslations, locale), [locale, sourceContent, sourceTranslations]);

  useEffect(() => {
    applyDocumentMetadata(content.site, locale);
  }, [content.site, locale]);

  const IMG = content.site.images;
  const NAV_ITEMS = content.site.navigation;
  const NAV_IDS = useMemo(() => NAV_ITEMS.map((item) => item.id), [NAV_ITEMS]);
  const TIMELINE_ENTRIES = content.education.filter((item) => item.status === "published");
  const RESEARCH_INTERESTS = content.research.filter((item) => item.status === "published");
  const PROJECTS = content.projects.filter((item) => item.status === "published");
  const SKILL_GROUPS = content.skills;
  const STARRED = content.starred;
  const PROFILE = content.profile;
  const PROFILE_AVATAR = getProfileAvatarUrl(PROFILE);
  const KNOWLEDGE_GRAPH = useMemo(() => buildKnowledgeGraph(content), [content]);
  const active = useActiveSection(NAV_IDS);
  const scrollEndPadding = useScrollEndPadding("interests");
  const {
    visibleCount: visibleTimelineCount,
    hasMore: hasMoreTimelineEntries,
    revealMore: revealMoreTimelineEntries,
    sentinelRef: timelineLoadSentinelRef,
  } = useTimelineProgressiveReveal(TIMELINE_ENTRIES.length);
  const visibleTimelineEntries = TIMELINE_ENTRIES.slice(0, visibleTimelineCount);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusedGraphNodeId, setFocusedGraphNodeId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<CoverPreviewPayload | null>(null);
  const previewHref = useCallback((path: string) => withAdminPreviewUrl(path, previewId), [previewId]);
  const label = (key: string, fallback: string) => (locale === "en" ? uiText(sourceTranslations, key, fallback) : fallback);
  const themeToggleLabel = theme === "dark" ? label("lightMode", "라이트 모드") : label("darkMode", "다크 모드");
  const languageToggleLabel = locale === "en" ? label("languageToKorean", "한국어") : label("languageToEnglish", "English");

  useEffect(() => {
    if (!coverPreview) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCoverPreview(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [coverPreview]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById("scroll-area");
    if (el && container) {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const top = scrollTopForElementCenter({
        containerTop: containerRect.top,
        containerHeight: container.clientHeight,
        elementTop: elRect.top,
        elementHeight: elRect.height,
        scrollTop: container.scrollTop,
      });
      container.scrollTo({ top, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        background: T.bg,
        fontFamily: FONT_SANS,
        color: T.text,
        transition: "background 0.25s, color 0.25s",
      }}
    >
      {/* ── 모바일 햄버거 버튼 ── */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: "none",
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 200,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: "4px",
          padding: "6px 8px",
          cursor: "pointer",
          color: T.text,
        }}
        className="mobile-menu-btn"
        aria-label="메뉴 열기"
      >
        {mobileMenuOpen
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        }
      </button>

      {/* ── 모바일 드로어 오버레이 ── */}
      <div
        className={`mobile-overlay${mobileMenuOpen ? " open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ── 모바일 드로어 ── */}
      <div className={`mobile-drawer${mobileMenuOpen ? " open" : ""}`}
        style={{ background: T.sidebarBg, borderRight: `1px solid ${T.border}` }}>
        <img
          src={PROFILE_AVATAR}
          alt={locale === "en" ? `${PROFILE.name} profile photo` : `${PROFILE.name} 프로필 사진`}
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            objectFit: "cover",
            border: `1px solid ${T.border}`,
            marginBottom: "0.9rem",
          }}
        />
        <div style={{ fontFamily: FONT_SANS, fontSize: "1.1rem", fontWeight: 700, color: T.text, marginBottom: "0.25rem" }}>
          {PROFILE.name}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: "0.6rem", color: T.muted, marginBottom: "1.5rem" }}>
          {PROFILE.romanizedName} · {PROFILE.handle}
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                textAlign: "left", padding: "0.45rem 0.5rem",
                fontFamily: FONT_SANS,
                fontSize: "0.82rem",
                color: active === item.id ? T.green : T.sub,
                fontWeight: active === item.id ? 600 : 400,
                borderRadius: "3px",
                transition: "color 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <NavIcon type={item.icon} color={active === item.id ? T.green : T.muted} size={13} />
              {item.label}
            </button>
          ))}
        </nav>
        <MobileKnowledgeGraph graph={KNOWLEDGE_GRAPH} T={T} active={active} />
        <div
          style={{
            marginTop: "1.15rem",
            paddingTop: "0.95rem",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontSize: "0.58rem",
              color: T.muted,
              letterSpacing: "0.08em",
              marginBottom: "0.65rem",
            }}
          >
            {label("contact", "CONTACT")}
          </div>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            {PROFILE.contacts.map((c) => (
              <a
                key={`mobile-${c.href}`}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  minHeight: "30px",
                  fontFamily: FONT_MONO,
                  fontSize: "0.64rem",
                  color: T.sub,
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                <ContactIcon type={c.type} color={T.muted} />
                <span>{c.label}</span>
              </a>
            ))}
          </div>
        </div>
        <PreferenceSegmentedControl
          T={T}
          theme={theme}
          locale={locale}
          onTheme={toggleTheme}
          onLocale={toggleLocale}
          themeLabel={themeToggleLabel}
          localeLabel={languageToggleLabel}
          style={{ marginTop: "1rem" }}
        />
      </div>

      {/* ════════════════════════════
          좌측 고정 사이드바 (데스크탑)
      ════════════════════════════ */}
      <aside
        id="sidebar"
        style={{
          width: "clamp(248px, 22vw, 340px)",
          flexShrink: 0,
          height: "100dvh",
          overflow: "hidden",
          borderRight: `1px solid ${T.border}`,
          background: T.sidebarBg,
          display: "flex",
          flexDirection: "column",
          padding: "clamp(1.25rem, 2.2vw, 2.35rem) clamp(1.25rem, 2vw, 2rem)",
          boxSizing: "border-box",
          transition: "background 0.25s, border-color 0.25s",
        }}
      >
        {/* 이름 + 직함 */}
        <div style={{ marginBottom: "clamp(0.8rem, 2.4vh, 1.6rem)" }}>
          <img
            src={PROFILE_AVATAR}
            alt={locale === "en" ? `${PROFILE.name} profile photo` : `${PROFILE.name} 프로필 사진`}
            style={{
              width: "clamp(72px, 7vw, 104px)",
              height: "clamp(72px, 7vw, 104px)",
              borderRadius: "50%",
              objectFit: "cover",
              border: `1px solid ${T.border}`,
              background: T.surface,
              marginBottom: "0.85rem",
              filter: theme === "dark" ? "saturate(0.9) brightness(0.92)" : "saturate(0.95)",
            }}
          />
          <div style={{
            fontFamily: FONT_SANS,
            fontSize: "clamp(1.3rem, 1.7vw, 1.7rem)",
            fontWeight: 700,
            color: T.text,
            lineHeight: 1.2,
            marginBottom: "0.35rem",
          }}>
            {PROFILE.name}
          </div>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: "clamp(0.62rem, 0.72vw, 0.74rem)",
            color: T.muted,
            letterSpacing: "0.06em",
            marginBottom: "0.55rem",
          }}>
            {PROFILE.romanizedName} · {PROFILE.handle}
          </div>
          {/* 구직 상태 배지 */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: T.greenBg,
            border: `1px solid ${T.green}30`,
            padding: "3px 9px",
            borderRadius: "3px",
            marginBottom: "0.55rem",
            maxWidth: "100%",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.green, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: "clamp(0.62rem, 0.7vw, 0.72rem)", color: T.green }}>{PROFILE.status}</span>
          </div>
           <div style={{ fontFamily: FONT_SANS, fontSize: "clamp(0.75rem, 0.86vw, 0.88rem)", color: T.sub, lineHeight: 1.7, wordBreak: "keep-all" }}>
            {PROFILE.headline.split("\n").map((line) => (
              <span key={line}>{line}<br /></span>
            ))}
          </div>
        </div>
        {/* 네비게이션 */}
        <nav style={{ flex: 1, minHeight: 0 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  display: "flex",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: "clamp(0.26rem, 0.8vh, 0.4rem) 0",
                  fontFamily: FONT_SANS,
                  fontSize: "clamp(0.82rem, 0.92vw, 0.95rem)",
                  color: isActive ? T.green : T.muted,
                  fontWeight: isActive ? 600 : 400,
                  transition: "color 0.2s",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "0.1rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "16px",
                    height: "1px",
                    background: isActive ? T.green : "transparent",
                    transition: "background 0.2s",
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                />
                <NavIcon type={item.icon} color={isActive ? T.green : T.muted} size={13} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* 연락처 */}
        <div style={{ marginTop: "clamp(0.75rem, 2vh, 1.4rem)", paddingTop: "clamp(0.75rem, 1.8vh, 1.2rem)", borderTop: `1px solid ${T.border}` }}>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: "0.6rem",
            color: T.muted,
            letterSpacing: "0.08em",
            marginBottom: "0.75rem",
          }}>
            {label("contact", "CONTACT")}
          </div>
          {PROFILE.contacts.map((c) => (
            <a
              key={c.href}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: FONT_MONO,
                fontSize: "0.65rem",
                color: T.sub,
                textDecoration: "none",
                marginBottom: "0.45rem",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = T.green)}
              onMouseLeave={(e) => (e.currentTarget.style.color = T.sub)}
            >
              <ContactIcon type={c.type} color={T.muted} />
              {c.label}
            </a>
          ))}
        </div>

        <PreferenceSegmentedControl
          T={T}
          theme={theme}
          locale={locale}
          onTheme={toggleTheme}
          onLocale={toggleLocale}
          themeLabel={themeToggleLabel}
          localeLabel={languageToggleLabel}
          style={{ marginTop: "clamp(0.7rem, 1.8vh, 1rem)" }}
        />
      </aside>

      {/* ════════════════════════════
          우측 스크롤 콘텐츠
      ════════════════════════════ */}
      <div
        id="scroll-area"
        style={{ flex: 1, overflowY: "auto", height: "100dvh" }}
      >
        <div
          className="scroll-inner"
          style={{
            width: "100%",
            maxWidth: "clamp(680px, 58vw, 980px)",
            padding: `clamp(2.5rem, 5vw, 5rem) clamp(2rem, 4vw, 4rem) ${scrollEndPadding}`,
          }}
        >

          {/* ── 소개 ── */}
          <FadeSection>
            {/* 도트 패턴 배경 카드 */}
            <div
              style={{
                position: "relative",
                borderRadius: "6px",
                overflow: "hidden",
                marginBottom: "2rem",
                border: `1px solid ${T.border}`,
              }}
            >
              <img
                src={IMG.dotPattern}
                alt=""
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: theme === "dark" ? 0.12 : 0.35,
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", padding: "1.75rem 2rem" }}>
                <SectionTitle id="about" icon="user" T={T}>About</SectionTitle>
                <p style={{
                  fontFamily: FONT_SANS,
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: T.text,
                  lineHeight: 1.75,
                  marginBottom: "1.25rem",
                  wordBreak: "keep-all",
                }}>
                  {PROFILE.summaryLead}
                </p>
                {PROFILE.summary.map((paragraph, idx) => (
                  <p
                    key={paragraph}
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: "0.88rem",
                      color: T.sub,
                      lineHeight: 1.85,
                      marginBottom: idx < PROFILE.summary.length - 1 ? "1rem" : 0,
                      wordBreak: "keep-all",
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </FadeSection>

          {/* ── 학력 ── */}
          <FadeSection>
            <SectionTitle id="education" icon="graduation" T={T}>Timeline</SectionTitle>
            <div className="timeline-connection-list" aria-label={locale === "en" ? "Timeline entries" : "타임라인 항목"}>
              {visibleTimelineEntries.map((edu) => {
                const timelineKey = `${edu.type}:${edu.degree}:${edu.period}`;
                const relatedProjects = PROJECTS.filter((project) => edu.relatedProjects.includes(project.slug));
                const timelineChipItems = buildTimelineChipItems({
                  links: edu.links,
                  relatedProjects,
                  relatedSkills: edu.relatedSkills,
                  previewHref,
                });
                return (
                <article key={timelineKey} className="timeline-connection-entry">
                  <div className="timeline-spine" aria-hidden="true">
                    <span className={edu.current ? "timeline-node current" : "timeline-node"} />
                  </div>
                  <div className="timeline-main-copy">
                    <div className="timeline-entry-head">
                      <span className="timeline-kicker">
                        {timelineTypeLabel(edu.type, locale)} · {edu.period}
                      </span>
                      <span className="timeline-entry-summary">
                        <span>{edu.degree}</span>
                        <span className="timeline-school">{edu.school}</span>
                        {edu.current && <span className="timeline-current">{label("current", "진행 중")}</span>}
                      </span>
                    </div>
                    {(edu.note || edu.bullets.length > 0) && (
                      <div className="timeline-entry-detail">
                        {edu.note && <p className="timeline-entry-note">{edu.note}</p>}
                        {edu.bullets.length > 0 && (
                          <ul className="timeline-entry-bullets">
                            {edu.bullets.map((bullet) => (
                              <li key={bullet}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  {timelineChipItems.length > 0 && (
                    <>
                      <div className="timeline-chip-connector" aria-hidden="true" />
                      <div className="timeline-chip-panel">
                        {timelineChipItems.map((item) => item.href ? (
                          <a
                            key={item.key}
                            className={`timeline-chip ${item.kind}`}
                            href={item.href}
                            target={item.external ? "_blank" : undefined}
                            rel={item.external ? "noopener noreferrer" : undefined}
                          >
                            {item.label}
                          </a>
                        ) : (
                          <span key={item.key} className={`timeline-chip ${item.kind}`}>
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </article>
              );
              })}
              {hasMoreTimelineEntries && (
                <>
                  <div ref={timelineLoadSentinelRef} className="timeline-load-sentinel" aria-hidden="true" />
                  <button type="button" className="timeline-load-more" onClick={revealMoreTimelineEntries}>
                    {locale === "en" ? "Load more timeline entries" : "타임라인 더 보기"}
                  </button>
                </>
              )}
            </div>
          </FadeSection>

          {/* ── 연구 관심사 ── */}
          <FadeSection>
            <SectionTitle id="research" icon="flask" T={T}>Research Interests</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {RESEARCH_INTERESTS.map((r) => {
                const ragCaption = label("ragCaption", "Dense + Sparse + Graph 3채널 하이브리드 검색 아키텍처");
                const researchPreview = r.coverImage
                  ? buildCoverPreview({ locale, kind: "research", title: r.title, src: r.coverImage })
                  : r.showDiagram
                    ? buildResearchDiagramPreview({ locale, title: r.title, src: IMG.ragDiagram, caption: ragCaption })
                    : null;

                return (
                <div key={r.title}>
                  <div
                    className={researchPreview ? "research-card has-cover" : "research-card"}
                    style={{
                      paddingLeft: "0.9rem",
                      borderLeft: `2px solid ${T.border}`,
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = T.green)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = T.border)}
                  >
                    <div className="research-copy">
                      <div style={{
                        fontFamily: FONT_SANS,
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: T.text,
                        marginBottom: "4px",
                      }}>
                        {r.title}
                      </div>
                      <div style={{
                        fontFamily: FONT_SANS,
                        fontSize: "0.82rem",
                        color: T.sub,
                        lineHeight: 1.8,
                        wordBreak: "keep-all",
                      }}>
                        {r.desc}
                      </div>
                    </div>
                    {researchPreview && (
                      <button
                        type="button"
                        className="content-cover-button research-cover-button"
                        aria-label={researchPreview.actionLabel}
                        onClick={() => setCoverPreview(researchPreview)}
                      >
                        <img
                          src={researchPreview.src}
                          alt={researchPreview.alt}
                          className="content-cover-thumb research-cover-thumb"
                          style={{
                            borderColor: T.border,
                            background: T.surface,
                          }}
                        />
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </FadeSection>

          {/* ── 프로젝트 ── */}
          <FadeSection>
            <SectionTitle id="projects" icon="code" T={T}>Projects</SectionTitle>
            <div style={{
              border: `1px solid ${T.border}`,
              borderRadius: "4px",
              overflow: "hidden",
              background: T.surface,
            }}>
              {PROJECTS.map((proj, idx) => {
                const graphNodeId = `project:${proj.slug}`;
                return (
                  <div
                    key={proj.name}
                    className="proj-row"
                    data-kg-node-id={graphNodeId}
                    style={{
                      padding: "1rem 1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                      borderBottom: idx < PROJECTS.length - 1 ? `1px solid ${T.border}` : "none",
                      background: focusedGraphNodeId === graphNodeId ? T.bg : T.surface,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={() => {
                      setFocusedGraphNodeId(graphNodeId);
                    }}
                    onMouseLeave={() => {
                      setFocusedGraphNodeId(null);
                    }}
                  >
                    <div className={proj.coverImage ? "project-content has-cover" : "project-content"}>
                      <div className="project-copy">
                        {/* 헤더 */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            {proj.private ? <LockIcon color={T.muted} /> : <RepoIcon color={T.muted} />}
                            <span style={{
                              fontFamily: FONT_MONO,
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color: proj.highlight ? T.green : T.text,
                            }}>
                              {proj.name}
                            </span>
                            {proj.highlight && (
                              <span style={{
                                fontFamily: FONT_MONO,
                                fontSize: "0.58rem",
                                color: T.green,
                                border: `1px solid ${T.green}50`,
                                padding: "1px 5px",
                                borderRadius: "2px",
                              }}>
                                {label("featured", "핵심")}
                              </span>
                            )}
                            {proj.private && (
                              <span style={{
                                fontFamily: FONT_MONO,
                                fontSize: "0.58rem",
                                color: T.muted,
                                border: `1px solid ${T.border}`,
                                padding: "1px 5px",
                                borderRadius: "2px",
                              }}>
                                {label("private", "비공개")}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ fontFamily: FONT_MONO, fontSize: "0.62rem", color: T.muted }}>
                              {proj.period}
                            </span>
                            <a
                              href={previewHref(`/projects/${proj.slug}`)}
                              style={{
                                fontFamily: FONT_MONO,
                                fontSize: "0.62rem",
                                color: T.green,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              {label("detail", "Detail")}
                              <ExternalArrow color={T.green} />
                            </a>
                            {proj.link && <ExternalLink href={proj.link} T={T}>GitHub</ExternalLink>}
                          </div>
                        </div>
                        {/* 설명 */}
                        <p style={{
                          fontFamily: FONT_SANS,
                          fontSize: "0.82rem",
                          color: T.sub,
                          lineHeight: 1.8,
                          margin: 0,
                          wordBreak: "keep-all",
                        }}>
                          {proj.desc}
                        </p>
                        {/* 정량 성과 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <TrendIcon color={T.green} />
                          <span style={{
                            fontFamily: FONT_MONO,
                            fontSize: "0.68rem",
                            color: T.green,
                          }}>
                            {proj.metric}
                          </span>
                        </div>
                        {/* 태그 */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {proj.tags.map((tag) => <Tag key={tag} T={T}>{tag}</Tag>)}
                        </div>
                      </div>
                      {proj.coverImage && (() => {
                        const preview = buildCoverPreview({ locale, kind: "project", title: proj.name, src: proj.coverImage });
                        return (
                          <button
                            type="button"
                            className="content-cover-button project-cover-button"
                            aria-label={preview.actionLabel}
                            onClick={() => setCoverPreview(preview)}
                          >
                            <img
                              src={preview.src}
                              alt={preview.alt}
                              className="content-cover-thumb project-cover-thumb"
                              style={{ borderColor: T.border, background: T.bg }}
                            />
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </FadeSection>

          {/* ── 기술 스택 ── */}
          <FadeSection>
            <SectionTitle id="skills" icon="layers" T={T}>Technical Skills</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {SKILL_GROUPS.map((group) => (
                <div key={group.label} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  {/* 카테고리 레이블 */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    fontFamily: FONT_SANS,
                    fontSize: "0.72rem",
                    color: T.muted,
                    minWidth: "100px",
                    paddingTop: "3px",
                    flexShrink: 0,
                  }}>
                    <span style={{ width: "3px", height: "3px", borderRadius: "50%", background: T.green, flexShrink: 0 }} />
                    {group.label}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {group.items.map((item) => <Tag key={item} T={T}>{item}</Tag>)}
                  </div>
                </div>
              ))}
            </div>
          </FadeSection>

          {/* ── 관심 저장소 ── */}
          <FadeSection>
            <SectionTitle id="interests" icon="star" T={T}>Starred Repositories</SectionTitle>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1px",
              background: T.border,
              border: `1px solid ${T.border}`,
              borderRadius: "4px",
              overflow: "hidden",
            }}>
              {STARRED.map((repo) => (
                <div
                  key={repo.name}
                  style={{
                    padding: "0.85rem 1rem",
                    background: T.surface,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = T.surface)}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "6px",
                    marginBottom: "4px",
                  }}>
                    <span style={{
                      fontFamily: FONT_MONO,
                      fontSize: "0.72rem",
                      fontWeight: 500,
                      color: T.text,
                      wordBreak: "break-all",
                    }}>
                      {repo.name}
                    </span>
                    <span style={{
                      fontFamily: FONT_MONO,
                      fontSize: "0.62rem",
                      color: T.muted,
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      flexShrink: 0,
                    }}>
                      <StarIcon color={T.muted} />
                      {repo.stars}
                    </span>
                  </div>
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "0.72rem",
                    color: T.muted,
                  }}>
                    {repo.desc}
                  </div>
                </div>
              ))}
            </div>
          </FadeSection>

          {/* ── 푸터 ── */}
          <footer style={{
            paddingTop: "1.5rem",
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: "0.65rem", color: T.muted }}>
              © 2026 {PROFILE.name} ({PROFILE.romanizedName})
            </span>
            <a
              href={previewHref("/notes")}
              style={{
                fontFamily: FONT_MONO,
                fontSize: "0.65rem",
                color: T.green,
                textDecoration: "none",
              }}
            >
              {label("notes", "notes")}
            </a>
            <a
              href={PROFILE.contacts.find((contact) => contact.type === "github")?.href ?? "https://github.com/NAMUORI00"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: FONT_MONO,
                fontSize: "0.65rem",
                color: T.green,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={T.green}>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              {PROFILE.contacts.find((contact) => contact.type === "github")?.label ?? "github.com/NAMUORI00"}
            </a>
          </footer>

        </div>
      </div>

      <KnowledgeGraphRail graph={KNOWLEDGE_GRAPH} T={T} active={active} focusNodeId={focusedGraphNodeId} />

      {coverPreview && (
        <div
          className="cover-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={coverPreview.dialogLabel}
          onClick={() => setCoverPreview(null)}
        >
          <figure className="cover-preview-modal" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="cover-preview-close"
              aria-label={coverPreview.closeLabel}
              onClick={() => setCoverPreview(null)}
            >
              ×
            </button>
            <img src={coverPreview.src} alt={coverPreview.alt} />
            <figcaption>{coverPreview.title}</figcaption>
          </figure>
        </div>
      )}

      {/* ── 전역 스타일 ── */}
      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: ${T.green} ${T.surface};
        }
        *::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        *::-webkit-scrollbar-track {
          background: ${T.surface};
          border-left: 1px solid ${T.border};
        }
        *::-webkit-scrollbar-thumb {
          background: ${T.green};
          border: 3px solid ${T.surface};
          border-radius: 999px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: ${T.greenLight};
        }
        #scroll-area::-webkit-scrollbar-track,
        .mobile-drawer::-webkit-scrollbar-track {
          background: ${T.bg};
        }
        #scroll-area::-webkit-scrollbar-thumb,
        .mobile-drawer::-webkit-scrollbar-thumb {
          background: ${T.green};
          border-color: ${T.bg};
        }
        .preference-control {
          display: flex;
          width: 100%;
          min-height: 32px;
          border: 1px solid;
          border-radius: 4px;
          overflow: hidden;
          box-sizing: border-box;
          transition: background 0.18s ease, border-color 0.18s ease;
        }
        .preference-segment {
          appearance: none;
          border: 0;
          background: transparent;
          min-width: 0;
          flex: 1 1 0;
          padding: 0 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          font-family: ${FONT_MONO};
          font-size: 0.62rem;
          line-height: 1;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .preference-segment:hover,
        .preference-segment:focus-visible {
          background: ${T.greenBg};
          color: ${T.green} !important;
          outline: none;
        }
        .preference-segment:focus-visible {
          box-shadow: inset 0 0 0 1px ${T.green};
        }
        .preference-segment:disabled {
          cursor: default;
          opacity: 0.55;
        }
        .preference-divider {
          width: 1px;
          flex: 0 0 1px;
          align-self: stretch;
        }
         .preference-code {
           font-size: 0.68rem;
           font-weight: 700;
           letter-spacing: 0;
         }
         .timeline-connection-list {
           display: flex;
           flex-direction: column;
           gap: 0;
         }
         .timeline-connection-entry {
           display: grid;
           grid-template-columns: 18px minmax(0, 1fr) clamp(28px, 4vw, 54px) minmax(160px, 0.42fr);
           gap: 0 clamp(0.75rem, 1.5vw, 1.15rem);
           position: relative;
           padding: 0 0 1.35rem;
         }
         .timeline-spine {
           position: relative;
           display: flex;
           justify-content: center;
           padding-top: 0.55rem;
         }
         .timeline-spine::before {
           content: "";
           position: absolute;
           top: 1.35rem;
           bottom: -1.35rem;
           width: 1px;
           background: linear-gradient(to bottom, ${T.green}55, ${T.border});
         }
         .timeline-connection-entry:last-child .timeline-spine::before {
           display: none;
         }
         .timeline-node {
           position: relative;
           z-index: 1;
           width: 8px;
           height: 8px;
           border-radius: 50%;
           border: 2px solid ${T.muted};
           background: ${T.surface};
           box-shadow: 0 0 0 5px ${T.bg};
         }
         .timeline-node.current {
           border-color: ${T.green};
           background: ${T.green};
           box-shadow: 0 0 0 5px ${T.greenBg};
         }
         .timeline-main-copy {
           min-width: 0;
           padding-bottom: 0.15rem;
         }
          .timeline-entry-head {
            padding: 0.05rem 0 0;
          }
         .timeline-kicker {
           display: block;
           font-family: ${FONT_MONO};
           font-size: 0.65rem;
           color: ${T.muted};
           margin-bottom: 0.35rem;
         }
         .timeline-entry-summary {
           display: flex;
           align-items: center;
           gap: 0.5rem;
           flex-wrap: wrap;
           max-width: 70ch;
           font-family: ${FONT_SANS};
           font-size: 0.9rem;
           font-weight: 600;
           color: ${T.text};
           line-height: 1.55;
         }
         .timeline-school {
           color: ${T.sub};
           font-weight: 500;
         }
         .timeline-current {
           font-family: ${FONT_MONO};
           font-size: 0.6rem;
           color: ${T.green};
           background: ${T.greenBg};
           border: 1px solid ${T.green}40;
           padding: 1px 6px;
           border-radius: 2px;
           font-weight: 400;
         }
          .timeline-entry-detail {
            position: relative;
            max-width: 70ch;
            max-height: none;
            margin-top: 0.65rem;
            overflow: visible;
            color: ${T.sub};
            font-family: ${FONT_SANS};
            font-size: 0.8rem;
            line-height: 1.78;
            word-break: keep-all;
          }
         .timeline-entry-note {
           margin: 0;
         }
         .timeline-entry-bullets {
           display: grid;
           gap: 0.28rem;
           margin: 0.45rem 0 0;
           padding-left: 1rem;
         }
         .timeline-entry-bullets li::marker {
           color: ${T.green};
         }
          .timeline-chip-connector {
           align-self: start;
           position: relative;
           height: 1px;
           min-height: 2.6rem;
         }
         .timeline-chip-connector::before {
           content: "";
           position: absolute;
           left: 0;
           right: 0;
           top: 50%;
           height: 1px;
           background: linear-gradient(to right, ${T.border}, ${T.green}70);
         }
         .timeline-chip-panel {
           display: flex;
           flex-wrap: wrap;
           align-content: flex-start;
           gap: 0.38rem;
           padding-top: 1.35rem;
           min-width: 0;
         }
         .timeline-chip {
           display: inline-flex;
           align-items: center;
           max-width: 100%;
           min-height: 22px;
           border-radius: 999px;
           padding: 3px 7px;
           font-family: ${FONT_MONO};
           font-size: 0.64rem;
           line-height: 1.25;
           text-decoration: none;
           word-break: break-word;
         }
         .timeline-chip.link {
           color: ${T.green};
           background: ${T.greenBg};
           border: 1px solid ${T.green}40;
         }
         .timeline-chip.project {
           color: ${T.green};
           border: 1px solid ${T.green}30;
           background: ${T.surface};
         }
         .timeline-chip.skill {
           color: ${T.sub};
           border: 1px solid ${T.border};
           background: ${T.bg};
         }
          .timeline-chip:hover,
          .timeline-chip:focus-visible {
            border-color: ${T.green};
            color: ${T.green};
            outline: none;
          }
          .timeline-load-sentinel {
            width: 100%;
            height: 1px;
          }
          .timeline-load-more {
            align-self: flex-start;
            margin: 0.2rem 0 0 18px;
            border: 1px solid ${T.green}40;
            background: ${T.greenBg};
            color: ${T.green};
            border-radius: 999px;
            padding: 0.35rem 0.7rem;
            font-family: ${FONT_MONO};
            font-size: 0.68rem;
            line-height: 1.3;
            cursor: pointer;
          }
          .timeline-load-more:hover,
          .timeline-load-more:focus-visible {
            border-color: ${T.green};
            outline: none;
          }
         .research-card.has-cover {
           display: grid;
           grid-template-columns: minmax(0, 1fr) clamp(76px, 12vw, 108px);
           gap: 0.75rem;
           align-items: start;
        }
        .project-content {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .project-content.has-cover {
          display: grid;
          grid-template-columns: minmax(0, 1fr) clamp(84px, 13vw, 124px);
          gap: 0.85rem;
          align-items: start;
        }
        .research-copy {
          min-width: 0;
        }
        .project-copy {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          min-width: 0;
        }
        .content-cover-button {
          appearance: none;
          border: 0;
          border-radius: 4px;
          background: transparent;
          padding: 0;
          margin: 0;
          cursor: zoom-in;
          justify-self: end;
          align-self: start;
          width: 100%;
          max-width: 124px;
          color: inherit;
        }
        .research-cover-button {
          max-width: 108px;
        }
        .project-cover-button {
          max-width: 124px;
        }
        .content-cover-button:focus-visible {
          outline: 2px solid ${T.green};
          outline-offset: 3px;
        }
        .content-cover-thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border: 1px solid;
          border-radius: 4px;
          object-fit: cover;
          display: block;
          opacity: 0.82;
          transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .research-cover-thumb {
          min-height: 76px;
        }
        .project-cover-thumb {
          min-height: 84px;
        }
        .content-cover-button:hover .content-cover-thumb,
        .content-cover-button:focus-visible .content-cover-thumb {
          border-color: ${T.green} !important;
          box-shadow: 0 10px 24px ${T.green}24;
          opacity: 1;
          transform: scale(1.045);
        }
        .cover-preview-backdrop {
          position: fixed;
          inset: 0;
          z-index: 360;
          display: grid;
          place-items: center;
          padding: clamp(1rem, 4vw, 3rem);
          background: rgba(0, 0, 0, ${theme === "dark" ? "0.66" : "0.52"});
          backdrop-filter: blur(3px);
        }
        .cover-preview-modal {
          position: relative;
          width: min(920px, 92vw);
          max-height: min(760px, 88dvh);
          margin: 0;
          padding: clamp(0.75rem, 2vw, 1rem);
          border: 1px solid ${T.border};
          border-radius: 6px;
          background: ${T.surface};
          box-shadow: 0 24px 80px rgba(0, 0, 0, ${theme === "dark" ? "0.5" : "0.28"});
        }
        .cover-preview-modal img {
          width: 100%;
          max-height: min(660px, 72dvh);
          object-fit: contain;
          display: block;
          border-radius: 4px;
          background: ${T.bg};
        }
        .cover-preview-modal figcaption {
          margin-top: 0.65rem;
          font-family: ${FONT_SANS};
          font-size: 0.82rem;
          color: ${T.sub};
          line-height: 1.5;
        }
        .cover-preview-close {
          position: absolute;
          top: 0.65rem;
          right: 0.65rem;
          width: 30px;
          height: 30px;
          border: 1px solid ${T.border};
          border-radius: 50%;
          background: ${T.surface};
          color: ${T.text};
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        }
        .cover-preview-close:hover,
        .cover-preview-close:focus-visible {
          border-color: ${T.green};
          color: ${T.green};
        }
        .mobile-knowledge-section { display: none; }
        @media (max-width: 1180px) {
          #knowledge-rail { display: none !important; }
          .scroll-inner { max-width: clamp(720px, 68vw, 1080px) !important; }
        }
        @media (max-width: 768px) {
          #sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .scroll-inner { padding: 2rem 1.5rem 3rem !important; }
          .mobile-drawer .mobile-knowledge-section {
            display: block;
            margin: 1.05rem 0 1rem !important;
          }
          .mobile-drawer .mobile-knowledge-canvas {
            max-height: 154px;
          }
           .research-card.has-cover,
           .project-content.has-cover { grid-template-columns: 1fr; }
           .timeline-connection-entry {
             grid-template-columns: 16px minmax(0, 1fr);
             gap: 0 0.85rem;
           }
           .timeline-chip-connector {
             display: none;
           }
           .timeline-chip-panel {
             grid-column: 2;
             padding-top: 0.65rem;
           }
           .timeline-load-more {
             margin-left: 16px;
           }
           .content-cover-button {
             justify-self: start;
             width: min(38vw, 116px);
            max-width: 116px;
          }
          .cover-preview-modal {
            width: 94vw;
            padding: 0.65rem;
          }
        }
        .mobile-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 150;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .mobile-overlay.open {
          display: block;
          opacity: 1;
        }
        .mobile-drawer {
          position: fixed;
          top: 0; left: -280px;
          width: 260px; height: 100dvh;
          z-index: 160;
          padding: 2rem 1.5rem;
          overflow-y: auto;
          transition: left 0.25s ease;
        }
        .mobile-drawer.open { left: 0; }
        @media print {
          #sidebar { position: static !important; height: auto !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #e8e8e5 !important; flex-direction: row !important; flex-wrap: wrap !important; padding: 1rem !important; }
          #scroll-area { height: auto !important; overflow: visible !important; }
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
