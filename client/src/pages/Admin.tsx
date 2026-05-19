import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { portfolioContent, type ContentOrder, type EducationEntry, type NoteEntry, type ProfileContent, type ProjectEntry, type PublicationStatus, type ResearchEntry, type SkillGroup, type StarredRepo } from "@/content";
import { toMarkdownHtml } from "@/content/markdown";
import { DARK, FONT_MONO, FONT_SANS, LIGHT } from "@/content/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { adminAccessState, type AdminSessionInfo } from "@/lib/adminAccess";
import { buildSavePayload, type SavePayload, type SaveTarget } from "@/lib/adminContent";
import {
  demoGitHubImportResponse,
  mergeProjectCandidate,
  mergeSkillCandidates,
  mergeStarredCandidates,
  parseGitHubSource,
  type GitHubImportMode,
  type GitHubImportResponse,
} from "@/lib/githubImport";
import {
  appendItem,
  archiveEntry,
  createEducationEntry,
  createNoteDraft,
  createProjectDraft,
  createResearchDraft,
  createSkillGroup,
  createStarredRepo,
  duplicateNote,
  duplicateProject,
  duplicateResearch,
  moveItem,
  removeItem,
  updateItem,
} from "@/lib/adminItems";

type SectionKey = "profile" | "education" | "research" | "projects" | "skills" | "starred" | "notes";
type EditorMode = "write" | "source" | "preview";
type MoveDirection = "up" | "down";

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "profile", label: "Profile" },
  { key: "education", label: "Timeline" },
  { key: "research", label: "Research" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
  { key: "starred", label: "Starred" },
  { key: "notes", label: "Notes" },
];

