import {
  officialSourceUrl,
  officialFields,
  type OfficialDetails,
} from "@/submission/officialForm";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  designOnlyProjects,
  printDefaultProjects,
  writeHandoff,
} from "@/print/printModel";
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
  const [officialDetails, setOfficialDetails] = useState<OfficialDetails>({});
  const [format, setFormat] = useState<"official" | "design">("official");
  const [, navigate] = useLocation();
  // 인쇄본은 저장소를 공개하지 않은 연구(석사학위논문 등)도 정리된 문구로 실을 수 있습니다.
  const designOnly = designOnlyProjects();
  const designProjects =
    format === "design"
      ? selection.projects.filter(
          id =>
            availableProjects(content).some(p => p.slug === id) ||
            designOnly.some(p => p.slug === id)
        )
      : [];
  function openDesign() {
    writeHandoff({ projects: designProjects, introduction });
    navigate("/print");
  }
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
        officialDetails,
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
        ? [
            ...availableProjects(content).map(p => ({
              id: p.slug,
              title: p.name,
              note: recommendationReason(p, purpose),
            })),
            ...(format === "design"
              ? designOnly.map(p => ({
                  id: p.slug,
                  title: p.name,
                  note: "저장소를 공개하지 않은 연구로, 인쇄본에만 들어갑니다.",
                }))
              : []),
          ]
        : availableRecords(content).map(e => ({
            id: recordId(e),
            title: e.degree,
            note: `${typeNames[e.type]}, ${e.period}, ${e.school}`,
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
        <p>
          이력과 프로젝트를 공식 이력서 양식 PDF나 디자인 포트폴리오 인쇄본으로
          정리합니다.
        </p>
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
            <section hidden={format === "design"}>
              <h2>공식 이력서</h2>
              <p>
                고용노동부의 표준 이력서 원본 서식을 사용합니다. 가운뎃점은
                쉼표로 바꾸며, 경력기술서와 포트폴리오를 뒤에 붙입니다.
              </p>
              <a
                href={officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                공식 양식 출처
              </a>
              <p>
                원본의 주요 경력 두 칸에는 선택한 근무 경력을 순서대로 넣습니다.
                전체 경력은 뒤의 경력기술서에 포함됩니다.
              </p>
              <details>
                <summary>주소, 연락처 및 추가 항목 입력</summary>
                <p>
                  비워 두면 PDF에도 빈칸으로 표시됩니다. 입력 내용은 서버에
                  전송하거나 저장하지 않습니다.
                </p>
                {officialFields.map(([key, label, limit]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="text"
                      value={officialDetails[key] ?? ""}
                      maxLength={limit}
                      autoComplete="off"
                      onChange={event => {
                        invalidate();
                        setOfficialDetails(previous => ({
                          ...previous,
                          [key]: event.target.value,
                        }));
                      }}
                    />
                  </label>
                ))}
              </details>
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
              <h2>학력 및 경력</h2>
              <p>선택 {chosen.records.length}개, 항목별로 묶어 출력합니다.</p>
              {picker("records")}
            </section>
          </aside>
          <div className="submission-preview">
            <section className="submission-format" aria-label="문서 형식">
              <h2>문서 형식</h2>
              <div className="submission-format-options">
                <label>
                  <input
                    type="radio"
                    name="submission-format"
                    checked={format === "official"}
                    onChange={() => setFormat("official")}
                  />
                  <span>
                    공식 이력서 양식 PDF
                    <small>
                      표준 이력서 서식, 경력기술서, 프로젝트 포트폴리오를 한
                      파일로 만듭니다.
                    </small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="submission-format"
                    checked={format === "design"}
                    onChange={() => setFormat("design")}
                  />
                  <span>
                    디자인 포트폴리오 인쇄본
                    <small>
                      사이트 스타일의 A4 인쇄본입니다. 고른 프로젝트 순서와 소개
                      문구를 그대로 쓰고, 인쇄 창에서 PDF로 저장합니다.
                    </small>
                  </span>
                </label>
              </div>
            </section>
            {format === "design" ? (
              <section>
                <h2>디자인 포트폴리오 인쇄본</h2>
                <p>
                  표지와 자기소개 → 연구 개요 → 프로젝트 → 개발 경험 → 학부
                  프로젝트와 수상 → 논문, 경력, 학력, 기술
                </p>
                <div className="submission-buttons">
                  <button
                    className="primary"
                    disabled={designProjects.length === 0}
                    onClick={openDesign}
                  >
                    인쇄본 열기
                  </button>
                  <button
                    onClick={() =>
                      update({ ...selection, projects: printDefaultProjects() })
                    }
                  >
                    인쇄본 기본 구성 적용
                  </button>
                </div>
                <p className="submission-note">
                  프로젝트 {designProjects.length}개가 한 쪽씩 들어갑니다. 기본
                  구성은 석사과정 연구 네 건입니다.
                </p>
                {designProjects.length === 0 && (
                  <p role="status">프로젝트를 하나 이상 선택해 주세요.</p>
                )}
                <p className="submission-note">
                  편집한 구성은 이 탭에만 두고 서버로 보내지 않습니다.
                </p>
              </section>
            ) : (
              <>
                <section>
                  <h2>이력서 및 포트폴리오</h2>
                  <p>
                    공식 이력서 → 경력기술서 → 학력 및 연구활동 → 프로젝트
                    포트폴리오
                  </p>
                  <button
                    className="primary"
                    disabled={!valid}
                    onClick={generate}
                  >
                    {busy ? "PDF 생성 중…" : "PDF 미리보기 생성"}
                  </button>
                  {!valid && (
                    <p role="status">
                      이력이나 프로젝트를 하나 이상 선택해 주세요.
                    </p>
                  )}
                  <p className="submission-note">
                    A4, PDF 한 파일, 한글 검색 및 복사, GitHub 링크
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
                        {g.items.join(", ")}
                      </p>
                    ))}
                    <h3>프로젝트</h3>
                    {chosen.projects.map((p, index) => {
                      const diagram = projectDiagram(p);
                      return (
                        <article key={p.slug}>
                          <h3>
                            {String(index + 1).padStart(2, "0")}, {p.name}
                          </h3>
                          <p>{p.desc}</p>
                          {diagram.nodes.length > 0 && (
                            <div className="submission-flow">
                              {diagram.nodes.map((node, i) => (
                                <span key={node}>
                                  {i > 0 && (
                                    <b aria-hidden="true">
                                      {diagram.sequence ? "→" : ""}
                                    </b>
                                  )}
                                  <em>{node}</em>
                                </span>
                              ))}
                            </div>
                          )}
                          {p.link && (
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              GitHub
                            </a>
                          )}
                        </article>
                      );
                    })}
                    <p className="submission-note">
                      PDF 미리보기를 생성하면 실제 페이지 배치를 확인할 수
                      있습니다.
                    </p>
                  </section>
                )}
              </>
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
