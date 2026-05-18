import { Link } from "wouter";
import { DARK, FONT_MONO, FONT_SANS, LIGHT } from "@/content/theme";
import { useTheme } from "@/contexts/ThemeContext";

export default function Admin() {
  const { theme, toggleTheme } = useTheme();
  const T = theme === "dark" ? DARK : LIGHT;

  return (
    <main style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: FONT_SANS }}>
      <div style={{ maxWidth: "1040px", margin: "0 auto", padding: "32px 24px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "24px" }}>
          <div>
            <Link href="/" style={{ color: T.green, fontFamily: FONT_MONO, fontSize: "0.75rem", textDecoration: "none" }}>
              ← Portfolio
            </Link>
            <h1 style={{ margin: "12px 0 4px", fontSize: "1.8rem" }}>Portfolio Admin</h1>
            <p style={{ margin: 0, color: T.sub }}>GitHub 로그인과 편집기는 다음 단계에서 연결됩니다.</p>
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
        <section style={{ border: `1px solid ${T.border}`, background: T.surface, borderRadius: "6px", padding: "20px" }}>
          <h2 style={{ marginTop: 0 }}>준비 중</h2>
          <p style={{ color: T.sub, lineHeight: 1.8 }}>
            이 화면은 같은 배포 안의 `/admin` 진입점입니다. 다음 작업에서 전체 포트폴리오 편집 폼,
            WYSIWYG/Markdown 에디터, GitHub draft 저장, PR 발행 버튼을 이 shell에 붙입니다.
          </p>
        </section>
      </div>
    </main>
  );
}
