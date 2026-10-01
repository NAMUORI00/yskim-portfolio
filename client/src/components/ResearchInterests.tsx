import { BookOpen, Video, Gauge, Cpu, AudioLines, Workflow, ArrowUpRight } from "lucide-react";
import type { ResearchEntry } from "@/content";
import { FONT_SANS, type PortfolioTheme } from "@/content/theme";

const icons = { rag: BookOpen, "video-qa": Video, "sensor-operations": Gauge, "edge-llm": Cpu, "audio-voice": AudioLines, "agentic-workflow": Workflow };

type InterestKind = "published" | "review" | "simulated" | "implemented" | "exploring";

/**
 * 분야마다 지금까지 한 일이 어떤 성격인지 — 게재 논문, 심사 중 논문, 시뮬레이터 검증, 구현, 탐색을 구분합니다.
 * 근거는 content/research/<slug>.mdx 본문입니다.
 */
const STATUS: Record<string, { kind: InterestKind; ko: string; en: string }> = {
  rag: { kind: "published", ko: "KCI 논문 게재", en: "Published · KCI" },
  "video-qa": { kind: "review", ko: "IEEE Access 심사 중", en: "Under review · IEEE Access" },
  "sensor-operations": { kind: "simulated", ko: "시뮬레이터에서 검증", en: "Validated on a simulator" },
  "edge-llm": { kind: "exploring", ko: "실행 환경 구성·탐색", en: "Setup and exploration" },
  "audio-voice": { kind: "implemented", ko: "학습 실험 · 웹 서비스 구현", en: "Training runs · web service" },
  "agentic-workflow": { kind: "implemented", ko: "설치·리뷰 도구 구현", en: "Setup and review tools built" },
};

/** 설명의 첫 문장 — 분야를 한 문장으로 소개하고, 자세한 내용은 연구 페이지에서 봅니다. */
export function leadSentence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^.+?[.!?](?=\s|$)/);
  return match ? match[0] : trimmed;
}

export function ResearchInterests({ items, T, locale }: { items: ResearchEntry[]; T: PortfolioTheme; locale: string }) {
  const en = locale === "en";
  return (
    <div style={{ display: "grid", gap: "0.75rem", fontFamily: FONT_SANS }}>
      <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.7, color: T.sub, wordBreak: "keep-all" }}>
        {en
          ? "Areas I want to explore further, building on research and implementation I have done."
          : "직접 연구하고 구현한 경험을 바탕으로 더 탐구하고 싶은 분야입니다."}
      </p>
      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
          gap: "0.65rem",
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {items.map((item) => {
          const Icon = icons[item.slug as keyof typeof icons] ?? BookOpen;
          const status = STATUS[item.slug];
          const dashed = status?.kind === "exploring" || status?.kind === "simulated";
          return (
            <li
              key={item.slug}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                minWidth: 0,
                padding: "0.8rem 0.95rem 0.2rem",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                background: T.surface,
              }}
            >
              <h3 style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", margin: 0, fontSize: "0.9375rem", lineHeight: 1.5, color: T.text, wordBreak: "keep-all" }}>
                <Icon size={17} style={{ flexShrink: 0, marginTop: 3, color: T.green }} aria-hidden="true" />
                {item.title}
              </h3>
              <p style={{ margin: 0, color: T.sub, fontSize: "0.875rem", lineHeight: 1.7, wordBreak: "keep-all", overflowWrap: "anywhere" }}>{leadSentence(item.desc)}</p>
              <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.15rem 0.75rem" }}>
                {status && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0 8px",
                      fontSize: "0.75rem",
                      lineHeight: 1.7,
                      color: status.kind === "exploring" ? T.sub : T.green,
                      background: status.kind === "published" ? T.greenBg : "transparent",
                      border: `1px ${dashed ? "dashed" : "solid"} ${status.kind === "exploring" ? T.border : `${T.green}66`}`,
                      borderRadius: 999,
                    }}
                  >
                    {en ? status.en : status.ko}
                  </span>
                )}
                <a
                  href={`/research/${item.slug}`}
                  aria-label={en ? `${item.title}: work and next questions` : `${item.title}: 수행한 작업과 연구 방향 보기`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: "2.5rem", color: T.green, fontSize: "0.8125rem", fontWeight: 600, textDecoration: "none" }}
                >
                  {en ? "Work and next questions" : "작업과 연구 방향 보기"}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
