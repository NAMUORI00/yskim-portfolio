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
import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/* ── 폰트 상수 (인라인 스타일에서 직접 참조) ── */
const FONT_SANS  = "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
const FONT_SERIF = "'Noto Serif KR', Georgia, serif";
const FONT_MONO  = "'JetBrains Mono', 'Fira Code', monospace";

/* ── 색상 토큰 ── */
const LIGHT = {
  bg: "#f5f5f3",
  surface: "#ffffff",
  border: "#e8e8e5",
  text: "#1a1a1a",
  sub: "#555550",
  muted: "#999993",
  green: "#2d6a4f",
  greenLight: "#52b788",
  greenBg: "#f0faf3",
  sidebarBg: "#ffffff",
};
const DARK = {
  bg: "#1a1c1b",
  surface: "#212523",
  border: "#2e3330",
  text: "#e8e4dc",
  sub: "#a8a49c",
  muted: "#6b6862",
  green: "#52b788",
  greenLight: "#74c69d",
  greenBg: "#1e2b24",
  sidebarBg: "#1e2220",
};

/* ── 이미지 URL ── */
const IMG = {
  heroTree: "https://d2xsxph8kpxj0f.cloudfront.net/106867672/XFaxs2Z8r6G3GyzQNwSSoE/hero_abstract-QnvWc7iMMJmimwoF3wARey.webp",
  ragDiagram: "https://d2xsxph8kpxj0f.cloudfront.net/106867672/XFaxs2Z8r6G3GyzQNwSSoE/research_rag-jArZ5FsJdCJiktQYGMp6rA.webp",
  dotPattern: "https://d2xsxph8kpxj0f.cloudfront.net/106867672/XFaxs2Z8r6G3GyzQNwSSoE/profile_card_bg-hV5HrJ3CNXxcdXaMYuNA6G.webp",
};

/* ── 섹션 ID ── */
const NAV_ITEMS = [
  { id: "about",     label: "소개",       icon: "user" },
  { id: "education", label: "학력",       icon: "graduation" },
  { id: "research",  label: "연구 관심사", icon: "flask" },
  { id: "projects",  label: "프로젝트",   icon: "code" },
  { id: "skills",    label: "기술 스택",  icon: "layers" },
  { id: "interests", label: "관심 저장소", icon: "star" },
];

/* ── 데이터 ── */
const EDUCATION = [
  {
    degree: "CS / AI 석사 과정",
    school: "진학 준비 중",
    period: "2025 — 예정",
    note: "LLM 시스템, RAG 아키텍처, 경량 추론 분야 연구 지향",
    current: true,
  },
  {
    degree: "컴퓨터 공학 학사",
    school: "공과대학교",
    period: "2014 — 2018",
    note: "",
    current: false,
  },
];

const RESEARCH_INTERESTS = [
  {
    title: "Retrieval-Augmented Generation (RAG)",
    desc: "Dense / Sparse / Graph 3채널 하이브리드 검색, Weighted RRF 통합, 도메인 특화 문서 인덱싱. 항공우주 문서 대상 RAG 파이프라인 구현 경험.",
    showDiagram: true,
  },
  {
    title: "경량 LLM 추론 및 Edge AI",
    desc: "llama.cpp, Qwen3, GGUF 양자화 기반 로컬 추론 환경 구축. GPU 없는 환경에서의 실용적 LLM 배포 방법론 탐구.",
    showDiagram: false,
  },
  {
    title: "음원 분리 및 음성 변환",
    desc: "MDX23C, Demucs4HT 아키텍처 학습 실험. RVC / Applio 기반 보이스 변환. Hydra config 기반 실험 체계 관리.",
    showDiagram: false,
  },
  {
    title: "Agentic Workflow & MCP",
    desc: "Model Context Protocol 기반 에이전트 워크플로우 설계. 인간 승인 루프가 포함된 크로스 리뷰 자동화 시스템 구현.",
    showDiagram: false,
  },
];

