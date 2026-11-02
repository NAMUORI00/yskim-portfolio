import { submissionIntroduction } from "@/submission/model";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { portfolioContent as content } from "@/content";
import {
  availableProjects,
  availableRecords,
  documentNames,
  moveItem,
  purposeNames,
  recommendationReason,
  recommend,
  recordId,
  selectedItems,
  typeNames,
  type Detail,
  type DocumentKind,
  type Purpose,
  type Selection,
} from "@/submission/model";
import "./SubmissionStudio.css";

const initialIntroduction = submissionIntroduction;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export default function SubmissionStudio() {
  const [kind, setKind] = useState<DocumentKind>("resume");
  const [purpose, setPurpose] = useState<Purpose>("ai");
  const [selections, setSelections] = useState<Record<DocumentKind, Selection>>(
    () => ({
      resume: recommend(content, "ai"),
      portfolio: recommend(content, "ai"),
    })
  );
  const [details, setDetails] = useState<Record<DocumentKind, Detail>>({
    resume: "standard",
    portfolio: "standard",
  });
  const [introductions, setIntroductions] = useState({
    resume: initialIntroduction,
    portfolio: initialIntroduction,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    url: string;
    blob: Blob;
    kind: DocumentKind;
  } | null>(null);
  const previewRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );
  function invalidate() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
    setError("");
  }
  function update(selection: Selection) {
    invalidate();
    setSelections(v => ({ ...v, [kind]: selection }));
  }
  const selection = selections[kind],
    chosen = selectedItems(content, selection);
  const valid = (k: DocumentKind) =>
    k === "portfolio"
      ? selections[k].projects.length > 0
      : selections[k].records.length > 0;
  async function generate(both = false) {
    if (busy) return;
    invalidate();
    setBusy(true);
    try {
      const { generateSubmission } = await import(
        "@/submission/SubmissionDocument"
      );
      const make = (k: DocumentKind) =>
        generateSubmission({
          content,
          selection: selections[k],
          kind: k,
          detail: details[k],
          introduction: introductions[k],
        });
      if (both) {
        const { zipSync } = await import("fflate");
        const files: Record<string, Uint8Array> = {};
        // The PDF renderer owns shared font/layout state: render sequentially.
        for (const k of ["resume", "portfolio"] as const)
          files[`${content.profile.name}_${documentNames[k]}.pdf`] =
            new Uint8Array(await (await make(k)).arrayBuffer());
        download(
          new Blob([zipSync(files) as BlobPart], { type: "application/zip" }),
          `${content.profile.name}_제출문서.zip`
        );
      } else {
        const blob = await make(kind),
          url = URL.createObjectURL(blob);
        previewRef.current = url;
        setPreview({ url, blob, kind });
      }
    } catch (e) {
      console.error("Submission PDF generation failed", e);
      setError(
        "PDF를 만들지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요. 편집 내용은 유지됩니다."
      );
    } finally {
      setBusy(false);
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
        <p className="submission-kicker">NAMUORI · SUBMISSION STUDIO</p>
        <h1>인사이트 · 제출 문서</h1>
        <p>
          같은 경험을 두 가지 문서로. 내용을 고르고, 순서를 정하고, 제출할 PDF를
          확인하세요.
        </p>
      </header>
      <fieldset disabled={busy} className="submission-controls">
        <legend className="sr-only">문서 편집</legend>
        <div className="submission-tabs" role="group" aria-label="편집할 문서">
          {(["resume", "portfolio"] as const).map(k => (
            <button
              key={k}
              aria-pressed={kind === k}
              onClick={() => {
                invalidate();
                setKind(k);
              }}
            >
              {documentNames[k]}
            </button>
          ))}
        </div>
        <div className="submission-layout">
          <aside className="submission-editor">
            <section>
              <h2>01 · 제출 목적과 분량</h2>
              <label>
                지원 분야
                <select
                  value={purpose}
                  onChange={e => setPurpose(e.target.value as Purpose)}
                >
                  {Object.entries(purposeNames).map(([id, name]) => (
                    <option value={id} key={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => update(recommend(content, purpose))}>
                현재 문서에 추천 구성 적용
              </button>
              <small>
                선택과 순서를 추천 구성으로 바꿉니다. 다른 문서의 구성은
                유지됩니다.
              </small>
              <label>
                설명 분량
                <select
                  value={details[kind]}
                  onChange={e => {
                    invalidate();
                    setDetails(v => ({
                      ...v,
                      [kind]: e.target.value as Detail,
                    }));
                  }}
                >
                  <option value="summary">요약 · 역할과 결과 중심</option>
                  <option value="standard">기본 · 구현 내용 포함</option>
                  <option value="detailed">상세 · 구성과 비교 설명 포함</option>
                </select>
              </label>
              <small>
                페이지를 줄이기 위해 글자를 축소하거나 내용을 잘라내지 않습니다.
                실제 쪽수는 PDF 미리보기에서 확인하세요.
              </small>
            </section>
            <section>
              <h2>02 · 소개 문구</h2>
              <label>
                현재 문서의 소개
                <textarea
                  rows={6}
                  maxLength={3000}
                  value={introductions[kind]}
                  onChange={e => {
                    invalidate();
                    setIntroductions(v => ({ ...v, [kind]: e.target.value }));
                  }}
                />
              </label>
              <small>
                사이트 원문은 바뀌지 않습니다. 편집 내용은 이 화면을 떠나면
                초기화됩니다.
              </small>
            </section>
            <section>
              <h2>03 · 프로젝트 선택·순서</h2>
              <p>
                선택 {chosen.projects.length}개 · 위아래 버튼으로 순서를 바꿀 수
                있습니다.
              </p>
              {picker("projects")}
            </section>
            {kind === "resume" && (
              <section>
                <h2>04 · 이력 선택·순서</h2>
                <p>
                  선택 {chosen.records.length}개 · 기업 경력과 연구 경험은
                  별도로 표기합니다.
                </p>
                {picker("records")}
              </section>
            )}
          </aside>
          <div className="submission-preview">
            <section className="submission-actions">
              <h2>{documentNames[kind]}</h2>
              <p>
                {kind === "resume"
                  ? "이력 요약 → 경력·연구 상세 → 주요 프로젝트 기여"
                  : "소개·대표 작업 → 프로젝트별 상세·구현 구성·근거 링크"}
              </p>
              <div className="submission-buttons">
                <button
                  className="primary"
                  disabled={!valid(kind)}
                  onClick={() => generate()}
                >
                  {busy ? "PDF 생성 중…" : "PDF 미리보기 생성"}
                </button>
                <button
                  disabled={!valid("resume") || !valid("portfolio")}
                  onClick={() => generate(true)}
                >
                  두 문서 ZIP 다운로드
                </button>
              </div>
              {!valid(kind) && (
                <p role="status">
                  {kind === "resume"
                    ? "이력을 하나 이상 선택해 주세요."
                    : "프로젝트를 하나 이상 선택해 주세요."}
                </p>
              )}
              <p className="submission-note">
                A4 · 한글 글꼴 포함 · 텍스트 검색·복사 · 페이지 번호 · 원문 링크
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
                    onClick={() =>
                      download(
                        preview.blob,
                        `${content.profile.name}_${documentNames[preview.kind]}.pdf`
                      )
                    }
                  >
                    PDF 다운로드
                  </button>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF 새 창에서 보기
                  </a>
                </div>
                <iframe
                  title={`${documentNames[kind]} PDF 미리보기`}
                  src={preview.url}
                  className="submission-pdf"
                />
                <small>
                  브라우저에서 PDF가 표시되지 않으면 다운로드하거나 새 창으로
                  여세요.
                </small>
              </section>
            ) : (
              <section className="submission-outline">
                <p className="submission-kicker">DOCUMENT OUTLINE</p>
                <h2>{content.profile.name}</h2>
                <p className="submission-introduction">{introductions[kind]}</p>
                {kind === "resume" && (
                  <>
                    <h3>이력 요약</h3>
                    {chosen.records.map(e => (
                      <p key={recordId(e)}>
                        <strong>{e.degree}</strong>
                        <br />
                        <small>
                          {e.period} · {e.school}
                        </small>
                      </p>
                    ))}
                  </>
                )}
                <h3>선정 프로젝트</h3>
                {chosen.projects.map((p, index) => (
                  <article key={p.slug}>
                    <h3>
                      {String(index + 1).padStart(2, "0")} · {p.name}
                    </h3>
                    <p>{p.desc}</p>
                    <small>{p.metric}</small>
                  </article>
                ))}
                <p className="submission-note">
                  내용 구성 미리보기입니다. 위 버튼으로 실제 PDF의 페이지 배치를
                  확인하세요.
                </p>
              </section>
            )}
          </div>
        </div>
      </fieldset>
      <p role="status" aria-live="polite">
        {busy
          ? "한글 글꼴과 문서를 준비하고 있습니다. 잠시 기다려 주세요."
          : ""}
      </p>
    </main>
  );
}
