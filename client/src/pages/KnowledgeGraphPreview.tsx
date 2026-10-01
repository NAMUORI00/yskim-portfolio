/*
 * /design/knowledge-graph — 오른쪽 지식 그래프 시안을 실제 홈 화면(최신 콘텐츠·글꼴·섹션 순서 그대로)에서 비교하는 로컬 검토용 라우트
 * 공개 홈("/")에도 승인한 층위형 지도를 적용합니다. 이 주소에서만 HomeView 의 renderKnowledgeGraph 로 오른쪽 레일과 휴대폰 서랍의 지도를 바꿔 끼웁니다.
 * ?graph=original 이면 지금 쓰는 그래프, 없으면 제안한 층위형 지식 지도를 보여 줍니다. 아래 가운데의 작은 전환 단추로 바꿉니다.
 * 시안에서 오류가 나면 그 자리만 지금 쓰는 그래프로 돌아갑니다.
 */
import { useEffect, useState } from "react";
import { mapThemeVars } from "@/components/knowledgeMap/KnowledgeMapCanvas";
import { DARK, LIGHT } from "@/content/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { HomeView } from "@/pages/Home";

import { renderProposedGraph } from "@/components/knowledgeMap/renderKnowledgeMap";
export { renderProposedGraph } from "@/components/knowledgeMap/renderKnowledgeMap";

export type GraphVariant = "proposed" | "original";

export function readGraphVariant(search: string): GraphVariant {
  return new URLSearchParams(search).get("graph") === "original" ? "original" : "proposed";
}


const SWITCH_TEXT = {
  ko: { label: "그래프 시안", original: "기존", proposed: "제안" },
  en: { label: "Graph preview", original: "Current", proposed: "Proposed" },
} as const;

function GraphSwitch({ variant, onChange }: { variant: GraphVariant; onChange: (variant: GraphVariant) => void }) {
  const { theme } = useTheme();
  const { locale } = useLanguage();
  const T = theme === "dark" ? DARK : LIGHT;
  const text = SWITCH_TEXT[locale];
  return (
    <div className="km-root kgp-switch" role="group" aria-label={text.label} style={mapThemeVars(T, T.surface)}>
      <span aria-hidden="true">{text.label}</span>
      <div className="km-segment">
        {(["original", "proposed"] as const).map((item) => (
          <button key={item} type="button" aria-pressed={variant === item} onClick={() => onChange(item)}>
            {text[item]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function KnowledgeGraphPreview() {
  const [variant, setVariant] = useState<GraphVariant>(() => (typeof window === "undefined" ? "proposed" : readGraphVariant(window.location.search)));

  // 검토용 주소가 검색엔진에 노출되지 않도록 noindex 를 잠시 추가합니다.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    meta.setAttribute("data-design-preview", "true");
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  // 고른 시안을 주소에 남겨 같은 화면을 다시 열 수 있게 합니다 (언어 설정 ?lang= 은 그대로 둠).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (variant === "original") url.searchParams.set("graph", "original");
    else url.searchParams.delete("graph");
    window.history.replaceState(null, "", url);
  }, [variant]);

  return (
    <>
      <HomeView renderKnowledgeGraph={variant === "proposed" ? renderProposedGraph : undefined} />
      <GraphSwitch variant={variant} onChange={setVariant} />
    </>
  );
}