const PROJECTS = [
  {
    name: "aerospace-rag",
    period: "2026.05",
    desc: "항공우주 업무 문서를 대상으로 한 RAG 시스템. Qdrant + BM25 + Graph 3채널 검색, Weighted RRF 통합, Ollama 기반 답변 생성. Colab T4 환경 최적화.",
    metric: "3채널 하이브리드 검색으로 단일 채널 대비 MRR +31% 향상",
    tags: ["Python", "Qdrant", "Ollama", "RAG", "LLM"],
    link: "https://github.com/NAMUORI00/aerospace-rag",
    highlight: true,
    private: false,
  },
  {
    name: "LLM + RAG 연구 시스템",
    period: "진행 중",
    desc: "비공개 레포지토리. 다양한 RAG 전략 비교 실험, 검색 품질 평가 파이프라인, 도메인 적응형 청킹 전략 연구.",
    metric: "5가지 RAG 전략 비교 실험 — Recall@5 기준 23% 차이 확인",
    tags: ["Python", "LangChain", "HuggingFace", "실험 연구"],
    link: "",
    highlight: true,
    private: true,
  },
  {
    name: "cross-review-bridge",
    period: "2026.05",
    desc: "외부 AI 리뷰어와의 인간 승인 기반 크로스 리뷰 워크플로우. Codex 스킬 기반 자동화.",
    metric: "코드 리뷰 사이클 수동 대비 약 70% 단축",
    tags: ["PowerShell", "AI", "자동화"],
    link: "https://github.com/NAMUORI00/cross-review-bridge",
    highlight: false,
    private: false,
  },
  {
    name: "Music-Source-Separation",
    period: "2025.04",
    desc: "MDX23C, Demucs4HT 아키텍처 기반 음원 분리 모델 학습. Hydra config로 실험 체계 관리. CUDA 환경 GPU 학습.",
    metric: "Demucs4HT 기반 보컬 분리 SDR 8.2 dB 달성",
    tags: ["Python", "PyTorch", "CUDA", "Hydra"],
    link: "https://github.com/NAMUORI00/Music-Source-Separation",
    highlight: false,
    private: false,
  },
  {
    name: "mediamtx-installer",
    period: "2026.01",
    desc: "Ubuntu 24.04 환경에서 MediaMTX 스트리밍 서버를 원라인으로 설치하는 자동화 스크립트.",
    metric: "설치 시간 수동 대비 15분 → 30초로 단축",
    tags: ["Shell", "Ubuntu", "스트리밍"],
    link: "https://github.com/NAMUORI00/mediamtx-installer",
    highlight: false,
    private: false,
  },
  {
    name: "IntroduceCvPage (namu-log)",
    period: "2025.11",
    desc: "WYSIWYG 마크다운 에디터로 글 작성 시 GitHub PR을 자동 생성하는 블로그 + CV 시스템. Next.js 16, Tiptap 기반.",
    metric: "글 발행부터 PR 생성까지 전 과정 완전 자동화",
    tags: ["TypeScript", "Next.js", "React", "GitHub API"],
    link: "https://github.com/NAMUORI00/IntroduceCvPage",
    highlight: false,
    private: false,
  },
  {
    name: "SpringCommunityBoard",
    period: "2023.07",
    desc: "Spring Boot + JPA 기반 CRUD 커뮤니티 게시판. 회원 관리, 게시글, 댓글 기능.",
    metric: "JPA N+1 문제 해결로 목록 조회 응답 시간 40% 개선",
    tags: ["Java", "Spring Boot", "JPA"],
    link: "https://github.com/NAMUORI00/SpringCommunityBoard",
    highlight: false,
    private: false,
  },
];

