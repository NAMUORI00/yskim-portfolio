import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { portfolioContent as content } from "@/content";
import {
  availableProjects,
  availableRecords,
  moveItem,
  purposeNames,
  recommendationReason,
  recommend,
  recordId,
  selectedItems,
  submissionIntroduction,
  typeNames,
  type Detail,
  type Purpose,
  type Selection,
} from "@/submission/model";
import { technicalSkills, projectDiagram } from "@/submission/presentation";
import "./SubmissionStudio.css";
function download(blob: Blob) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `${content.profile.name}_이력서_포트폴리오.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export default function SubmissionStudio() {
  const [purpose, setPurpose] = useState<Purpose>("ai");
  const [selection, setSelection] = useState<Selection>(() =>
    recommend(content, "ai")
  );
  const [detail, setDetail] = useState<Detail>("standard");
  const [introduction, setIntroduction] = useState(submissionIntroduction);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(
    null
  );
  const previewRef = useRef<string | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);
  function invalidate() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setError("");
  }
  function update(next: Selection) {
    invalidate();
    setSelection(next);
  }
  const chosen = selectedItems(content, selection),
    skills = technicalSkills(chosen.projects, chosen.records);
  const valid = chosen.projects.length > 0 || chosen.records.length > 0;
  async function generate() {
    if (busy || !valid) return;
    invalidate();
    setBusy(true);
    try {
      const { generateSubmission } = await import(
        "@/submission/SubmissionDocument"
      );
      const blob = await generateSubmission({
        content,
        selection,
        kind: "combined",
        detail,
        introduction,
      });
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob);
      previewRef.current = url;
      setPreview({ url, blob });
    } catch (e) {
      console.error("Submission PDF generation failed", e);
      if (mounted.current)
        setError(
          "PDF를 만들지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요. 편집 내용은 유지됩니다."
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function picker(axis: "projects" | "records") {
    const all =
      axis === "projects"
        ? availableProjects(content).map(p => ({
            id: p.slug,
            title: p.name,
            note: recommendationReason(p, purpose),
          }))
        : availableRecords(content).map(e => ({
            id: recordId(e),
            title: e.degree,
            note: `${typeNames[e.type]} · ${e.period} · ${e.school}`,
          }));
    const ids = selection[axis];
    const ordered = [
      ...ids.flatMap(id => all.filter(item => item.id === id)),
      ...all.filter(item => !ids.includes(item.id)),
    ];
    return (
      <ul className="submission-items">
        {ordered.map(item => {
          const index = ids.indexOf(item.id);
          return (
            <li key={item.id}>
              <label>
                <input
                  type="checkbox"
                  checked={index >= 0}
                  onChange={e =>
                    update({
                      ...selection,
                      [axis]: e.target.checked
                        ? [...ids, item.id]
                        : ids.filter(id => id !== item.id),
                    })
                  }
                />
                <span>
                  {item.title}
                  <small>{item.note}</small>
                </span>
              </label>
              {index >= 0 && (
                <div className="submission-order">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`${item.title} 위로`}
                    onClick={() =>
                      update({
                        ...selection,
                        [axis]: moveItem(ids, item.id, -1),
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === ids.length - 1}
                    aria-label={`${item.title} 아래로`}
                    onClick={() =>
                      update({
                        ...selection,
                        [axis]: moveItem(ids, item.id, 1),
                      })
                    }
                  >
                    ↓
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <main className="submission-studio">
      <header className="submission-header">
        <Link href="/">← 포트폴리오 홈</Link>
        <h1>제출용 포트폴리오</h1>
        <p>이력과 프로젝트를 하나의 PDF로 정리합니다.</p>
      </header>
      <fieldset disabled={busy} className="submission-controls">
        <legend className="sr-only">문서 편집</legend>
        <div className="submission-layout">
          <aside className="submission-editor">
            <section>
              <h2>제출 목적과 분량</h2>
              <label>
                지원 분야
                <select
                  value={purpose}
                  onChange={e => setPurpose(e.target.value as Purpose)}
                >
                  {Object.entries(purposeNames).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => update(recommend(content, purpose))}>
                추천 구성 적용
              </button>
              <label>
                설명 분량
                <select
                  value={detail}
                  onChange={e => {
                    invalidate();
                    setDetail(e.target.value as Detail);
                  }}
                >
                  <option value="summary">요약</option>
                  <option value="standard">기본</option>
                  <option value="detailed">상세</option>
                </select>
              </label>
            </section>
            <section>
              <h2>소개</h2>
              <label>
                소개 문구
                <textarea
                  rows={5}
                  maxLength={3000}
                  value={introduction}
                  onChange={e => {
                    invalidate();
                    setIntroduction(e.target.value);
                  }}
                />
              </label>
              <small>
                사이트 원문은 변경되지 않습니다. 화면을 떠나면 편집 내용은
                초기화됩니다.
              </small>
            </section>
            <section>
              <h2>프로젝트</h2>
              <p>선택 {chosen.projects.length}개</p>
              {picker("projects")}
            </section>
            <section>
              <h2>학력·경력</h2>
              <p>선택 {chosen.records.length}개 · 항목별로 묶어 출력합니다.</p>
              {picker("records")}
            </section>
          </aside>
          <div className="submission-preview">
            <section>
              <h2>이력서 및 포트폴리오</h2>
              <p>이력·보유기술 → 경력기술서 → 프로젝트 설명·핵심 도식</p>
              <button className="primary" disabled={!valid} onClick={generate}>
                {busy ? "PDF 생성 중…" : "PDF 미리보기 생성"}
              </button>
              {!valid && (
                <p role="status">
                  이력이나 프로젝트를 하나 이상 선택해 주세요.
                </p>
              )}
              <p className="submission-note">
                A4 · PDF 한 파일 · 한글 검색·복사 · 포트폴리오 링크
              </p>
            </section>
            {error && (
              <p role="alert" className="submission-error">
                {error}
              </p>
            )}
            {preview ? (
              <section>
                <div className="submission-buttons">
                  <button
                    className="primary"
                    onClick={() => download(preview.blob)}
                  >
                    PDF 다운로드
                  </button>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    새 창에서 보기
                  </a>
                </div>
                <iframe
                  title="이력서 및 포트폴리오 PDF 미리보기"
                  src={preview.url}
                  className="submission-pdf"
                />
                <small>
                  PDF가 표시되지 않으면 다운로드하거나 새 창으로 여세요.
                </small>
              </section>
            ) : (
              <section className="submission-outline">
                <h2>{content.profile.name}</h2>
                <p className="submission-introduction">{introduction}</p>
                <h3>보유기술</h3>
                {skills.map(g => (
                  <p key={g.label}>
                    <strong>{g.label}</strong>
                    <br />
                    {g.items.join(" · ")}
                  </p>
                ))}
                <h3>프로젝트</h3>
                {chosen.projects.map((p, index) => {
                  const diagram = projectDiagram(p);
                  return (
                    <article key={p.slug}>
                      <h3>
                        {String(index + 1).padStart(2, "0")} · {p.name}
                      </h3>
                      <p>{p.desc}</p>
                      {diagram.nodes.length > 0 && (
                        <div className="submission-flow">
                          {diagram.nodes.map((node, i) => (
                            <span key={node}>
                              {i > 0 && (
                                <b aria-hidden="true">
                                  {diagram.sequence ? "→" : "·"}
                                </b>
                              )}
                              <em>{node}</em>
                            </span>
                          ))}
                        </div>
                      )}
                      <a
                        href={`https://namuori.net/projects/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        포트폴리오 보기
                      </a>
                    </article>
                  );
                })}
                <p className="submission-note">
                  PDF 미리보기를 생성하면 실제 페이지 배치를 확인할 수 있습니다.
                </p>
              </section>
            )}
          </div>
        </div>
      </fieldset>
      <p role="status" aria-live="polite">
        {busy ? "문서를 준비하고 있습니다." : ""}
      </p>
    </main>
  );
}
