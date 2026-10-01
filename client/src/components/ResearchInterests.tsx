import { BookOpen, Video, Gauge, Cpu, AudioLines, Workflow, ArrowUpRight } from "lucide-react";
import type { ResearchEntry } from "@/content";
import { FONT_SANS, type PortfolioTheme } from "@/content/theme";

const icons = { rag: BookOpen, "video-qa": Video, "sensor-operations": Gauge, "edge-llm": Cpu, "audio-voice": AudioLines, "agentic-workflow": Workflow };

export function ResearchInterests({ items, T, locale }: { items: ResearchEntry[]; T: PortfolioTheme; locale: string }) {
  return <div style={{ display: "grid", gap: "1rem", fontFamily: FONT_SANS }}>
    <p style={{ margin: "0 0 0.25rem", fontSize: "1rem", lineHeight: 1.8, color: T.sub }}>
      {locale === "en" ? "These interests connect my research and implementation experience with the questions I want to explore next." : "직접 연구하고 구현한 경험을 바탕으로 더 탐구하고 싶은 분야입니다. 각 항목에서 수행한 작업과 앞으로 살펴볼 내용을 함께 정리했습니다."}
    </p>
    {items.map(item => {
      const Icon = icons[item.slug as keyof typeof icons] ?? BookOpen;
      return <article key={item.slug} style={{ padding: "1.25rem", border: `1px solid ${T.border}`, borderRadius: 6, background: T.surface }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.65rem", margin: "0 0 0.6rem", fontSize: "1.125rem", lineHeight: 1.5, color: T.text }}>
          <Icon size={24} style={{ flexShrink: 0, color: T.green }} aria-hidden="true" />{item.title}
        </h3>
        <p style={{ margin: 0, color: T.sub, fontSize: "1rem", lineHeight: 1.85, wordBreak: "keep-all", overflowWrap: "anywhere" }}>{item.desc}</p>
        <a href={`/research/${item.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, marginTop: 8, color: T.green, fontSize: "0.9375rem", textDecoration: "none" }}>
          {locale === "en" ? "Experience, interests and related project" : "수행한 작업과 연구 방향 보기"}<ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </article>;
    })}
  </div>;
}
