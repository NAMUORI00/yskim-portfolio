/*
 * /design/capabilities — 로컬 검토용 라우트
 * 공개 홈("/")과 같은 최종 화면을 그대로 렌더링합니다 (별도 시안 없음).
 * 프로젝트 흐름 도식은 각 프로젝트의 "자세히 보기" 안에 있습니다.
 */
import { useEffect } from "react";
import { HomeView } from "@/pages/Home";

export default function CapabilitiesPreview() {
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

  return <HomeView />;
}