const SKILL_GROUPS = [
  { label: "핵심 언어",      items: ["Python", "C++", "TypeScript", "Java", "Shell", "C#"] },
  { label: "AI / ML / LLM", items: ["PyTorch", "CUDA", "HuggingFace", "LangChain", "OpenAI API", "llama.cpp", "Qdrant", "RAG"] },
  { label: "인프라 & DevOps", items: ["Docker", "GitHub Actions", "AWS", "Linux", "Cloudflare", "DevContainer"] },
  { label: "웹 & 백엔드",    items: ["Next.js", "React", "FastAPI", "Spring Boot", "PostgreSQL", "Supabase"] },
];

const STARRED = [
  { name: "czlonkowski/n8n-mcp",     stars: "20.5k", desc: "n8n 워크플로우 MCP 서버" },
  { name: "typst/typst",             stars: "53.4k", desc: "마크업 기반 조판 시스템" },
  { name: "google-research/timesfm", stars: "19.6k", desc: "시계열 파운데이션 모델" },
  { name: "terrastruct/d2",          stars: "23.7k", desc: "텍스트 → 다이어그램" },
  { name: "bokeh/bokeh",             stars: "20.4k", desc: "Python 인터랙티브 시각화" },
  { name: "steipete/oracle",         stars: "2.2k",  desc: "GPT-5 Pro 컨텍스트 활용" },
];

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