const STATUS_OPTIONS: PublicationStatus[] = ["draft", "published", "archived"];
const INITIAL_GITHUB_IMPORT_SOURCE =
  portfolioContent.profile.contacts.find((contact) => contact.type === "github")?.href ?? `https://github.com/${portfolioContent.profile.handle}`;

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input disabled={disabled} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <label className="admin-field admin-field-block">
      <span>{label}</span>
      <textarea disabled={disabled} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="admin-check-field">
      <input disabled={disabled} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button type="button" className={danger ? "danger" : ""} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function MarkdownEditor({
  label,
  body,
  mode,
  onMode,
  onChange,
  disabled,
}: {
  label: string;
  body: string;
  mode: EditorMode;
  onMode: (mode: EditorMode) => void;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="admin-editor">
      <div className="admin-editor-bar">
        <span>{label}</span>
        <div>
          {(["write", "source", "preview"] as EditorMode[]).map((item) => (
            <button key={item} type="button" className={mode === item ? "active" : ""} onClick={() => onMode(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {mode === "write" && (
        <div
          className="admin-wysiwyg"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onBlur={(event) => onChange(event.currentTarget.innerText)}
        >
          {body}
        </div>
      )}
      {mode === "source" && <textarea disabled={disabled} rows={12} value={body} onChange={(event) => onChange(event.target.value)} />}
      {mode === "preview" && <div className="admin-preview" dangerouslySetInnerHTML={{ __html: toMarkdownHtml(body) }} />}
    </div>
  );
}

export default function Admin() {
  const { theme, toggleTheme } = useTheme();
  const T = theme === "dark" ? DARK : LIGHT;
  const localPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1";
  const [session, setSession] = useState<AdminSessionInfo | null>(null);
  const [active, setActive] = useState<SectionKey>("profile");
  const [profile, setProfile] = useState<ProfileContent>(portfolioContent.profile);
  const [education, setEducation] = useState<EducationEntry[]>(portfolioContent.education);
  const [research, setResearch] = useState<ResearchEntry[]>(portfolioContent.research);
  const [projects, setProjects] = useState<ProjectEntry[]>(portfolioContent.projects);
  const [skills, setSkills] = useState<SkillGroup[]>(portfolioContent.skills);
  const [starred, setStarred] = useState<StarredRepo[]>(portfolioContent.starred);
  const [notes, setNotes] = useState<NoteEntry[]>(portfolioContent.notes);
  const [researchIndex, setResearchIndex] = useState(0);
  const [projectIndex, setProjectIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [mode, setMode] = useState<EditorMode>("write");
  const [status, setStatus] = useState("변경사항을 저장하면 draft 브랜치 커밋으로 전송됩니다.");
  const [importSource, setImportSource] = useState(INITIAL_GITHUB_IMPORT_SOURCE);
  const [importMode, setImportMode] = useState<GitHubImportMode>("profile");
  const [importResult, setImportResult] = useState<GitHubImportResponse | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const access = adminAccessState(session, localPreview);
  const canEdit = access === "granted";

  const contentOrder = useMemo<ContentOrder>(
    () => ({
      research: research.map((item) => item.slug),
      projects: projects.map((item) => item.slug),
      notes: notes.map((item) => item.slug),
    }),
    [notes, projects, research],
  );

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .then((data) => setSession(data))
      .catch(() => setSession({ authenticated: false }));
  }, []);

  const target = useMemo<SaveTarget>(() => {
    if (active === "profile") return { kind: "profile", value: profile };
    if (active === "education") return { kind: "education", value: education };
    if (active === "skills") return { kind: "skills", value: skills };
    if (active === "starred") return { kind: "starred", value: starred };
    if (active === "research") return { kind: "research", value: research[researchIndex], order: contentOrder };
    if (active === "projects") return { kind: "project", value: projects[projectIndex], order: contentOrder };
    return { kind: "note", value: notes[noteIndex], order: contentOrder };
  }, [active, contentOrder, education, noteIndex, notes, profile, projectIndex, projects, research, researchIndex, skills, starred]);

  const savePayload = useMemo<SavePayload>(() => buildSavePayload(target), [target]);

  async function postJson(path: string, payload: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
    return data;
  }

  async function loadGitHubCandidates() {
    if (!canEdit || importLoading) return;
    if (!parseGitHubSource(importSource, importMode)) {
      setStatus(importMode === "repo" ? "GitHub 저장소 URL 또는 owner/repo 형식이 필요합니다." : "GitHub 프로필 URL 또는 owner 형식이 필요합니다.");
      return;
    }
    setImportLoading(true);
    try {
      if (localPreview) {
        setImportResult({ ...demoGitHubImportResponse, source: importSource });
        setStatus("로컬 미리보기: GitHub 후보 샘플을 불러왔습니다. Apply 후 저장 흐름을 확인할 수 있습니다.");
        return;
      }
      const result = await postJson("/api/github/import", { source: importSource, mode: importMode });
      setImportResult(result as GitHubImportResponse);
      setStatus(`GitHub 후보를 불러왔습니다: Projects ${result.projects?.length ?? 0}, Skills ${result.skills?.length ?? 0}, Starred ${result.starred?.length ?? 0}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "GitHub 후보를 가져오지 못했습니다.");
    } finally {
      setImportLoading(false);
    }
  }

  function applyProjectCandidate(candidate: ProjectEntry) {
    setProjects((items) => {
      const result = mergeProjectCandidate(items, candidate);
      setProjectIndex(result.index);
      return result.items;
    });
    setActive("projects");
    setStatus(`프로젝트 후보를 편집 목록에 적용했습니다: ${candidate.name}`);
  }

  function applySkillCandidates(candidates = importResult?.skills ?? []) {
    if (candidates.length === 0) return;
    setSkills((items) => mergeSkillCandidates(items, candidates));
    setActive("skills");
    setStatus(`기술 스택 후보 ${candidates.length}개 그룹을 병합했습니다. 저장 전 항목을 검토하세요.`);
  }

  function applyStarredCandidate(candidate: StarredRepo) {
    setStarred((items) => mergeStarredCandidates(items, [candidate]));
    setActive("starred");
    setStatus(`관심 저장소 후보를 적용했습니다: ${candidate.name}`);
  }

  function applyAllStarredCandidates() {
    const candidates = importResult?.starred ?? [];
    if (candidates.length === 0) return;
    setStarred((items) => mergeStarredCandidates(items, candidates));
    setActive("starred");
    setStatus(`관심 저장소 후보를 병합했습니다. 중복 저장소는 유지하지 않았습니다.`);
  }

  async function saveDraft() {
    if (!canEdit) return;
    if (localPreview && !session?.authenticated) {
      setStatus(`로컬 미리보기: ${savePayload.branch}에 ${savePayload.files.length}개 파일을 저장할 준비가 됐습니다.`);
      return;
    }
    try {
      setStatus("GitHub draft 브랜치에 저장 중...");
      const result = await postJson("/api/github/save", savePayload);
      setStatus(`저장 완료: ${result.branch || savePayload.branch}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "저장에 실패했습니다.");
    }
  }

  async function publishDraft() {
    if (!canEdit) return;
    const payload = {
      branch: savePayload.branch,
      title: savePayload.message,
      body: "Portfolio admin에서 생성한 발행 요청입니다.",
    };
    if (localPreview && !session?.authenticated) {
      setStatus(`로컬 미리보기: ${payload.branch}에서 PR을 만들 준비가 됐습니다.`);
      return;
    }
    try {
      setStatus("Pull request 생성/업데이트 중...");
      const result = await postJson("/api/github/publish", payload);
      setStatus(`PR 준비 완료: ${result.html_url || result.url || payload.branch}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PR 발행에 실패했습니다.");
    }
  }

  function updateProject(next: Partial<ProjectEntry>) {
    setProjects((items) => items.map((item, index) => (index === projectIndex ? { ...item, ...next } : item)));
  }

  function updateResearch(next: Partial<ResearchEntry>) {
    setResearch((items) => items.map((item, index) => (index === researchIndex ? { ...item, ...next } : item)));
  }

  function updateNote(next: Partial<NoteEntry>) {
    setNotes((items) => items.map((item, index) => (index === noteIndex ? { ...item, ...next } : item)));
  }

  function updateEducationEntry(index: number, next: Partial<EducationEntry>) {
    setEducation((items) => updateItem(items, index, next));
  }

  function addEducationEntry() {
    setEducation((items) => appendItem(items, createEducationEntry()).items);
    setStatus("새 타임라인 항목을 추가했습니다. 저장하면 content/education.json에 반영됩니다.");
  }

  function moveEducationEntry(index: number, direction: MoveDirection) {
    setEducation((items) => moveItem(items, index, direction).items);
  }

  function removeEducationEntry(index: number) {
    setEducation((items) => removeItem(items, index).items);
  }

  function addProject() {
    setProjects((items) => {
      const result = appendItem(items, createProjectDraft(items.map((item) => item.slug)));
      setProjectIndex(result.index);
      return result.items;
    });
    setActive("projects");
    setStatus("새 프로젝트 초안을 추가했습니다. 저장하면 새 MDX 파일과 목록 순서가 함께 저장됩니다.");
  }

  function duplicateSelectedProject() {
    setProjects((items) => {
      const source = items[projectIndex];
      if (!source) return items;
      const result = appendItem(items, duplicateProject(source, items.map((item) => item.slug)));
      setProjectIndex(result.index);
      return result.items;
    });
    setStatus("선택한 프로젝트를 draft 복사본으로 만들었습니다.");
  }

  function moveSelectedProject(direction: MoveDirection) {
    setProjects((items) => {
      const result = moveItem(items, projectIndex, direction);
      setProjectIndex(result.index);
      return result.items;
    });
  }

  function archiveSelectedProject() {
    setProjects((items) => {
      const source = items[projectIndex];
      return source ? updateItem(items, projectIndex, archiveEntry(source)) : items;
    });
    setStatus("선택한 프로젝트를 archived 상태로 바꿨습니다.");
  }

  function addResearch() {
    setResearch((items) => {
      const result = appendItem(items, createResearchDraft(items.map((item) => item.slug)));
      setResearchIndex(result.index);
      return result.items;
    });
    setActive("research");
    setStatus("새 연구 관심사 초안을 추가했습니다.");
  }

  function duplicateSelectedResearch() {
    setResearch((items) => {
      const source = items[researchIndex];
      if (!source) return items;
      const result = appendItem(items, duplicateResearch(source, items.map((item) => item.slug)));
      setResearchIndex(result.index);
      return result.items;
    });
    setStatus("선택한 연구 관심사를 draft 복사본으로 만들었습니다.");
  }

  function moveSelectedResearch(direction: MoveDirection) {
    setResearch((items) => {
      const result = moveItem(items, researchIndex, direction);
      setResearchIndex(result.index);
      return result.items;
    });
  }

  function archiveSelectedResearch() {
    setResearch((items) => {
      const source = items[researchIndex];
      return source ? updateItem(items, researchIndex, archiveEntry(source)) : items;
    });
    setStatus("선택한 연구 관심사를 archived 상태로 바꿨습니다.");
  }

  function addNote() {
    setNotes((items) => {
      const result = appendItem(items, createNoteDraft(items.map((item) => item.slug)));
      setNoteIndex(result.index);
      return result.items;
    });
    setActive("notes");
    setStatus("새 노트 초안을 추가했습니다.");
  }

  function duplicateSelectedNote() {
    setNotes((items) => {
      const source = items[noteIndex];
      if (!source) return items;
      const result = appendItem(items, duplicateNote(source, items.map((item) => item.slug)));
      setNoteIndex(result.index);
      return result.items;
    });
    setStatus("선택한 노트를 draft 복사본으로 만들었습니다.");
  }

  function moveSelectedNote(direction: MoveDirection) {
    setNotes((items) => {
      const result = moveItem(items, noteIndex, direction);
      setNoteIndex(result.index);
      return result.items;
    });
  }

  function archiveSelectedNote() {
    setNotes((items) => {
      const source = items[noteIndex];
      return source ? updateItem(items, noteIndex, archiveEntry(source)) : items;
    });
    setStatus("선택한 노트를 archived 상태로 바꿨습니다.");
  }

  function updateSkillGroup(index: number, next: Partial<SkillGroup>) {
    setSkills((items) => updateItem(items, index, next));
  }

  function addSkillGroup() {
    setSkills((items) => appendItem(items, createSkillGroup()).items);
  }

  function moveSkillGroup(index: number, direction: MoveDirection) {
    setSkills((items) => moveItem(items, index, direction).items);
  }

  function removeSkillGroup(index: number) {
    setSkills((items) => removeItem(items, index).items);
  }

  function addSkillItem(groupIndex: number) {
    setSkills((items) =>
      items.map((group, index) => (index === groupIndex ? { ...group, items: [...group.items, "새 기술"] } : group)),
    );
  }

  function updateSkillItem(groupIndex: number, itemIndex: number, value: string) {
    setSkills((items) =>
      items.map((group, index) =>
        index === groupIndex
          ? { ...group, items: group.items.map((item, currentIndex) => (currentIndex === itemIndex ? value : item)) }
          : group,
      ),
    );
  }

  function moveSkillItem(groupIndex: number, itemIndex: number, direction: MoveDirection) {
    setSkills((items) =>
      items.map((group, index) =>
        index === groupIndex ? { ...group, items: moveItem(group.items, itemIndex, direction).items } : group,
      ),
    );
  }

  function removeSkillItem(groupIndex: number, itemIndex: number) {
    setSkills((items) =>
      items.map((group, index) =>
        index === groupIndex ? { ...group, items: removeItem(group.items, itemIndex).items } : group,
      ),
    );
  }

  function updateStarredRepo(index: number, next: Partial<StarredRepo>) {
    setStarred((items) => updateItem(items, index, next));
  }

  function addStarredRepo() {
    setStarred((items) => appendItem(items, createStarredRepo()).items);
  }

  function moveStarredRepo(index: number, direction: MoveDirection) {
    setStarred((items) => moveItem(items, index, direction).items);
  }

  function removeStarredRepo(index: number) {
    setStarred((items) => removeItem(items, index).items);
  }

  function renderGitHubImportPanel(scope: "projects" | "skills" | "starred") {
    const projectCandidates = importResult?.projects ?? [];
    const skillCandidates = importResult?.skills ?? [];
    const starredCandidates = importResult?.starred ?? [];
    return (
      <div className="admin-import">
        <div className="admin-import-head">
          <div>
            <span className="admin-kicker">github import</span>
            <strong>GitHub 후보 가져오기</strong>
          </div>
          <span className="admin-import-count">
            P {projectCandidates.length} · S {skillCandidates.length} · ★ {starredCandidates.length}
          </span>
        </div>
        <div className="admin-import-form">
          <label>
            <span>Source</span>
            <input disabled={!canEdit || importLoading} value={importSource} onChange={(event) => setImportSource(event.target.value)} placeholder="https://github.com/NAMUORI00 또는 owner/repo" />
          </label>
          <label>
            <span>Mode</span>
            <select disabled={!canEdit || importLoading} value={importMode} onChange={(event) => setImportMode(event.target.value as GitHubImportMode)}>
              <option value="profile">Profile</option>
              <option value="repo">Repository</option>
            </select>
          </label>
          <button type="button" disabled={!canEdit || importLoading} onClick={loadGitHubCandidates}>
            {importLoading ? "Fetching..." : "Fetch candidates"}
          </button>
        </div>
        {importResult?.warnings.length ? (
          <div className="admin-import-warnings">
            {importResult.warnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))}
          </div>
        ) : null}
        {scope === "projects" && (
          <div className="admin-candidate-list">
            {projectCandidates.length === 0 && <div className="admin-empty">프로젝트 후보가 없습니다. GitHub source를 가져오세요.</div>}
            {projectCandidates.map((candidate) => (
              <div className="admin-candidate" key={candidate.slug}>
                <div>
                  <strong>{candidate.name}</strong>
                  <p>{candidate.desc}</p>
                  <span>{candidate.tags.join(", ") || "no tags"}</span>
                </div>
                <button type="button" disabled={!canEdit} onClick={() => applyProjectCandidate(candidate)}>Apply</button>
              </div>
            ))}
          </div>
        )}
        {scope === "skills" && (
          <div className="admin-candidate-list">
            {skillCandidates.length === 0 && <div className="admin-empty">기술 스택 후보가 없습니다. GitHub profile 또는 repo를 가져오세요.</div>}
            {skillCandidates.length > 0 && <button type="button" disabled={!canEdit} onClick={() => applySkillCandidates()}>Apply skill groups</button>}
            {skillCandidates.map((candidate) => (
              <div className="admin-candidate" key={candidate.label}>
                <div>
                  <strong>{candidate.label}</strong>
                  <p>{candidate.items.join(", ")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {scope === "starred" && (
          <div className="admin-candidate-list">
            {starredCandidates.length === 0 && <div className="admin-empty">관심 저장소 후보가 없습니다. GitHub profile을 가져오세요.</div>}
            {starredCandidates.length > 0 && <button type="button" disabled={!canEdit} onClick={applyAllStarredCandidates}>Apply all starred</button>}
            {starredCandidates.map((candidate) => (
              <div className="admin-candidate" key={candidate.name}>
                <div>
                  <strong>{candidate.name}</strong>
                  <p>{candidate.desc}</p>
                  <span>★ {candidate.stars}</span>
                </div>
                <button type="button" disabled={!canEdit} onClick={() => applyStarredCandidate(candidate)}>Apply</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderEditor() {
    if (active === "profile") {
      return (
        <div className="admin-grid">
          <Field disabled={!canEdit} label="Name" value={profile.name} onChange={(name) => setProfile({ ...profile, name })} />
          <Field disabled={!canEdit} label="Handle" value={profile.handle} onChange={(handle) => setProfile({ ...profile, handle })} />
          <Field disabled={!canEdit} label="Status" value={profile.status} onChange={(status) => setProfile({ ...profile, status })} />
          <Field disabled={!canEdit} label="Avatar URL" value={profile.avatarUrl ?? ""} onChange={(avatarUrl) => setProfile({ ...profile, avatarUrl })} />
          <TextArea disabled={!canEdit} label="Headline" value={profile.headline} onChange={(headline) => setProfile({ ...profile, headline })} rows={3} />
          <TextArea disabled={!canEdit} label="Lead" value={profile.summaryLead} onChange={(summaryLead) => setProfile({ ...profile, summaryLead })} rows={4} />
          <TextArea disabled={!canEdit} label="Summary paragraphs" value={profile.summary.join("\n\n")} onChange={(value) => setProfile({ ...profile, summary: value.split(/\n\s*\n/).filter(Boolean) })} rows={8} />
        </div>
      );
    }
    if (active === "education") {
      return (
        <div className="admin-stack">
          <div className="admin-toolbar">
            <ControlButton disabled={!canEdit} onClick={addEducationEntry}>Add timeline</ControlButton>
          </div>
          {education.map((item, index) => (
            <div className="admin-card" key={`${item.degree}-${index}`}>
              <div className="admin-card-head">
                <strong>{item.degree || "Timeline item"}</strong>
                <div className="admin-card-actions">
                  <ControlButton disabled={!canEdit || index === 0} onClick={() => moveEducationEntry(index, "up")}>Up</ControlButton>
                  <ControlButton disabled={!canEdit || index === education.length - 1} onClick={() => moveEducationEntry(index, "down")}>Down</ControlButton>
                  <ControlButton danger disabled={!canEdit} onClick={() => removeEducationEntry(index)}>Remove</ControlButton>
                </div>
              </div>
              <div className="admin-grid">
                <Field disabled={!canEdit} label="Degree" value={item.degree} onChange={(degree) => updateEducationEntry(index, { degree })} />
                <Field disabled={!canEdit} label="School" value={item.school} onChange={(school) => updateEducationEntry(index, { school })} />
                <Field disabled={!canEdit} label="Period" value={item.period} onChange={(period) => updateEducationEntry(index, { period })} />
                <CheckField disabled={!canEdit} label="Currently active" checked={item.current} onChange={(current) => updateEducationEntry(index, { current })} />
                <TextArea disabled={!canEdit} label="Note" value={item.note} onChange={(note) => updateEducationEntry(index, { note })} rows={3} />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (active === "projects") {
      const project = projects[projectIndex];
      if (!project) {
        return (
          <div className="admin-stack">
            {renderGitHubImportPanel("projects")}
            <div className="admin-empty">프로젝트가 없습니다.</div>
            <div className="admin-toolbar">
              <ControlButton disabled={!canEdit} onClick={addProject}>Add project</ControlButton>
            </div>
          </div>
        );
      }
      return (
        <div className="admin-stack">
          {renderGitHubImportPanel("projects")}
          <div className="admin-toolbar">
            <ControlButton disabled={!canEdit} onClick={addProject}>Add project</ControlButton>
            <ControlButton disabled={!canEdit} onClick={duplicateSelectedProject}>Duplicate</ControlButton>
            <ControlButton disabled={!canEdit || projectIndex === 0} onClick={() => moveSelectedProject("up")}>Move up</ControlButton>
            <ControlButton disabled={!canEdit || projectIndex === projects.length - 1} onClick={() => moveSelectedProject("down")}>Move down</ControlButton>
            <ControlButton danger disabled={!canEdit || project.status === "archived"} onClick={archiveSelectedProject}>Archive</ControlButton>
          </div>
          <select disabled={!canEdit} value={projectIndex} onChange={(event) => setProjectIndex(Number(event.target.value))}>
            {projects.map((item, index) => <option key={item.slug} value={index}>{item.name}</option>)}
          </select>
          <div className="admin-grid">
            <Field disabled={!canEdit} label="Name" value={project.name} onChange={(name) => updateProject({ name })} />
            <Field disabled={!canEdit} label="Slug" value={project.slug} onChange={(slug) => updateProject({ slug })} />
            <SelectField disabled={!canEdit} label="Status" value={project.status} options={STATUS_OPTIONS} onChange={(status) => updateProject({ status })} />
            <Field disabled={!canEdit} label="Period" value={project.period} onChange={(period) => updateProject({ period })} />
            <Field disabled={!canEdit} label="Link" value={project.link} onChange={(link) => updateProject({ link })} />
            <CheckField disabled={!canEdit} label="Highlight on home" checked={project.highlight} onChange={(highlight) => updateProject({ highlight })} />
            <CheckField disabled={!canEdit} label="Private project" checked={project.private} onChange={(privateProject) => updateProject({ private: privateProject })} />
            <TextArea disabled={!canEdit} label="Description" value={project.desc} onChange={(desc) => updateProject({ desc })} rows={4} />
            <TextArea disabled={!canEdit} label="Metric" value={project.metric} onChange={(metric) => updateProject({ metric })} rows={2} />
            <Field disabled={!canEdit} label="Tags" value={project.tags.join(", ")} onChange={(value) => updateProject({ tags: splitList(value) })} />
            <Field disabled={!canEdit} label="Related notes" value={project.relatedNotes.join(", ")} onChange={(value) => updateProject({ relatedNotes: splitList(value) })} />
          </div>
          <MarkdownEditor disabled={!canEdit} label="Project body" body={project.body} mode={mode} onMode={setMode} onChange={(body) => updateProject({ body })} />
        </div>
      );
    }
    if (active === "research") {
      const item = research[researchIndex];
      if (!item) {
        return (
          <div className="admin-stack">
            <div className="admin-empty">연구 관심사가 없습니다.</div>
            <div className="admin-toolbar">
              <ControlButton disabled={!canEdit} onClick={addResearch}>Add research</ControlButton>
            </div>
          </div>
        );
      }
      return (
        <div className="admin-stack">
          <div className="admin-toolbar">
            <ControlButton disabled={!canEdit} onClick={addResearch}>Add research</ControlButton>
            <ControlButton disabled={!canEdit} onClick={duplicateSelectedResearch}>Duplicate</ControlButton>
            <ControlButton disabled={!canEdit || researchIndex === 0} onClick={() => moveSelectedResearch("up")}>Move up</ControlButton>
            <ControlButton disabled={!canEdit || researchIndex === research.length - 1} onClick={() => moveSelectedResearch("down")}>Move down</ControlButton>
            <ControlButton danger disabled={!canEdit || item.status === "archived"} onClick={archiveSelectedResearch}>Archive</ControlButton>
          </div>
          <select disabled={!canEdit} value={researchIndex} onChange={(event) => setResearchIndex(Number(event.target.value))}>
            {research.map((entry, index) => <option key={entry.slug} value={index}>{entry.title}</option>)}
          </select>
          <div className="admin-grid">
            <Field disabled={!canEdit} label="Title" value={item.title} onChange={(title) => updateResearch({ title })} />
            <Field disabled={!canEdit} label="Slug" value={item.slug} onChange={(slug) => updateResearch({ slug })} />
            <SelectField disabled={!canEdit} label="Status" value={item.status} options={STATUS_OPTIONS} onChange={(status) => updateResearch({ status })} />
            <CheckField disabled={!canEdit} label="Show RAG diagram" checked={item.showDiagram} onChange={(showDiagram) => updateResearch({ showDiagram })} />
            <TextArea disabled={!canEdit} label="Description" value={item.desc} onChange={(desc) => updateResearch({ desc })} rows={4} />
            <Field disabled={!canEdit} label="Related notes" value={item.relatedNotes.join(", ")} onChange={(value) => updateResearch({ relatedNotes: splitList(value) })} />
          </div>
          <MarkdownEditor disabled={!canEdit} label="Research body" body={item.body} mode={mode} onMode={setMode} onChange={(body) => updateResearch({ body })} />
        </div>
      );
    }
    if (active === "skills") {
      return (
        <div className="admin-stack">
          {renderGitHubImportPanel("skills")}
          <div className="admin-toolbar">
            <ControlButton disabled={!canEdit} onClick={addSkillGroup}>Add group</ControlButton>
          </div>
          {skills.map((group, index) => (
            <div className="admin-card" key={`${group.label}-${index}`}>
              <div className="admin-card-head">
                <strong>{group.label || "Skill group"}</strong>
                <div className="admin-card-actions">
                  <ControlButton disabled={!canEdit || index === 0} onClick={() => moveSkillGroup(index, "up")}>Up</ControlButton>
                  <ControlButton disabled={!canEdit || index === skills.length - 1} onClick={() => moveSkillGroup(index, "down")}>Down</ControlButton>
                  <ControlButton danger disabled={!canEdit} onClick={() => removeSkillGroup(index)}>Remove</ControlButton>
                </div>
              </div>
              <Field disabled={!canEdit} label="Group" value={group.label} onChange={(label) => updateSkillGroup(index, { label })} />
              <div className="admin-inline-list">
                <span>Items</span>
                {group.items.map((skill, itemIndex) => (
                  <div className="admin-inline-row" key={`${skill}-${itemIndex}`}>
                    <input disabled={!canEdit} value={skill} onChange={(event) => updateSkillItem(index, itemIndex, event.target.value)} />
                    <ControlButton disabled={!canEdit || itemIndex === 0} onClick={() => moveSkillItem(index, itemIndex, "up")}>Up</ControlButton>
                    <ControlButton disabled={!canEdit || itemIndex === group.items.length - 1} onClick={() => moveSkillItem(index, itemIndex, "down")}>Down</ControlButton>
                    <ControlButton danger disabled={!canEdit} onClick={() => removeSkillItem(index, itemIndex)}>Remove</ControlButton>
                  </div>
                ))}
                <ControlButton disabled={!canEdit} onClick={() => addSkillItem(index)}>Add skill</ControlButton>
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (active === "starred") {
      return (
        <div className="admin-stack">
          {renderGitHubImportPanel("starred")}
          <div className="admin-toolbar">
            <ControlButton disabled={!canEdit} onClick={addStarredRepo}>Add repository</ControlButton>
          </div>
          {starred.map((repo, index) => (
            <div className="admin-card" key={`${repo.name}-${index}`}>
              <div className="admin-card-head">
                <strong>{repo.name || "Repository"}</strong>
                <div className="admin-card-actions">
                  <ControlButton disabled={!canEdit || index === 0} onClick={() => moveStarredRepo(index, "up")}>Up</ControlButton>
                  <ControlButton disabled={!canEdit || index === starred.length - 1} onClick={() => moveStarredRepo(index, "down")}>Down</ControlButton>
                  <ControlButton danger disabled={!canEdit} onClick={() => removeStarredRepo(index)}>Remove</ControlButton>
                </div>
              </div>
              <div className="admin-grid">
                <Field disabled={!canEdit} label="Repo" value={repo.name} onChange={(name) => updateStarredRepo(index, { name })} />
                <Field disabled={!canEdit} label="Stars" value={repo.stars} onChange={(stars) => updateStarredRepo(index, { stars })} />
                <Field disabled={!canEdit} label="Description" value={repo.desc} onChange={(desc) => updateStarredRepo(index, { desc })} />
              </div>
            </div>
          ))}
        </div>
      );
    }
    const note = notes[noteIndex];
    if (!note) {
      return (
        <div className="admin-stack">
          <div className="admin-empty">노트가 없습니다.</div>
          <div className="admin-toolbar">
            <ControlButton disabled={!canEdit} onClick={addNote}>Add note</ControlButton>
          </div>
        </div>
      );
    }
    return (
      <div className="admin-stack">
        <div className="admin-toolbar">
          <ControlButton disabled={!canEdit} onClick={addNote}>Add note</ControlButton>
          <ControlButton disabled={!canEdit} onClick={duplicateSelectedNote}>Duplicate</ControlButton>
          <ControlButton disabled={!canEdit || noteIndex === 0} onClick={() => moveSelectedNote("up")}>Move up</ControlButton>
          <ControlButton disabled={!canEdit || noteIndex === notes.length - 1} onClick={() => moveSelectedNote("down")}>Move down</ControlButton>
          <ControlButton danger disabled={!canEdit || note.status === "archived"} onClick={archiveSelectedNote}>Archive</ControlButton>
        </div>
        <select disabled={!canEdit} value={noteIndex} onChange={(event) => setNoteIndex(Number(event.target.value))}>
          {notes.map((item, index) => <option key={item.slug} value={index}>{item.title}</option>)}
        </select>
        <div className="admin-grid">
          <Field disabled={!canEdit} label="Title" value={note.title} onChange={(title) => updateNote({ title })} />
          <Field disabled={!canEdit} label="Slug" value={note.slug} onChange={(slug) => updateNote({ slug })} />
          <SelectField disabled={!canEdit} label="Status" value={note.status} options={STATUS_OPTIONS} onChange={(status) => updateNote({ status })} />
          <Field disabled={!canEdit} label="Date" value={note.date} onChange={(date) => updateNote({ date })} />
          <Field disabled={!canEdit} label="Tags" value={note.tags.join(", ")} onChange={(value) => updateNote({ tags: splitList(value) })} />
          <TextArea disabled={!canEdit} label="Summary" value={note.summary} onChange={(summary) => updateNote({ summary })} rows={3} />
          <Field disabled={!canEdit} label="Related projects" value={note.relatedProjects.join(", ")} onChange={(value) => updateNote({ relatedProjects: splitList(value) })} />
          <Field disabled={!canEdit} label="Related research" value={note.relatedResearch.join(", ")} onChange={(value) => updateNote({ relatedResearch: splitList(value) })} />
        </div>
        <MarkdownEditor disabled={!canEdit} label="Note body" body={note.body} mode={mode} onMode={setMode} onChange={(body) => updateNote({ body })} />
      </div>
    );
  }

  function renderAccessGate() {
    return (
      <main style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: FONT_SANS }}>
        <div className="admin-login-shell">
          <section className="admin-login-card" style={{ background: T.surface, borderColor: T.border }}>
            <Link href="/" className="admin-back" style={{ color: T.green }}>← Portfolio</Link>
            <span className="admin-kicker">admin access</span>
            <h1>{access === "loading" ? "세션 확인 중" : "관리자 로그인이 필요합니다"}</h1>
            <p>
              {access === "loading"
                ? "관리자 세션을 확인하고 있습니다."
                : "포트폴리오 콘텐츠를 작성하거나 수정하려면 허용된 GitHub 계정으로 로그인하세요."}
            </p>
            {access === "locked" && (
              <div className="admin-login-actions">
                <a href="/api/auth/login">GitHub로 로그인</a>
              </div>
            )}
          </section>
        </div>
        <style>{`
          .admin-login-shell { min-height: 100dvh; display: grid; place-items: center; padding: 24px; }
          .admin-login-card { width: min(100%, 440px); border: 1px solid; border-radius: 6px; padding: 28px; }
          .admin-login-card h1 { margin: 18px 0 10px; font-size: 1.5rem; }
          .admin-login-card p { color: ${T.sub}; line-height: 1.7; margin: 0; }
          .admin-login-actions { display: flex; gap: 8px; margin-top: 22px; }
          .admin-login-actions a {
            border: 1px solid ${T.green}; background: ${T.greenBg}; color: ${T.green};
            border-radius: 4px; padding: 9px 12px; font-family: ${FONT_MONO}; text-decoration: none;
          }
          .admin-back { font-family: ${FONT_MONO}; font-size: .75rem; text-decoration: none; }
          .admin-kicker { display: inline-block; color: ${T.green}; font-family: ${FONT_MONO}; font-size: .72rem; text-transform: uppercase; margin-top: 20px; }
        `}</style>
      </main>
    );
  }

  if (access !== "granted") return renderAccessGate();

  return (
    <main style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: FONT_SANS }}>
      <div className="admin-shell">
        <aside className="admin-sidebar" style={{ background: T.sidebarBg, borderColor: T.border }}>
          <Link href="/" className="admin-back" style={{ color: T.green }}>← Portfolio</Link>
          <h1>Admin</h1>
          <p>{session?.authenticated ? `@${session.login}` : localPreview ? "local preview" : "GitHub login required"}</p>
          <nav>
            {SECTIONS.map((section) => (
              <button key={section.key} className={active === section.key ? "active" : ""} onClick={() => setActive(section.key)}>
                {section.label}
              </button>
            ))}
          </nav>
        </aside>
        <section className="admin-main" style={{ background: T.surface, borderColor: T.border }}>
          <header className="admin-header">
            <div>
              <span className="admin-kicker">draft branch</span>
              <h2>{savePayload.branch}</h2>
              <p>{status}</p>
            </div>
            <div className="admin-actions">
              <button type="button" onClick={toggleTheme}>{theme === "dark" ? "Light" : "Dark"}</button>
              {!session?.authenticated && !localPreview && <a href="/api/auth/login">GitHub Login</a>}
              {!session?.authenticated && import.meta.env.DEV && !localPreview && <a href="/admin?demo=1">Local Preview</a>}
              {session?.authenticated && <a href="/api/auth/logout">Logout</a>}
              <button type="button" disabled={!canEdit} onClick={saveDraft}>Save draft</button>
              <button type="button" disabled={!canEdit} onClick={publishDraft}>Publish PR</button>
            </div>
          </header>
          <div className="admin-panel">{renderEditor()}</div>
        </section>
      </div>
      <style>{`
        .admin-shell { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: 100dvh; }
        .admin-sidebar { border-right: 1px solid; padding: 28px 20px; }
        .admin-sidebar h1 { margin: 18px 0 4px; font-size: 1.6rem; }
        .admin-sidebar p, .admin-header p { color: ${T.sub}; margin: 0; line-height: 1.6; }
        .admin-back { font-family: ${FONT_MONO}; font-size: .75rem; text-decoration: none; }
        .admin-sidebar nav { display: grid; gap: 4px; margin-top: 28px; }
        .admin-sidebar button, .admin-actions button, .admin-actions a, .admin-editor-bar button,
        .admin-toolbar button, .admin-card-actions button, .admin-inline-list button, .admin-import button, .admin-candidate button {
          border: 1px solid ${T.border}; background: ${T.surface}; color: ${T.sub};
          border-radius: 4px; padding: 8px 10px; font-family: ${FONT_MONO}; cursor: pointer; text-decoration: none;
        }
        .admin-sidebar button { text-align: left; }
        .admin-sidebar button.active, .admin-editor-bar button.active { color: ${T.green}; border-color: ${T.green}; background: ${T.greenBg}; }
        .admin-actions button:disabled, .admin-toolbar button:disabled, .admin-card-actions button:disabled, .admin-inline-list button:disabled, .admin-import button:disabled, .admin-candidate button:disabled { opacity: .45; cursor: not-allowed; }
        .admin-toolbar button.danger, .admin-card-actions button.danger, .admin-inline-list button.danger { color: ${T.red}; border-color: ${T.red}; background: ${T.redBg}; }
        .admin-main { border-left: 0; min-width: 0; padding: 28px; }
        .admin-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 22px; }
        .admin-header h2 { margin: 4px 0 6px; font-size: 1.35rem; font-family: ${FONT_MONO}; }
        .admin-kicker { color: ${T.green}; font-family: ${FONT_MONO}; font-size: .72rem; text-transform: uppercase; }
        .admin-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .admin-panel { border: 1px solid ${T.border}; border-radius: 6px; padding: 18px; background: ${T.bg}; }
        .admin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .admin-stack { display: grid; gap: 14px; }
        .admin-card { border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px; padding: 14px; display: grid; gap: 12px; }
        .admin-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .admin-card strong { color: ${T.text}; font-size: .95rem; }
        .admin-card-actions, .admin-toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
        .admin-import { border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px; padding: 14px; display: grid; gap: 12px; }
        .admin-import-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .admin-import-head strong { display: block; margin-top: 4px; color: ${T.text}; }
        .admin-import-count { color: ${T.green}; font-family: ${FONT_MONO}; font-size: .72rem; }
        .admin-import-form { display: grid; grid-template-columns: minmax(180px, 1fr) 150px auto; gap: 10px; align-items: end; }
        .admin-import-form label { display: grid; gap: 6px; color: ${T.sub}; font-size: .72rem; font-family: ${FONT_MONO}; }
        .admin-import-form input, .admin-import-form select {
          width: 100%; box-sizing: border-box; border: 1px solid ${T.border}; background: ${T.bg}; color: ${T.text};
          border-radius: 4px; padding: 9px 10px; font-family: ${FONT_SANS}; font-size: .9rem;
        }
        .admin-import-warnings { display: grid; gap: 4px; color: ${T.muted}; font-family: ${FONT_MONO}; font-size: .68rem; }
        .admin-candidate-list { display: grid; gap: 8px; }
        .admin-candidate { border: 1px solid ${T.border}; background: ${T.bg}; border-radius: 4px; padding: 11px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; }
        .admin-candidate p { color: ${T.sub}; margin: 5px 0; line-height: 1.6; }
        .admin-candidate span { color: ${T.muted}; font-family: ${FONT_MONO}; font-size: .68rem; }
        .admin-field { display: grid; gap: 6px; color: ${T.sub}; font-size: .78rem; font-family: ${FONT_MONO}; }
        .admin-field-block { grid-column: 1 / -1; }
        .admin-field input, .admin-field textarea, .admin-field select, .admin-stack select, .admin-inline-row input, .admin-editor textarea, .admin-wysiwyg {
          width: 100%; box-sizing: border-box; border: 1px solid ${T.border}; background: ${T.surface}; color: ${T.text};
          border-radius: 4px; padding: 10px 11px; font-family: ${FONT_SANS}; font-size: .92rem; line-height: 1.7;
        }
        .admin-check-field { align-self: end; min-height: 43px; display: flex; align-items: center; gap: 9px; color: ${T.sub}; font-size: .78rem; font-family: ${FONT_MONO}; }
        .admin-check-field input { width: 16px; height: 16px; accent-color: ${T.green}; }
        .admin-inline-list { display: grid; gap: 8px; color: ${T.sub}; font-size: .78rem; font-family: ${FONT_MONO}; }
        .admin-inline-row { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto auto; gap: 8px; align-items: center; }
        .admin-empty { border: 1px dashed ${T.border}; border-radius: 6px; padding: 18px; color: ${T.sub}; }
        .admin-editor { display: grid; gap: 10px; }
        .admin-editor-bar { display: flex; justify-content: space-between; align-items: center; color: ${T.sub}; font-family: ${FONT_MONO}; font-size: .78rem; }
        .admin-editor-bar div { display: flex; gap: 6px; }
        .admin-wysiwyg, .admin-preview { min-height: 240px; white-space: pre-wrap; }
        .admin-preview { border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 4px; padding: 12px; color: ${T.sub}; }
        @media (max-width: 860px) {
          .admin-shell { grid-template-columns: 1fr; }
          .admin-sidebar { border-right: 0; border-bottom: 1px solid; }
          .admin-grid { grid-template-columns: 1fr; }
          .admin-header { flex-direction: column; }
          .admin-actions { justify-content: flex-start; }
          .admin-card-head { flex-direction: column; }
          .admin-import-form { grid-template-columns: 1fr; }
          .admin-candidate { grid-template-columns: 1fr; }
          .admin-inline-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