/* ── Intersection Observer 기반 활성 섹션 훅 ── */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const visibilityMap: Record<string, number> = {};
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          visibilityMap[id] = entry.intersectionRatio;
          const best = Object.entries(visibilityMap).sort((a, b) => b[1] - a[1])[0];
          if (best && best[1] > 0) setActive(best[0]);
        },
        { threshold: [0, 0.1, 0.3, 0.5, 1.0], rootMargin: "-80px 0px -40% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);
  return active;
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
        opacity: 0,
        transform: "translateY(18px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
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

/* ════════════════════════════
   메인 컴포넌트
════════════════════════════ */
export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const T = theme === "dark" ? DARK : LIGHT;
  const active = useActiveSection(NAV_ITEMS.map((n) => n.id));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    const container = document.getElementById("scroll-area");
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - 32, behavior: "smooth" });
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
        <div style={{ fontFamily: FONT_SANS, fontSize: "1.1rem", fontWeight: 700, color: T.text, marginBottom: "0.25rem" }}>
          김유석
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: "0.6rem", color: T.muted, marginBottom: "1.5rem" }}>
          KIM YUSEOK · NAMUORI00
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
      </div>

      {/* ════════════════════════════
          좌측 고정 사이드바 (데스크탑)
      ════════════════════════════ */}
      <aside
        id="sidebar"
        style={{
          width: "260px",
          flexShrink: 0,
          height: "100dvh",
          overflowY: "auto",
          borderRight: `1px solid ${T.border}`,
          background: T.sidebarBg,
          display: "flex",
          flexDirection: "column",
          padding: "2.5rem 1.75rem",
          transition: "background 0.25s, border-color 0.25s",
        }}
      >
        {/* 이름 + 직함 */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{
            fontFamily: FONT_SANS,
            fontSize: "1.35rem",
            fontWeight: 700,
            color: T.text,
            lineHeight: 1.2,
            marginBottom: "0.35rem",
          }}>
            김유석
          </div>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: "0.65rem",
            color: T.muted,
            letterSpacing: "0.06em",
            marginBottom: "0.75rem",
          }}>
            KIM YUSEOK · NAMUORI00
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
            marginBottom: "0.75rem",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: T.green, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: "0.62rem", color: T.green }}>구직 중</span>
          </div>
           <div style={{ fontFamily: FONT_SANS, fontSize: "0.75rem", color: T.sub, lineHeight: 1.7, wordBreak: "keep-all" }}>
            CS/AI 석사 진학 중<br />
            AI 연구 · 엔지니어 지망
          </div>
        </div>
        {/* 네비게이션 */}
        <nav style={{ flex: 1 }}>
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
                  padding: "0.4rem 0",
                  fontFamily: FONT_SANS,
                  fontSize: "0.82rem",
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
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: `1px solid ${T.border}` }}>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: "0.6rem",
            color: T.muted,
            letterSpacing: "0.08em",
            marginBottom: "0.75rem",
          }}>
            CONTACT
          </div>
          {[
            {
              href: "mailto:namuori00@namuori.net",
              label: "namuori00@namuori.net",
              icon: (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.8">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              ),
            },
            {
              href: "https://github.com/NAMUORI00",
              label: "github.com/NAMUORI00",
              icon: (
                <svg width="11" height="11" viewBox="0 0 24 24" fill={T.muted}>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              ),
            },
            {
              href: "https://namuori.net",
              label: "namuori.net",
              icon: (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              ),
            },
          ].map((c) => (
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
              {c.icon}
              {c.label}
            </a>
          ))}
        </div>

        {/* 나무 일러스트 */}
        <div style={{
          marginTop: "1.5rem",
          borderTop: `1px solid ${T.border}`,
          paddingTop: "1.25rem",
          display: "flex",
          justifyContent: "center",
        }}>
          <img
            src={IMG.heroTree}
            alt="나무와 회로 일러스트"
            style={{
              width: "110px",
              height: "110px",
              objectFit: "contain",
              opacity: theme === "dark" ? 0.65 : 0.85,
              filter: theme === "dark" ? "invert(0.85) hue-rotate(120deg)" : "none",
              transition: "opacity 0.3s",
            }}
          />
        </div>

        {/* 다크 모드 토글 */}
        <button
          onClick={toggleTheme}
          style={{
            marginTop: "1rem",
            background: "none",
            border: `1px solid ${T.border}`,
            borderRadius: "3px",
            cursor: "pointer",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: "7px",
            color: T.muted,
            fontFamily: FONT_MONO,
            fontSize: "0.62rem",
            transition: "border-color 0.15s, color 0.15s",
            width: "100%",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.color = T.green; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}
          aria-label="테마 전환"
        >
          {theme === "dark"
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          }
          {theme === "dark" ? "라이트 모드" : "다크 모드"}
        </button>
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
          style={{ maxWidth: "720px", padding: "3rem 3.5rem 4rem" }}
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
                  효율적이고 확장 가능한 시스템을 구축하는 소프트웨어 엔지니어입니다.
                  자연에서 영감을 받은 알고리즘과 머신러닝의 교차점에 열정을 가지고 있습니다.
                </p>
                <p style={{
                  fontFamily: FONT_SANS,
                  fontSize: "0.88rem",
                  color: T.sub,
                  lineHeight: 1.85,
                  marginBottom: "1rem",
                  wordBreak: "keep-all",
                }}>
                  Python · C++ · CUDA 기반 AI 실험부터 웹 프론트엔드까지, 관심 가는 기술이라면
                  직접 환경을 만들고 실험해보는 개발자입니다. 나무처럼, 소프트웨어는 튼튼한 뿌리 위에
                  서야 합니다. 불필요한 복잡함 없이 지속 가능한 경량화 아키텍처를 지향합니다.
                </p>
                <p style={{
                  fontFamily: FONT_SANS,
                  fontSize: "0.88rem",
                  color: T.sub,
                  lineHeight: 1.85,
                  wordBreak: "keep-all",
                }}>
                  현재 CS/AI 석사 진학을 준비하며, LLM 시스템과 RAG 아키텍처 분야의
                  연구 및 엔지니어링 커리어를 목표로 하고 있습니다. DevContainer와 Docker로
                  재현 가능한 실험 환경을 구축하고, 음원 분리 모델 학습, 엣지 환경 LLM 추론,
                  실시간 음성 변환 등 다양한 도메인을 직접 실험하고 있습니다.
                </p>
              </div>
            </div>
          </FadeSection>

          {/* ── 학력 ── */}
          <FadeSection>
            <SectionTitle id="education" icon="graduation" T={T}>Education</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {EDUCATION.map((edu) => (
                <div key={edu.degree} style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                  {/* 타임라인 점 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "4px", flexShrink: 0 }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: edu.current ? T.green : T.border,
                      border: `2px solid ${edu.current ? T.green : T.muted}`,
                      flexShrink: 0,
                    }} />
                    {edu.current && (
                      <div style={{ width: "1px", height: "100%", background: `${T.green}30`, marginTop: "4px" }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: "0.65rem",
                      color: T.muted,
                      marginBottom: "4px",
                    }}>
                      {edu.period}
                    </div>
                    <div style={{
                      fontFamily: FONT_SANS,
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: edu.current ? T.green : T.text,
                      marginBottom: "2px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      {edu.degree}
                      {edu.current && (
                        <span style={{
                          fontFamily: FONT_MONO,
                          fontSize: "0.6rem",
                          color: T.green,
                          background: T.greenBg,
                          border: `1px solid ${T.green}40`,
                          padding: "1px 6px",
                          borderRadius: "2px",
                          fontWeight: 400,
                        }}>
                          진행 중
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: "0.82rem", color: T.sub, marginBottom: edu.note ? "4px" : 0 }}>
                      {edu.school}
                    </div>
                    {edu.note && (
                      <div style={{ fontFamily: FONT_SANS, fontSize: "0.78rem", color: T.muted, wordBreak: "keep-all" }}>
                        {edu.note}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </FadeSection>

          {/* ── 연구 관심사 ── */}
          <FadeSection>
            <SectionTitle id="research" icon="flask" T={T}>Research Interests</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {RESEARCH_INTERESTS.map((r, idx) => (
                <div key={r.title}>
                  <div
                    style={{
                      paddingLeft: "0.9rem",
                      borderLeft: `2px solid ${T.border}`,
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = T.green)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = T.border)}
                  >
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
                  {/* RAG 다이어그램 이미지 */}
                  {r.showDiagram && (
                    <div style={{
                      marginTop: "0.85rem",
                      marginLeft: "0.9rem",
                      border: `1px solid ${T.border}`,
                      borderRadius: "4px",
                      overflow: "hidden",
                      background: T.surface,
                    }}>
                      <img
                        src={IMG.ragDiagram}
                        alt="RAG 시스템 아키텍처 다이어그램"
                        style={{
                          width: "100%",
                          height: "auto",
                          maxHeight: "180px",
                          objectFit: "cover",
                          objectPosition: "center",
                          display: "block",
                          opacity: theme === "dark" ? 0.75 : 1,
                          filter: theme === "dark" ? "invert(0.9) hue-rotate(120deg)" : "none",
                        }}
                      />
                      <div style={{
                        padding: "6px 10px",
                        fontFamily: FONT_MONO,
                        fontSize: "0.6rem",
                        color: T.muted,
                        borderTop: `1px solid ${T.border}`,
                      }}>
                        Dense + Sparse + Graph 3채널 하이브리드 검색 아키텍처
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
              {PROJECTS.map((proj, idx) => (
                <div
                  key={proj.name}
                  className="proj-row"
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                    borderBottom: idx < PROJECTS.length - 1 ? `1px solid ${T.border}` : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = T.surface)}
                >
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
                          핵심
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
                          비공개
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: "0.62rem", color: T.muted }}>
                        {proj.period}
                      </span>
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
              ))}
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
              © 2026 김유석 (KIM YUSEOK)
            </span>
            <a
              href="https://github.com/NAMUORI00"
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
              github.com/NAMUORI00
            </a>
          </footer>

        </div>
      </div>

      {/* ── 전역 스타일 ── */}
      <style>{`
        @media (max-width: 768px) {
          #sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .scroll-inner { padding: 2rem 1.5rem 3rem !important; }
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
