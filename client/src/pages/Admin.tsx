import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { englishTranslations, getProfileAvatarUrl, portfolioContent, type ContentOrder, type EducationEntry, type NoteEntry, type PortfolioContent, type ProfileContact, type ProfileContent, type ProjectCategory, type ProjectEntry, type ProjectFocus, type ProjectMetric, type ProjectProofLevel, type PublicationStatus, type ResearchEntry, type SiteContent, type SkillGroup, type StarredRepo, type TimelineEntryType, type TimelineLink } from "@/content";
import { DARK, FONT_MONO, FONT_SANS, LIGHT } from "@/content/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { adminAccessState, type AdminSessionInfo } from "@/lib/adminAccess";
import { appendSaveFiles, buildSavePayload, type SavePayload, type SaveTarget } from "@/lib/adminContent";
import { buildAdminPreviewUrl, createAdminPreviewId, previewPathForSection, writeAdminPreviewDraft } from "@/lib/adminPreview";
import { avatarUploadDraftFromDataUrl, contentCoverUploadDraftFromDataUrl, type AvatarUploadDraft, type ContentCoverKind } from "@/lib/avatarUpload";
import {
  applyTranslationValues,
  buildTranslationEntries,
  getTranslationValue,
  translationStats,
  type TranslationEntry,
  type TranslationSource,
} from "@/lib/adminTranslation";
import type { EnglishTranslations } from "@/lib/i18nContent";
import {
  clearDirtySection,
  clearImportApplied,
  canPublishDraft,
  canSaveDraft,
  createImportAppliedState,
  editableListKey,
  appendSkillItemToGroup,
  hasSkillItem,
  hasDirtySection,
  isImportApplied,
  markDirtySection,
  markImportApplied,
  publishCompletionNotice,
  saveScopeSummary,
  sectionActionLabel,
  sectionLabel,
  type AdminUxSectionKey,
  type ImportAppliedState,
  type PublishResultLink,
} from "@/lib/adminUx";
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

type SectionKey = AdminUxSectionKey;
type EditorMode = "write" | "source";
type AdminEditorLocale = "ko" | "en";
type MoveDirection = "up" | "down";
type UndoAction = { message: string; onUndo: () => void };
type PendingAvatarUpload = AvatarUploadDraft & { fileName: string; previewUrl: string };
type PendingContentCoverUpload = AvatarUploadDraft & { fileName: string; previewUrl: string };

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "site", label: "Site / UI" },
  { key: "profile", label: "Profile" },
  { key: "education", label: "Timeline" },
  { key: "research", label: "Research" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
  { key: "starred", label: "Starred" },
  { key: "notes", label: "Notes" },
];

const STATUS_OPTIONS: PublicationStatus[] = ["draft", "published", "archived"];
const TIMELINE_TYPE_OPTIONS: TimelineEntryType[] = ["education", "research", "publication", "project", "award", "talk", "work", "milestone"];
const CONTACT_TYPE_OPTIONS: ProfileContact["type"][] = ["email", "github", "website", "external"];
const PROJECT_CATEGORY_OPTIONS: ProjectCategory[] = ["career", "toy"];
const PROJECT_FOCUS_OPTIONS: ProjectFocus[] = ["research", "product", "tool", "experiment"];
const PROJECT_PROOF_LEVEL_OPTIONS: ProjectProofLevel[] = ["core", "supporting", "exploration"];
const INITIAL_GITHUB_IMPORT_SOURCE =
  portfolioContent.profile.contacts.find((contact) => contact.type === "github")?.href ?? `https://github.com/${portfolioContent.profile.handle}`;

type ProjectListField = "tags" | "relatedNotes";
type TimelineStringListField = "bullets" | "relatedProjects" | "relatedSkills";

function coverUploadKey(kind: ContentCoverKind, slug: string): string {
  return `${kind}:${slug}`;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeList(items: string[]): string[] {
  return Array.from(new Set(items.flatMap((item) => splitList(item))));
}

function sameList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("아바타 이미지 파일을 읽지 못했습니다.")));
    reader.onerror = () => reject(new Error("아바타 이미지 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function MarkdownEditor({
  label,
  body,
  mode,
  onMode,
  onChange,
  onPreviewClick,
  previewUrl,
  disabled,
}: {
  label: string;
  body: string;
  mode: EditorMode;
  onMode: (mode: EditorMode) => void;
  onChange: (value: string) => void;
  onPreviewClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  previewUrl: string;
  disabled?: boolean;
}) {
  const editableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editableRef.current;
    if (!editor || mode !== "write" || document.activeElement === editor) return;
    if (editor.innerText !== body) editor.innerText = body;
  }, [body, mode]);

  function handleWritableInput(event: FormEvent<HTMLDivElement>) {
    onChange(event.currentTarget.innerText);
  }

  return (
    <div className="admin-editor">
      <div className="admin-editor-bar">
        <span>{label}</span>
        <div>
          {(["write", "source"] as EditorMode[]).map((item) => (
            <button key={item} type="button" className={mode === item ? "active" : ""} onClick={() => onMode(item)}>
              {item}
            </button>
          ))}
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-disabled={disabled} onClick={onPreviewClick}>
            preview
          </a>
        </div>
      </div>
      {mode === "write" && (
        <div
          ref={editableRef}
          className="admin-wysiwyg"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleWritableInput}
          onBlur={handleWritableInput}
        />
      )}
      {mode === "source" && <textarea disabled={disabled} rows={12} value={body} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

export default function Admin() {
  const { theme, toggleTheme } = useTheme();
  const T = theme === "dark" ? DARK : LIGHT;
  const localPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1";
  const [session, setSession] = useState<AdminSessionInfo | null>(null);
  const [active, setActive] = useState<SectionKey>("profile");
  const [site, setSite] = useState<SiteContent>(portfolioContent.site);
  const [profile, setProfile] = useState<ProfileContent>(portfolioContent.profile);
  const [education, setEducation] = useState<EducationEntry[]>(portfolioContent.education);
  const [research, setResearch] = useState<ResearchEntry[]>(portfolioContent.research);
  const [projects, setProjects] = useState<ProjectEntry[]>(portfolioContent.projects);
  const [skills, setSkills] = useState<SkillGroup[]>(portfolioContent.skills);
  const [starred, setStarred] = useState<StarredRepo[]>(portfolioContent.starred);
  const [notes, setNotes] = useState<NoteEntry[]>(portfolioContent.notes);
  const [enTranslations, setEnTranslations] = useState<EnglishTranslations>(englishTranslations);
  const [researchIndex, setResearchIndex] = useState(0);
  const [projectIndex, setProjectIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [mode, setMode] = useState<EditorMode>("write");
  const [adminEditorLocale, setAdminEditorLocale] = useState<AdminEditorLocale>("ko");
  const [status, setStatusMessage] = useState("변경사항을 저장하면 draft 브랜치 커밋으로 전송됩니다.");
  const [publishLink, setPublishLink] = useState<PublishResultLink | null>(null);
  const [skillDrafts, setSkillDrafts] = useState<Record<number, string>>({});
  const [projectTagDraft, setProjectTagDraft] = useState("");
  const [projectRelatedNoteDraft, setProjectRelatedNoteDraft] = useState("");
  const [skillCandidateTargetIndex, setSkillCandidateTargetIndex] = useState(0);
  const [projectImportOpen, setProjectImportOpen] = useState(false);
  const [importSource, setImportSource] = useState(INITIAL_GITHUB_IMPORT_SOURCE);
  const [importMode, setImportMode] = useState<GitHubImportMode>("profile");
  const [importResult, setImportResult] = useState<GitHubImportResponse | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [dirtySections, setDirtySections] = useState<SectionKey[]>([]);
  const [readyDraftSections, setReadyDraftSections] = useState<SectionKey[]>([]);
  const [translationDirty, setTranslationDirty] = useState(false);
  const [translationDraftReady, setTranslationDraftReady] = useState(false);
  const [appliedImport, setAppliedImport] = useState<ImportAppliedState>(() => createImportAppliedState());
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [avatarUpload, setAvatarUpload] = useState<PendingAvatarUpload | null>(null);
  const [coverUploads, setCoverUploads] = useState<Record<string, PendingContentCoverUpload>>({});
  const [previewId] = useState(() => createAdminPreviewId());

  const access = adminAccessState(session, localPreview);
  const canEdit = access === "granted";

  function setStatus(message: string) {
    setStatusMessage(message);
    setPublishLink(null);
  }

  function setPublishStatus(prefix: string, result: unknown, fallbackBranch: string) {
    const notice = publishCompletionNotice(prefix, result, fallbackBranch);
    setStatusMessage(notice.message);
    setPublishLink(notice.link);
  }

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

  useEffect(() => {
    setSkillCandidateTargetIndex((index) => Math.min(index, Math.max(0, skills.length - 1)));
  }, [skills.length]);

  useEffect(() => {
    setAdminEditorLocale("ko");
  }, [active]);

  const target = useMemo<SaveTarget>(() => {
    if (active === "site") return { kind: "site", value: site };
    if (active === "profile") return { kind: "profile", value: profile };
    if (active === "education") return { kind: "education", value: education };
    if (active === "skills") return { kind: "skills", value: skills };
    if (active === "starred") return { kind: "starred", value: starred };
    if (active === "research") return { kind: "research", value: research[researchIndex], order: contentOrder };
    if (active === "projects") return { kind: "project", value: projects[projectIndex], order: contentOrder };
    return { kind: "note", value: notes[noteIndex], order: contentOrder };
  }, [active, contentOrder, education, noteIndex, notes, profile, projectIndex, projects, research, researchIndex, site, skills, starred]);

  const baseSavePayload = useMemo<SavePayload>(() => buildSavePayload(target), [target]);
  const savePayload = useMemo<SavePayload>(() => {
    if (active === "profile" && avatarUpload) return appendSaveFiles(baseSavePayload, [avatarUpload.file]);
    if (active === "projects" && projects[projectIndex]) {
      const upload = coverUploads[coverUploadKey("projects", projects[projectIndex].slug)];
      if (upload) return appendSaveFiles(baseSavePayload, [upload.file]);
    }
    if (active === "research" && research[researchIndex]) {
      const upload = coverUploads[coverUploadKey("research", research[researchIndex].slug)];
      if (upload) return appendSaveFiles(baseSavePayload, [upload.file]);
    }
    return baseSavePayload;
  }, [active, avatarUpload, baseSavePayload, coverUploads, projectIndex, projects, research, researchIndex]);
  const translationSource = useMemo<TranslationSource | null>(() => {
    if (active === "site") return { kind: "site", value: site };
    if (active === "profile") return { kind: "profile", value: profile };
    if (active === "education") return { kind: "education", value: education };
    if (active === "skills") return { kind: "skills", value: skills };
    if (active === "starred") return { kind: "starred", value: starred };
    if (active === "projects" && projects[projectIndex]) return { kind: "project", value: projects[projectIndex] };
    if (active === "research" && research[researchIndex]) return { kind: "research", value: research[researchIndex] };
    if (active === "notes" && notes[noteIndex]) return { kind: "note", value: notes[noteIndex] };
    return null;
  }, [active, education, noteIndex, notes, profile, projectIndex, projects, research, researchIndex, site, skills, starred]);
  const translationEntries = useMemo<TranslationEntry[]>(
    () => (translationSource ? buildTranslationEntries(translationSource) : []),
    [translationSource],
  );
  const activeTranslationStats = translationSource ? translationStats(enTranslations, translationSource) : null;
  const hasEnglishEditor = translationEntries.length > 0 && Boolean(activeTranslationStats);
  const activeDirty = hasDirtySection(dirtySections, active);
  const activeDraftReady = hasDirtySection(readyDraftSections, active);
  const dirtySectionLabels = dirtySections.map(sectionLabel).join(", ");
  const currentScope = saveScopeSummary(active, savePayload.branch);
  const previewProfile = useMemo<ProfileContent>(
    () => (avatarUpload ? { ...profile, avatarUrl: avatarUpload.previewUrl } : profile),
    [avatarUpload, profile],
  );
  const previewProjects = useMemo<ProjectEntry[]>(
    () => projects.map((item) => {
      const upload = coverUploads[coverUploadKey("projects", item.slug)];
      return upload ? { ...item, coverImage: upload.previewUrl } : item;
    }),
    [coverUploads, projects],
  );
  const previewResearch = useMemo<ResearchEntry[]>(
    () => research.map((item) => {
      const upload = coverUploads[coverUploadKey("research", item.slug)];
      return upload ? { ...item, coverImage: upload.previewUrl } : item;
    }),
    [coverUploads, research],
  );
  const previewContent = useMemo<PortfolioContent>(
    () => ({
      ...portfolioContent,
      site,
      profile: previewProfile,
      education,
      research: previewResearch,
      projects: previewProjects,
      skills,
      starred,
      notes,
    }),
    [education, notes, previewProfile, previewProjects, previewResearch, site, skills, starred],
  );
  const previewSlug = active === "projects" ? projects[projectIndex]?.slug : active === "research" ? research[researchIndex]?.slug : active === "notes" ? notes[noteIndex]?.slug : undefined;
  const adminPreviewUrl = useMemo(() => buildAdminPreviewUrl(previewPathForSection(active, { slug: previewSlug }), previewId, "ko"), [active, previewId, previewSlug]);

  useEffect(() => {
    if (!canEdit) return;
    writeAdminPreviewDraft({
      id: previewId,
      createdAt: new Date().toISOString(),
      section: active,
      content: previewContent,
      translations: enTranslations,
    });
  }, [active, canEdit, enTranslations, previewContent, previewId]);

  useEffect(() => {
    if (adminEditorLocale === "en" && !hasEnglishEditor) setAdminEditorLocale("ko");
  }, [adminEditorLocale, hasEnglishEditor]);

  function markSectionDirty(section: SectionKey) {
    setDirtySections((items) => markDirtySection(items, section));
    setReadyDraftSections((items) => clearDirtySection(items, section));
  }

  function clearSavedSection(section: SectionKey) {
    setDirtySections((items) => clearDirtySection(items, section));
    if (section === "projects" || section === "skills" || section === "starred") {
      setAppliedImport((state) => clearImportApplied(state, section));
    }
  }

  function markSectionDraftReady(section: SectionKey) {
    setReadyDraftSections((items) => markDirtySection(items, section));
  }

  function markTranslationsDirty() {
    setTranslationDirty(true);
    setTranslationDraftReady(false);
  }

  function queueUndo(message: string, onUndo: () => void) {
    setUndoAction({
      message,
      onUndo: () => {
        onUndo();
        setStatus("변경을 되돌렸습니다. 저장 전 상태를 다시 확인하세요.");
        setUndoAction(null);
      },
    });
  }

  function updateProfile(next: Partial<ProfileContent>) {
    setProfile((current) => ({ ...current, ...next }));
    markSectionDirty("profile");
  }

  function updateSite(next: Partial<SiteContent>) {
    setSite((current) => ({ ...current, ...next }));
    markSectionDirty("site");
  }

  function updateNavigationItem(index: number, next: Partial<SiteContent["navigation"][number]>) {
    setSite((current) => ({ ...current, navigation: updateItem(current.navigation, index, next) }));
    markSectionDirty("site");
  }

  function updateProfileContact(index: number, next: Partial<ProfileContact>) {
    setProfile((current) => ({ ...current, contacts: updateItem(current.contacts, index, next) }));
    markSectionDirty("profile");
  }

  function addProfileContact() {
    const id = `contact-${Date.now().toString(36)}`;
    const contact: ProfileContact = { id, type: "external", label: "새 연락처", href: "https://" };
    setProfile((current) => ({
      ...current,
      contacts: appendItem(current.contacts, contact).items,
    }));
    markSectionDirty("profile");
    setStatus("새 연락처를 추가했습니다. 저장하면 profile.json에 반영됩니다.");
  }

  function moveProfileContact(index: number, direction: MoveDirection) {
    setProfile((current) => ({ ...current, contacts: moveItem(current.contacts, index, direction).items }));
    markSectionDirty("profile");
  }

  function removeProfileContact(index: number) {
    const previous = profile.contacts;
    setProfile((current) => ({ ...current, contacts: removeItem(current.contacts, index).items }));
    markSectionDirty("profile");
    queueUndo("연락처를 제거했습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setProfile((current) => ({ ...current, contacts: previous }));
      markSectionDirty("profile");
    });
  }

  function updateAvatarUrl(avatarUrl: string) {
    setAvatarUpload(null);
    updateProfile({ avatarUrl });
  }

  async function handleAvatarUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const draft = avatarUploadDraftFromDataUrl(file, dataUrl);
      setAvatarUpload({ ...draft, fileName: file.name, previewUrl: dataUrl });
      updateProfile({ avatarUrl: draft.publicUrl });
      setStatus(`${file.name} 업로드 준비 완료: 저장하면 ${draft.file.path}에 함께 커밋됩니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "아바타 이미지를 불러오지 못했습니다.");
    }
  }

  function useGitHubAvatar() {
    setAvatarUpload(null);
    updateProfile({ avatarUrl: "" });
    setStatus("GitHub 기본 프로필 이미지를 사용하도록 설정했습니다. 저장하면 profile.json에 반영됩니다.");
  }

  function clearCoverUpload(kind: ContentCoverKind, slug: string) {
    setCoverUploads((current) => {
      const next = { ...current };
      delete next[coverUploadKey(kind, slug)];
      return next;
    });
  }

  function updateProjectCoverImage(slug: string, coverImage: string) {
    clearCoverUpload("projects", slug);
    updateProject({ coverImage: coverImage.trim() || undefined });
  }

  function updateResearchCoverImage(slug: string, coverImage: string) {
    clearCoverUpload("research", slug);
    updateResearch({ coverImage: coverImage.trim() || undefined });
  }

  async function handleCoverUploadChange(kind: ContentCoverKind, slug: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const draft = contentCoverUploadDraftFromDataUrl(kind, slug, file, dataUrl);
      setCoverUploads((current) => ({ ...current, [coverUploadKey(kind, slug)]: { ...draft, fileName: file.name, previewUrl: dataUrl } }));
      if (kind === "projects") updateProject({ coverImage: draft.publicUrl });
      if (kind === "research") updateResearch({ coverImage: draft.publicUrl });
      setStatus(`${file.name} 대표 이미지 준비 완료: 저장하면 ${draft.file.path}에 함께 커밋됩니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "대표 이미지를 불러오지 못했습니다.");
    }
  }

  function removeProjectCoverImage(slug: string) {
    clearCoverUpload("projects", slug);
    updateProject({ coverImage: undefined });
    setStatus("프로젝트 대표 이미지를 비웠습니다. 저장하면 텍스트형 카드로 표시됩니다.");
  }

  function removeResearchCoverImage(slug: string) {
    clearCoverUpload("research", slug);
    updateResearch({ coverImage: undefined });
    setStatus("연구 관심사 대표 이미지를 비웠습니다. 저장하면 텍스트형 카드로 표시됩니다.");
  }

  function handlePreviewClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!canEdit) {
      event.preventDefault();
      return;
    }
    setStatus("새 탭에서 배포 화면 기준 미리보기를 열었습니다. 저장 전 초안은 이 브라우저에서만 보입니다.");
  }

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

  function updateEnglishTranslation(entry: TranslationEntry, value: string) {
    setEnTranslations((current) => applyTranslationValues(current, [entry], { [entry.key]: value }));
    markTranslationsDirty();
  }

  async function generateEnglishDraft() {
    if (!canEdit || !translationSource || translationEntries.length === 0 || translationLoading) return;
    setTranslationLoading(true);
    try {
      if (localPreview && !session?.authenticated) {
        const fallback = Object.fromEntries(translationEntries.map((entryItem) => [entryItem.key, getTranslationValue(enTranslations, entryItem.key) || entryItem.text]));
        setEnTranslations((current) => applyTranslationValues(current, translationEntries, fallback));
        markTranslationsDirty();
        setStatus("로컬 미리보기: EN 드래프트를 갱신했습니다. 실제 번역은 배포 환경의 Workers AI에서 실행됩니다.");
        return;
      }
      setStatus("EN 드래프트를 생성 중...");
      const result = await postJson("/api/translate/en", { entries: translationEntries });
      const values = Object.fromEntries(
        ((result.entries ?? []) as Array<{ key: string; text: string }>).map((item) => [item.key, item.text]),
      );
      setEnTranslations((current) => applyTranslationValues(current, translationEntries, values));
      markTranslationsDirty();
      setStatus(`EN 드래프트를 생성했습니다: ${translationEntries.length}개 항목`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "EN 드래프트 생성에 실패했습니다.");
    } finally {
      setTranslationLoading(false);
    }
  }

  async function saveEnglishTranslations() {
    if (!canSaveDraft(canEdit, translationDirty)) return;
    const payload: SavePayload = {
      branch: "draft/i18n-en",
      message: "Update English translation draft",
      files: [
        {
          path: "content/i18n/en.json",
          content: `${JSON.stringify(enTranslations, null, 2)}\n`,
        },
      ],
    };
    if (localPreview && !session?.authenticated) {
      setTranslationDirty(false);
      setTranslationDraftReady(true);
      setStatus("로컬 미리보기: draft/i18n-en 저장 흐름을 확인했습니다.");
      return;
    }
    try {
      setStatus("EN 드래프트를 draft/i18n-en 브랜치에 저장 중...");
      const result = await postJson("/api/github/save", payload);
      setTranslationDirty(false);
      setTranslationDraftReady(true);
      setStatus(`EN 드래프트 저장 완료: ${result.branch || payload.branch}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "EN 드래프트 저장에 실패했습니다.");
    }
  }

  async function publishEnglishTranslations() {
    if (!canPublishDraft(canEdit, translationDirty, translationDraftReady)) return;
    const payload = {
      branch: "draft/i18n-en",
      title: "Update English translation draft",
      body: "Portfolio admin에서 수정한 EN 드래프트 발행 요청입니다.",
    };
    if (localPreview && !session?.authenticated) {
      setStatus("로컬 미리보기: draft/i18n-en에서 EN 드래프트 PR을 만들 준비가 됐습니다.");
      return;
    }
    try {
      setStatus("EN 드래프트 PR 생성/업데이트 중...");
      const result = await postJson("/api/github/publish", payload);
      setPublishStatus("EN 드래프트 PR 준비 완료", result, payload.branch);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "EN 드래프트 PR 발행에 실패했습니다.");
    }
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
        setAppliedImport(createImportAppliedState());
        setStatus("로컬 미리보기: GitHub 후보 샘플을 불러왔습니다. Apply 후 저장 흐름을 확인할 수 있습니다.");
        return;
      }
      const result = await postJson("/api/github/import", { source: importSource, mode: importMode });
      setImportResult(result as GitHubImportResponse);
      setAppliedImport(createImportAppliedState());
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
    setProjectTagDraft("");
    setProjectRelatedNoteDraft("");
    setActive("projects");
    markSectionDirty("projects");
    setAppliedImport((state) => markImportApplied(state, "projects", [candidate.slug]));
    setStatus(`프로젝트 후보를 편집 목록에 적용했습니다: ${candidate.name}. 아직 저장 전입니다.`);
  }

  function applySkillCandidates(candidates = importResult?.skills ?? []) {
    if (candidates.length === 0) return;
    setSkills((items) => mergeSkillCandidates(items, candidates));
    setActive("skills");
    markSectionDirty("skills");
    setAppliedImport((state) => markImportApplied(state, "skills", candidates.map((candidate) => candidate.label)));
    setStatus(`기술 스택 후보 ${candidates.length}개 그룹을 병합했습니다. 저장 전 항목을 검토하세요.`);
  }

  function applySkillCandidateItem(candidateLabel: string, skill: string) {
    if (!canEdit) return;
    if (hasSkillItem(skills, skill)) {
      setAppliedImport((state) => markImportApplied(state, "skills", [`${candidateLabel}:${skill}`]));
      setStatus(`이미 추가된 기술입니다: ${skill}`);
      return;
    }
    const targetLabel = skills[skillCandidateTargetIndex]?.label || "GitHub inferred";
    setSkills((items) => {
      const base = items.length > 0 ? items : [{ label: "GitHub inferred", items: [] }];
      const targetIndex = Math.min(skillCandidateTargetIndex, base.length - 1);
      return appendSkillItemToGroup(base, targetIndex, skill);
    });
    setActive("skills");
    markSectionDirty("skills");
    setAppliedImport((state) => markImportApplied(state, "skills", [`${candidateLabel}:${skill}`]));
    setStatus(`${targetLabel} 그룹에 기술을 추가했습니다: ${skill}. 저장 전입니다.`);
  }

  function applyStarredCandidate(candidate: StarredRepo) {
    setStarred((items) => mergeStarredCandidates(items, [candidate]));
    setActive("starred");
    markSectionDirty("starred");
    setAppliedImport((state) => markImportApplied(state, "starred", [candidate.name]));
    setStatus(`관심 저장소 후보를 적용했습니다: ${candidate.name}. 아직 저장 전입니다.`);
  }

  function applyAllStarredCandidates() {
    const candidates = importResult?.starred ?? [];
    if (candidates.length === 0) return;
    setStarred((items) => mergeStarredCandidates(items, candidates));
    setActive("starred");
    markSectionDirty("starred");
    setAppliedImport((state) => markImportApplied(state, "starred", candidates.map((candidate) => candidate.name)));
    setStatus(`관심 저장소 후보를 병합했습니다. 중복 저장소는 유지하지 않았고 아직 저장 전입니다.`);
  }

  async function saveDraft() {
    if (!canSaveDraft(canEdit, activeDirty)) return;
    if (localPreview && !session?.authenticated) {
      clearSavedSection(active);
      markSectionDraftReady(active);
      if (active === "profile") setAvatarUpload(null);
      if (active === "projects" && projects[projectIndex]) clearCoverUpload("projects", projects[projectIndex].slug);
      if (active === "research" && research[researchIndex]) clearCoverUpload("research", research[researchIndex].slug);
      setStatus(`로컬 미리보기: ${savePayload.branch}에 ${savePayload.files.length}개 파일을 저장할 준비가 됐습니다.`);
      return;
    }
    try {
      setStatus("GitHub draft 브랜치에 저장 중...");
      const result = await postJson("/api/github/save", savePayload);
      clearSavedSection(active);
      markSectionDraftReady(active);
      if (active === "profile") setAvatarUpload(null);
      if (active === "projects" && projects[projectIndex]) clearCoverUpload("projects", projects[projectIndex].slug);
      if (active === "research" && research[researchIndex]) clearCoverUpload("research", research[researchIndex].slug);
      setStatus(`저장 완료: ${result.branch || savePayload.branch}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "저장에 실패했습니다.");
    }
  }

  async function publishDraft() {
    if (!canPublishDraft(canEdit, activeDirty, activeDraftReady)) return;
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
      setPublishStatus("PR 준비 완료", result, payload.branch);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PR 발행에 실패했습니다.");
    }
  }

  function updateProject(next: Partial<ProjectEntry>) {
    setProjects((items) => items.map((item, index) => (index === projectIndex ? { ...item, ...next } : item)));
    markSectionDirty("projects");
  }

  function selectProject(index: number) {
    setProjectIndex(index);
    setProjectTagDraft("");
    setProjectRelatedNoteDraft("");
  }

  function updateProjectListField(field: ProjectListField, values: string[]) {
    updateProject({ [field]: values } as Partial<ProjectEntry>);
  }

  function updateProjectListItem(field: ProjectListField, itemIndex: number, value: string) {
    const items = projects[projectIndex]?.[field] ?? [];
    updateProjectListField(field, items.map((item, index) => (index === itemIndex ? value : item)));
  }

  function normalizeProjectListField(field: ProjectListField) {
    const items = projects[projectIndex]?.[field] ?? [];
    const normalized = normalizeList(items);
    if (!sameList(items, normalized)) updateProjectListField(field, normalized);
  }

  function addProjectListItems(field: ProjectListField, draft: string, onDraftChange: (value: string) => void) {
    const nextItems = splitList(draft);
    if (nextItems.length === 0) {
      setStatus(field === "tags" ? "추가할 태그를 입력하세요." : "추가할 관련 노트 slug를 입력하세요.");
      return;
    }
    const current = projects[projectIndex]?.[field] ?? [];
    const merged = normalizeList([...current, ...nextItems]);
    if (sameList(current, merged)) {
      setStatus(field === "tags" ? "이미 추가된 태그입니다." : "이미 추가된 관련 노트입니다.");
      return;
    }
    updateProjectListField(field, merged);
    onDraftChange("");
    setStatus(field === "tags" ? "프로젝트 태그를 추가했습니다. 저장 전입니다." : "프로젝트 관련 노트를 추가했습니다. 저장 전입니다.");
  }

  function moveProjectListItem(field: ProjectListField, itemIndex: number, direction: MoveDirection) {
    const items = projects[projectIndex]?.[field] ?? [];
    updateProjectListField(field, moveItem(items, itemIndex, direction).items);
  }

  function removeProjectListItem(field: ProjectListField, itemIndex: number) {
    const items = projects[projectIndex]?.[field] ?? [];
    updateProjectListField(field, removeItem(items, itemIndex).items);
  }

  function updateProjectMetric(metricIndex: number, patch: Partial<ProjectMetric>) {
    const metrics = projects[projectIndex]?.metrics ?? [];
    updateProject({ metrics: metrics.map((metric, index) => (index === metricIndex ? { ...metric, ...patch } : metric)) });
  }

  function addProjectMetric() {
    const metrics = projects[projectIndex]?.metrics ?? [];
    updateProject({ metrics: [...metrics, { label: "Metric", value: "Value" }] });
  }

  function moveProjectMetric(metricIndex: number, direction: MoveDirection) {
    const metrics = projects[projectIndex]?.metrics ?? [];
    updateProject({ metrics: moveItem(metrics, metricIndex, direction).items });
  }

  function removeProjectMetric(metricIndex: number) {
    const metrics = projects[projectIndex]?.metrics ?? [];
    updateProject({ metrics: removeItem(metrics, metricIndex).items });
  }

  function updateResearch(next: Partial<ResearchEntry>) {
    setResearch((items) => items.map((item, index) => (index === researchIndex ? { ...item, ...next } : item)));
    markSectionDirty("research");
  }

  function updateNote(next: Partial<NoteEntry>) {
    setNotes((items) => items.map((item, index) => (index === noteIndex ? { ...item, ...next } : item)));
    markSectionDirty("notes");
  }

  function updateEducationEntry(index: number, next: Partial<EducationEntry>) {
    setEducation((items) => updateItem(items, index, next));
    markSectionDirty("education");
  }

  function updateTimelineStringItem(index: number, field: TimelineStringListField, itemIndex: number, value: string) {
    setEducation((items) =>
      items.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: entry[field].map((item, currentIndex) => (currentIndex === itemIndex ? value : item)) } : entry,
      ),
    );
    markSectionDirty("education");
  }

  function addTimelineStringItem(index: number, field: TimelineStringListField) {
    const fallback = field === "bullets" ? "새 항목" : "";
    setEducation((items) => items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, [field]: [...entry[field], fallback] } : entry)));
    markSectionDirty("education");
  }

  function moveTimelineStringItem(index: number, field: TimelineStringListField, itemIndex: number, direction: MoveDirection) {
    setEducation((items) =>
      items.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: moveItem(entry[field], itemIndex, direction).items } : entry,
      ),
    );
    markSectionDirty("education");
  }

  function removeTimelineStringItem(index: number, field: TimelineStringListField, itemIndex: number) {
    setEducation((items) =>
      items.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: removeItem(entry[field], itemIndex).items } : entry,
      ),
    );
    markSectionDirty("education");
  }

  function updateTimelineLink(index: number, linkIndex: number, next: Partial<TimelineLink>) {
    setEducation((items) =>
      items.map((entry, entryIndex) =>
        entryIndex === index
          ? { ...entry, links: entry.links.map((link, currentIndex) => (currentIndex === linkIndex ? { ...link, ...next } : link)) }
          : entry,
      ),
    );
    markSectionDirty("education");
  }

  function addTimelineLink(index: number) {
    setEducation((items) =>
      items.map((entry, entryIndex) => (entryIndex === index ? { ...entry, links: [...entry.links, { label: "링크", href: "" }] } : entry)),
    );
    markSectionDirty("education");
  }

  function moveTimelineLink(index: number, linkIndex: number, direction: MoveDirection) {
    setEducation((items) =>
      items.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, links: moveItem(entry.links, linkIndex, direction).items } : entry,
      ),
    );
    markSectionDirty("education");
  }

  function removeTimelineLink(index: number, linkIndex: number) {
    setEducation((items) =>
      items.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, links: removeItem(entry.links, linkIndex).items } : entry,
      ),
    );
    markSectionDirty("education");
  }

  function addEducationEntry() {
    setEducation((items) => appendItem(items, createEducationEntry()).items);
    markSectionDirty("education");
    setStatus("새 타임라인 항목을 추가했습니다. 저장하면 content/education.json에 반영됩니다.");
  }

  function moveEducationEntry(index: number, direction: MoveDirection) {
    setEducation((items) => moveItem(items, index, direction).items);
    markSectionDirty("education");
  }

  function removeEducationEntry(index: number) {
    const previous = education;
    setEducation(removeItem(previous, index).items);
    markSectionDirty("education");
    queueUndo("타임라인 항목을 제거했습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setEducation(previous);
      markSectionDirty("education");
    });
  }

  function addProject() {
    setProjects((items) => {
      const result = appendItem(items, createProjectDraft(items.map((item) => item.slug)));
      setProjectIndex(result.index);
      return result.items;
    });
    setProjectTagDraft("");
    setProjectRelatedNoteDraft("");
    setActive("projects");
    markSectionDirty("projects");
    setStatus("새 프로젝트 초안을 추가했습니다. 저장하면 새 MDX 파일과 목록 순서가 함께 저장됩니다.");
  }

  function archiveEducationEntry(index: number) {
    const previous = education;
    setEducation(updateItem(previous, index, { status: "archived" }));
    markSectionDirty("education");
    queueUndo("타임라인 항목을 archived 상태로 바꿨습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setEducation(previous);
      markSectionDirty("education");
    });
  }

  function duplicateSelectedProject() {
    setProjects((items) => {
      const source = items[projectIndex];
      if (!source) return items;
      const result = appendItem(items, duplicateProject(source, items.map((item) => item.slug)));
      setProjectIndex(result.index);
      return result.items;
    });
    setProjectTagDraft("");
    setProjectRelatedNoteDraft("");
    markSectionDirty("projects");
    setStatus("선택한 프로젝트를 draft 복사본으로 만들었습니다.");
  }

  function moveSelectedProject(direction: MoveDirection) {
    setProjects((items) => {
      const result = moveItem(items, projectIndex, direction);
      setProjectIndex(result.index);
      return result.items;
    });
    markSectionDirty("projects");
  }

  function archiveSelectedProject() {
    const previous = projects;
    const previousIndex = projectIndex;
    const source = previous[previousIndex];
    if (!source) return;
    setProjects(updateItem(previous, previousIndex, archiveEntry(source)));
    markSectionDirty("projects");
    queueUndo("프로젝트를 archived 상태로 바꿨습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setProjects(previous);
      setProjectIndex(previousIndex);
      markSectionDirty("projects");
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
    markSectionDirty("research");
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
    markSectionDirty("research");
    setStatus("선택한 연구 관심사를 draft 복사본으로 만들었습니다.");
  }

  function moveSelectedResearch(direction: MoveDirection) {
    setResearch((items) => {
      const result = moveItem(items, researchIndex, direction);
      setResearchIndex(result.index);
      return result.items;
    });
    markSectionDirty("research");
  }

  function archiveSelectedResearch() {
    const previous = research;
    const previousIndex = researchIndex;
    const source = previous[previousIndex];
    if (!source) return;
    setResearch(updateItem(previous, previousIndex, archiveEntry(source)));
    markSectionDirty("research");
    queueUndo("연구 관심사를 archived 상태로 바꿨습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setResearch(previous);
      setResearchIndex(previousIndex);
      markSectionDirty("research");
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
    markSectionDirty("notes");
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
    markSectionDirty("notes");
    setStatus("선택한 노트를 draft 복사본으로 만들었습니다.");
  }

  function moveSelectedNote(direction: MoveDirection) {
    setNotes((items) => {
      const result = moveItem(items, noteIndex, direction);
      setNoteIndex(result.index);
      return result.items;
    });
    markSectionDirty("notes");
  }

  function archiveSelectedNote() {
    const previous = notes;
    const previousIndex = noteIndex;
    const source = previous[previousIndex];
    if (!source) return;
    setNotes(updateItem(previous, previousIndex, archiveEntry(source)));
    markSectionDirty("notes");
    queueUndo("노트를 archived 상태로 바꿨습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setNotes(previous);
      setNoteIndex(previousIndex);
      markSectionDirty("notes");
    });
    setStatus("선택한 노트를 archived 상태로 바꿨습니다.");
  }

  function updateSkillGroup(index: number, next: Partial<SkillGroup>) {
    setSkills((items) => updateItem(items, index, next));
    markSectionDirty("skills");
  }

  function addSkillGroup() {
    setSkills((items) => {
      const result = appendItem(items, createSkillGroup());
      setSkillCandidateTargetIndex(result.index);
      return result.items;
    });
    markSectionDirty("skills");
    setStatus("새 기술 그룹을 추가했습니다. 그룹명을 입력하고 기술을 하나씩 추가하세요.");
  }

  function moveSkillGroup(index: number, direction: MoveDirection) {
    setSkills((items) => moveItem(items, index, direction).items);
    setSkillDrafts({});
    markSectionDirty("skills");
  }

  function removeSkillGroup(index: number) {
    const previous = skills;
    setSkills(removeItem(previous, index).items);
    setSkillDrafts({});
    markSectionDirty("skills");
    queueUndo("기술 그룹을 제거했습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setSkills(previous);
      markSectionDirty("skills");
    });
  }

  function addSkillItem(groupIndex: number) {
    const value = skillDrafts[groupIndex] ?? "";
    if (!value.trim()) {
      setStatus("추가할 기술 이름을 입력하세요.");
      return;
    }
    if (hasSkillItem(skills, value)) {
      setStatus(`이미 추가된 기술입니다: ${value.trim()}`);
      return;
    }
    setSkills((items) => appendSkillItemToGroup(items, groupIndex, value));
    setSkillDrafts((drafts) => ({ ...drafts, [groupIndex]: "" }));
    markSectionDirty("skills");
    setStatus(`기술을 추가했습니다: ${value.trim()}. 저장 전입니다.`);
  }

  function handleSkillAddKeyDown(event: KeyboardEvent<HTMLInputElement>, groupIndex: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSkillItem(groupIndex);
  }

  function updateSkillItem(groupIndex: number, itemIndex: number, value: string) {
    setSkills((items) =>
      items.map((group, index) =>
        index === groupIndex
          ? { ...group, items: group.items.map((item, currentIndex) => (currentIndex === itemIndex ? value : item)) }
          : group,
      ),
    );
    markSectionDirty("skills");
  }

  function moveSkillItem(groupIndex: number, itemIndex: number, direction: MoveDirection) {
    setSkills((items) =>
      items.map((group, index) =>
        index === groupIndex ? { ...group, items: moveItem(group.items, itemIndex, direction).items } : group,
      ),
    );
    markSectionDirty("skills");
  }

  function removeSkillItem(groupIndex: number, itemIndex: number) {
    const previous = skills;
    setSkills(
      previous.map((group, index) =>
        index === groupIndex ? { ...group, items: removeItem(group.items, itemIndex).items } : group,
      ),
    );
    markSectionDirty("skills");
    queueUndo("기술 항목을 제거했습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setSkills(previous);
      markSectionDirty("skills");
    });
  }

  function updateStarredRepo(index: number, next: Partial<StarredRepo>) {
    setStarred((items) => updateItem(items, index, next));
    markSectionDirty("starred");
  }

  function addStarredRepo() {
    setStarred((items) => appendItem(items, createStarredRepo()).items);
    markSectionDirty("starred");
  }

  function moveStarredRepo(index: number, direction: MoveDirection) {
    setStarred((items) => moveItem(items, index, direction).items);
    markSectionDirty("starred");
  }

  function removeStarredRepo(index: number) {
    const previous = starred;
    setStarred(removeItem(previous, index).items);
    markSectionDirty("starred");
    queueUndo("관심 저장소를 제거했습니다. 저장 전에는 되돌릴 수 있습니다.", () => {
      setStarred(previous);
      markSectionDirty("starred");
    });
  }

  function renderProjectChipList({
    label,
    field,
    items,
    draft,
    onDraftChange,
    placeholder,
  }: {
    label: string;
    field: ProjectListField;
    items: string[];
    draft: string;
    onDraftChange: (value: string) => void;
    placeholder: string;
  }) {
    return (
      <div className="admin-project-chip-panel">
        <div className="admin-project-chip-head">
          <span>{label}</span>
          <small>{items.length} item{items.length === 1 ? "" : "s"}</small>
        </div>
        <div className="admin-skill-chip-list admin-project-chip-list">
          {items.map((item, itemIndex) => (
            <div className="admin-skill-chip admin-project-chip" key={editableListKey(`project-${field}`, projectIndex, itemIndex)}>
              <input
                aria-label={`${label} ${itemIndex + 1}`}
                disabled={!canEdit}
                value={item}
                onBlur={() => normalizeProjectListField(field)}
                onChange={(event) => updateProjectListItem(field, itemIndex, event.target.value)}
              />
              <button type="button" disabled={!canEdit || itemIndex === 0} onClick={() => moveProjectListItem(field, itemIndex, "up")}>Up</button>
              <button type="button" disabled={!canEdit || itemIndex === items.length - 1} onClick={() => moveProjectListItem(field, itemIndex, "down")}>Down</button>
              <button type="button" className="danger" disabled={!canEdit} onClick={() => removeProjectListItem(field, itemIndex)}>Remove</button>
            </div>
          ))}
          <form
            className="admin-skill-add-form admin-project-chip-add"
            onSubmit={(event) => {
              event.preventDefault();
              addProjectListItems(field, draft, onDraftChange);
            }}
          >
            <input disabled={!canEdit} value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder={placeholder} />
            <button type="submit" disabled={!canEdit}>Add</button>
          </form>
        </div>
      </div>
    );
  }

  function renderProjectMetricsEditor(project: ProjectEntry) {
    return (
      <div className="admin-project-metric-panel">
        <div className="admin-project-chip-head">
          <span>Evidence metrics</span>
          <small>{project.metrics.length} metric{project.metrics.length === 1 ? "" : "s"}</small>
        </div>
        {project.metrics.length === 0 && <div className="admin-empty compact">구조화된 지표가 없으면 기존 Metric 문구를 사용합니다.</div>}
        <div className="admin-project-metric-list">
          {project.metrics.map((metric, metricIndex) => (
            <div className="admin-project-metric-row" key={editableListKey("project-metric", projectIndex, metricIndex)}>
              <Field disabled={!canEdit} label="Label" value={metric.label} onChange={(label) => updateProjectMetric(metricIndex, { label })} />
              <Field disabled={!canEdit} label="Value" value={metric.value} onChange={(value) => updateProjectMetric(metricIndex, { value })} />
              <Field disabled={!canEdit} label="Baseline" value={metric.baseline ?? ""} onChange={(baseline) => updateProjectMetric(metricIndex, { baseline })} />
              <Field disabled={!canEdit} label="Note" value={metric.note ?? ""} onChange={(note) => updateProjectMetric(metricIndex, { note })} />
              <div className="admin-project-metric-actions">
                <ControlButton disabled={!canEdit || metricIndex === 0} onClick={() => moveProjectMetric(metricIndex, "up")}>Up</ControlButton>
                <ControlButton disabled={!canEdit || metricIndex === project.metrics.length - 1} onClick={() => moveProjectMetric(metricIndex, "down")}>Down</ControlButton>
                <ControlButton danger disabled={!canEdit} onClick={() => removeProjectMetric(metricIndex)}>Remove</ControlButton>
              </div>
            </div>
          ))}
        </div>
        <div className="admin-card-actions">
          <ControlButton disabled={!canEdit} onClick={addProjectMetric}>Add metric</ControlButton>
        </div>
      </div>
    );
  }

  function renderTimelineStringList({
    index,
    label,
    field,
    items,
    placeholder,
  }: {
    index: number;
    label: string;
    field: TimelineStringListField;
    items: string[];
    placeholder: string;
  }) {
    return (
      <div className="admin-inline-list admin-timeline-list">
        <div className="admin-list-head">
          <span>{label}</span>
          <ControlButton disabled={!canEdit} onClick={() => addTimelineStringItem(index, field)}>Add</ControlButton>
        </div>
        {items.length === 0 && <div className="admin-empty compact">아직 항목이 없습니다.</div>}
        {items.map((item, itemIndex) => (
          <div className="admin-inline-row admin-timeline-row" key={editableListKey(`timeline-${field}`, index, itemIndex)}>
            <input disabled={!canEdit} aria-label={`${label} ${itemIndex + 1}`} value={item} placeholder={placeholder} onChange={(event) => updateTimelineStringItem(index, field, itemIndex, event.target.value)} />
            <button type="button" disabled={!canEdit || itemIndex === 0} onClick={() => moveTimelineStringItem(index, field, itemIndex, "up")}>Up</button>
            <button type="button" disabled={!canEdit || itemIndex === items.length - 1} onClick={() => moveTimelineStringItem(index, field, itemIndex, "down")}>Down</button>
            <button type="button" className="danger" disabled={!canEdit} onClick={() => removeTimelineStringItem(index, field, itemIndex)}>Remove</button>
          </div>
        ))}
      </div>
    );
  }

  function renderTimelineLinks(index: number, links: TimelineLink[]) {
    return (
      <div className="admin-inline-list admin-timeline-list">
        <div className="admin-list-head">
          <span>Links</span>
          <ControlButton disabled={!canEdit} onClick={() => addTimelineLink(index)}>Add link</ControlButton>
        </div>
        {links.length === 0 && <div className="admin-empty compact">아직 링크가 없습니다.</div>}
        {links.map((link, linkIndex) => (
          <div className="admin-inline-row admin-timeline-link-row" key={editableListKey("timeline-link", index, linkIndex)}>
            <input disabled={!canEdit} aria-label={`Link label ${linkIndex + 1}`} value={link.label} placeholder="논문 / GitHub / 발표 자료" onChange={(event) => updateTimelineLink(index, linkIndex, { label: event.target.value })} />
            <input disabled={!canEdit} aria-label={`Link href ${linkIndex + 1}`} value={link.href} placeholder="https://..." onChange={(event) => updateTimelineLink(index, linkIndex, { href: event.target.value })} />
            <button type="button" disabled={!canEdit || linkIndex === 0} onClick={() => moveTimelineLink(index, linkIndex, "up")}>Up</button>
            <button type="button" disabled={!canEdit || linkIndex === links.length - 1} onClick={() => moveTimelineLink(index, linkIndex, "down")}>Down</button>
            <button type="button" className="danger" disabled={!canEdit} onClick={() => removeTimelineLink(index, linkIndex)}>Remove</button>
          </div>
        ))}
      </div>
    );
  }

  function renderGitHubImportPanel(scope: "projects" | "skills" | "starred") {
    const projectCandidates = importResult?.projects ?? [];
    const skillCandidates = importResult?.skills ?? [];
    const starredCandidates = importResult?.starred ?? [];
    const appliedCount = appliedImport[scope].length;
    const allSkillCandidatesApplied = skillCandidates.length > 0 && skillCandidates.every((candidate) => isImportApplied(appliedImport, "skills", candidate.label));
    const allStarredCandidatesApplied = starredCandidates.length > 0 && starredCandidates.every((candidate) => isImportApplied(appliedImport, "starred", candidate.name));
    const isImportOpen = scope !== "projects" || projectImportOpen;
    return (
      <div className="admin-import">
        <div className="admin-import-head">
          <div>
            <span className="admin-kicker">github import</span>
            <strong>GitHub 후보 가져오기</strong>
          </div>
          <div className="admin-import-head-actions">
            <span className="admin-import-count">
              P {projectCandidates.length} · S {skillCandidates.length} · ★ {starredCandidates.length}
            </span>
            {scope === "projects" && (
              <button type="button" onClick={() => setProjectImportOpen((open) => !open)}>
                {projectImportOpen ? "Hide import" : "Show import"}
              </button>
            )}
          </div>
        </div>
        {isImportOpen && (
          <>
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
        {appliedCount > 0 && (
          <div className="admin-import-state">
            Applied to {sectionLabel(scope)} editor · not saved yet ({appliedCount})
          </div>
        )}
        {scope === "projects" && (
          <div className="admin-candidate-list">
            {projectCandidates.length === 0 && <div className="admin-empty">프로젝트 후보가 없습니다. GitHub source를 가져오세요.</div>}
            {projectCandidates.map((candidate) => {
              const applied = isImportApplied(appliedImport, "projects", candidate.slug);
              return (
                <div className="admin-candidate" key={candidate.slug}>
                  <div>
                    <strong>{candidate.name}</strong>
                    <p>{candidate.desc}</p>
                    <span>{candidate.tags.join(", ") || "no tags"}</span>
                    {applied && <span className="admin-applied-badge">Applied · not saved</span>}
                  </div>
                  <button type="button" disabled={!canEdit || applied} onClick={() => applyProjectCandidate(candidate)}>{applied ? "Applied" : "Apply"}</button>
                </div>
              );
            })}
          </div>
        )}
        {scope === "skills" && (
          <div className="admin-candidate-list">
            {skillCandidates.length === 0 && <div className="admin-empty">기술 스택 후보가 없습니다. GitHub profile 또는 repo를 가져오세요.</div>}
            {skillCandidates.length > 0 && (
              <div className="admin-skill-candidate-toolbar">
                <label>
                  <span>Target group</span>
                  {skills.length > 0 ? (
                    <select
                      disabled={!canEdit}
                      value={skillCandidateTargetIndex}
                      onChange={(event) => setSkillCandidateTargetIndex(Number(event.target.value))}
                    >
                      {skills.map((group, index) => (
                        <option key={editableListKey("skill-target", index)} value={index}>
                          {group.label || `Group ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong>GitHub inferred</strong>
                  )}
                </label>
                <button type="button" disabled={!canEdit || allSkillCandidatesApplied} onClick={() => applySkillCandidates()}>
                  {allSkillCandidatesApplied ? "Skill groups applied" : "Apply all groups"}
                </button>
              </div>
            )}
            {skillCandidates.map((candidate) => {
              const applied = isImportApplied(appliedImport, "skills", candidate.label);
              return (
                <div className="admin-candidate" key={candidate.label}>
                  <div>
                    <strong>{candidate.label}</strong>
                    <div className="admin-skill-candidate-chips">
                      {candidate.items.map((skill) => {
                        const itemApplied = applied || isImportApplied(appliedImport, "skills", `${candidate.label}:${skill}`) || hasSkillItem(skills, skill);
                        return (
                          <button
                            key={`${candidate.label}:${skill}`}
                            type="button"
                            className="admin-skill-candidate-chip"
                            disabled={!canEdit || itemApplied}
                            onClick={() => applySkillCandidateItem(candidate.label, skill)}
                          >
                            {itemApplied ? `Added ${skill}` : `+ ${skill}`}
                          </button>
                        );
                      })}
                    </div>
                    {applied && <span className="admin-applied-badge">Applied · not saved</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {scope === "starred" && (
          <div className="admin-candidate-list">
            {starredCandidates.length === 0 && <div className="admin-empty">관심 저장소 후보가 없습니다. GitHub profile을 가져오세요.</div>}
            {starredCandidates.length > 0 && (
              <button type="button" disabled={!canEdit || allStarredCandidatesApplied} onClick={applyAllStarredCandidates}>
                {allStarredCandidatesApplied ? "All starred applied" : "Apply all starred"}
              </button>
            )}
            {starredCandidates.map((candidate) => {
              const applied = isImportApplied(appliedImport, "starred", candidate.name);
              return (
                <div className="admin-candidate" key={candidate.name}>
                  <div>
                    <strong>{candidate.name}</strong>
                    <p>{candidate.desc}</p>
                    <span>★ {candidate.stars}</span>
                    {candidate.href && (
                      <a href={candidate.href} target="_blank" rel="noopener noreferrer">
                        GitHub ↗
                      </a>
                    )}
                    {applied && <span className="admin-applied-badge">Applied · not saved</span>}
                  </div>
                  <button type="button" disabled={!canEdit || applied} onClick={() => applyStarredCandidate(candidate)}>{applied ? "Applied" : "Apply"}</button>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>
    );
  }

  function renderLocaleTabs() {
    return (
      <div className="admin-locale-tabs" aria-label="Admin editor language">
        <button type="button" className={adminEditorLocale === "ko" ? "active" : ""} onClick={() => setAdminEditorLocale("ko")}>
          KO 원문
          {activeDirty && <span>unsaved</span>}
        </button>
        <button
          type="button"
          className={adminEditorLocale === "en" ? "active" : ""}
          disabled={!hasEnglishEditor}
          onClick={() => setAdminEditorLocale("en")}
        >
          EN 초안
          {activeTranslationStats && (
            <span>
              {activeTranslationStats.translated}/{activeTranslationStats.total}
              {activeTranslationStats.stale > 0 ? ` stale ${activeTranslationStats.stale}` : ""}
            </span>
          )}
          {translationDirty && <span>draft changed</span>}
        </button>
      </div>
    );
  }

  function renderEnglishEditor() {
    if (!translationSource || translationEntries.length === 0 || !activeTranslationStats) {
      return <div className="admin-empty">이 섹션에는 영어 초안으로 관리할 텍스트가 없습니다.</div>;
    }
    return (
      <div className="admin-translation">
        <div className="admin-translation-head">
          <div>
            <span className="admin-kicker">english page</span>
            <strong>영어 드래프트 편집</strong>
            <p>
              아래 입력값은 draft/i18n-en 브랜치에 저장될 EN 드래프트입니다. 한국어 원문은 각 필드 아래에 읽기 전용으로 표시됩니다.
            </p>
          </div>
          <div className="admin-translation-actions">
            <span>
              {activeTranslationStats.translated}/{activeTranslationStats.total}
              {activeTranslationStats.stale > 0 ? ` · stale ${activeTranslationStats.stale}` : ""}
            </span>
            <button type="button" disabled={!canEdit || translationLoading} onClick={generateEnglishDraft}>
              {translationLoading ? "Generating..." : "Generate EN draft"}
            </button>
            <button
              type="button"
              disabled={!canSaveDraft(canEdit, translationDirty)}
              title={translationDirty ? "draft/i18n-en에 EN 드래프트를 저장합니다." : "EN 입력값을 수정하면 저장할 수 있습니다."}
              onClick={saveEnglishTranslations}
            >
              Save EN draft
            </button>
            <button type="button" disabled={!canPublishDraft(canEdit, translationDirty, translationDraftReady)} onClick={publishEnglishTranslations}>
              Publish EN draft PR
            </button>
          </div>
        </div>
        <div className="admin-translation-list">
          {translationEntries.map((entryItem) => (
            <label key={entryItem.key} className="admin-translation-field">
              <span>{entryItem.label}</span>
              <small>{entryItem.text}</small>
              <textarea
                disabled={!canEdit}
                rows={entryItem.text.length > 220 ? 5 : 3}
                value={getTranslationValue(enTranslations, entryItem.key)}
                onChange={(event) => updateEnglishTranslation(entryItem, event.target.value)}
                placeholder="English translation"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  function renderCoverImageCard({
    kind,
    slug,
    value,
    title,
    onUrlChange,
    onRemove,
  }: {
    kind: ContentCoverKind;
    slug: string;
    value?: string;
    title: string;
    onUrlChange: (value: string) => void;
    onRemove: () => void;
  }) {
    const upload = coverUploads[coverUploadKey(kind, slug)];
    const imageSrc = upload?.previewUrl ?? value?.trim();
    return (
      <div className="admin-cover-card">
        {imageSrc ? (
          <img className="admin-cover-preview" src={imageSrc} alt={`${title} cover preview`} />
        ) : (
          <div className="admin-cover-empty">No image</div>
        )}
        <div className="admin-cover-body">
          <span className="admin-kicker">cover image</span>
          <strong>{upload ? upload.fileName : value?.trim() ? "Custom cover image" : "Text-only card"}</strong>
          <p>
            {upload
              ? `${upload.publicUrl}로 저장 준비됨 · Save draft를 누르면 이미지 파일도 함께 커밋됩니다.`
              : "대표 이미지가 있으면 메인 페이지에서 썸네일을 보여주고, 비워두면 기존 텍스트 레이아웃을 유지합니다."}
          </p>
          <Field disabled={!canEdit} label="Cover image URL" value={value ?? ""} onChange={onUrlChange} />
          <div className="admin-cover-actions">
            <label className="admin-file-button" aria-disabled={!canEdit}>
              Upload image
              <input disabled={!canEdit} accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => handleCoverUploadChange(kind, slug, event)} />
            </label>
            <ControlButton disabled={!canEdit || (!value && !upload)} onClick={onRemove}>Remove cover</ControlButton>
          </div>
        </div>
      </div>
    );
  }

  function renderEditor() {
    if (active === "site") {
      return (
        <div className="admin-stack">
          <div className="admin-grid">
            <Field disabled={!canEdit} label="Site title" value={site.title} onChange={(title) => updateSite({ title })} />
            <Field disabled={!canEdit} label="Canonical URL" value={site.url} onChange={(url) => updateSite({ url })} />
            <TextArea disabled={!canEdit} label="Site description" value={site.description} onChange={(description) => updateSite({ description })} rows={3} />
          </div>
          <div className="admin-card">
            <div className="admin-card-head">
              <strong>Navigation</strong>
            </div>
            <div className="admin-stack">
              {site.navigation.map((item, index) => (
                <div className="admin-inline-row admin-nav-row" key={editableListKey("site-nav", index)}>
                  <Field disabled={!canEdit} label="Nav ID" value={item.id} onChange={(id) => updateNavigationItem(index, { id })} />
                  <Field disabled={!canEdit} label="Nav label" value={item.label} onChange={(label) => updateNavigationItem(index, { label })} />
                  <Field disabled={!canEdit} label="Nav icon" value={item.icon} onChange={(icon) => updateNavigationItem(index, { icon })} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (active === "profile") {
      return (
        <div className="admin-stack">
          <div className="admin-grid">
            <Field disabled={!canEdit} label="Name" value={profile.name} onChange={(name) => updateProfile({ name })} />
            <Field disabled={!canEdit} label="Handle" value={profile.handle} onChange={(handle) => updateProfile({ handle })} />
            <Field disabled={!canEdit} label="Status" value={profile.status} onChange={(status) => updateProfile({ status })} />
            <Field disabled={!canEdit} label="Avatar URL" value={profile.avatarUrl ?? ""} onChange={updateAvatarUrl} />
            <div className="admin-avatar-card">
              <img className="admin-avatar-preview" src={avatarUpload?.previewUrl ?? getProfileAvatarUrl(profile)} alt={`${profile.name} avatar preview`} />
              <div className="admin-avatar-body">
                <span className="admin-kicker">avatar image</span>
                <strong>{avatarUpload ? avatarUpload.fileName : profile.avatarUrl?.trim() ? "Custom avatar URL" : "GitHub profile avatar"}</strong>
                <p>
                  {avatarUpload
                    ? `${avatarUpload.publicUrl}로 저장 준비됨 · Save Profile draft를 누르면 이미지 파일도 함께 커밋됩니다.`
                    : "파일을 업로드하거나 URL을 직접 입력할 수 있습니다. 비워두면 GitHub 프로필 이미지를 사용합니다."}
                </p>
                <div className="admin-avatar-actions">
                  <label className="admin-file-button" aria-disabled={!canEdit}>
                    Upload image
                    <input disabled={!canEdit} accept="image/png,image/jpeg,image/webp" type="file" onChange={handleAvatarUploadChange} />
                  </label>
                  <ControlButton disabled={!canEdit} onClick={useGitHubAvatar}>Use GitHub avatar</ControlButton>
                </div>
              </div>
            </div>
            <TextArea disabled={!canEdit} label="Headline" value={profile.headline} onChange={(headline) => updateProfile({ headline })} rows={3} />
            <TextArea disabled={!canEdit} label="Lead" value={profile.summaryLead} onChange={(summaryLead) => updateProfile({ summaryLead })} rows={4} />
            <TextArea disabled={!canEdit} label="Summary paragraphs" value={profile.summary.join("\n\n")} onChange={(value) => updateProfile({ summary: value.split(/\n\s*\n/).filter(Boolean) })} rows={8} />
            <div className="admin-card admin-contact-card">
              <div className="admin-card-head">
                <strong>Contacts</strong>
                <div className="admin-card-actions">
                  <ControlButton disabled={!canEdit} onClick={addProfileContact}>Add contact</ControlButton>
                </div>
              </div>
              {profile.contacts.map((contact, index) => (
                <div className="admin-contact-row" key={editableListKey("profile-contact", index)}>
                  <SelectField disabled={!canEdit} label="Contact type" value={contact.type} options={CONTACT_TYPE_OPTIONS} onChange={(type) => updateProfileContact(index, { type })} />
                  <Field disabled={!canEdit} label="Contact ID" value={contact.id} onChange={(id) => updateProfileContact(index, { id })} />
                  <Field disabled={!canEdit} label="Contact label" value={contact.label} onChange={(label) => updateProfileContact(index, { label })} />
                  <Field disabled={!canEdit} label="Contact href" value={contact.href} onChange={(href) => updateProfileContact(index, { href })} />
                  <div className="admin-card-actions">
                    <ControlButton disabled={!canEdit || index === 0} onClick={() => moveProfileContact(index, "up")}>Up</ControlButton>
                    <ControlButton disabled={!canEdit || index === profile.contacts.length - 1} onClick={() => moveProfileContact(index, "down")}>Down</ControlButton>
                    <ControlButton danger disabled={!canEdit} onClick={() => removeProfileContact(index)}>Remove</ControlButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
            <div className="admin-card" key={editableListKey("education", index)}>
              <div className="admin-card-head">
                <div>
                  <span className="admin-kicker">{item.type}</span>
                  <strong>{item.degree || "Timeline item"}</strong>
                </div>
                <div className="admin-card-actions">
                  <ControlButton disabled={!canEdit || index === 0} onClick={() => moveEducationEntry(index, "up")}>Up</ControlButton>
                  <ControlButton disabled={!canEdit || index === education.length - 1} onClick={() => moveEducationEntry(index, "down")}>Down</ControlButton>
                  <ControlButton danger disabled={!canEdit || item.status === "archived"} onClick={() => archiveEducationEntry(index)}>Archive</ControlButton>
                  <ControlButton danger disabled={!canEdit} onClick={() => removeEducationEntry(index)}>Remove</ControlButton>
                </div>
              </div>
              <div className="admin-grid">
                <SelectField disabled={!canEdit} label="Type" value={item.type} options={TIMELINE_TYPE_OPTIONS} onChange={(type) => updateEducationEntry(index, { type })} />
                <SelectField disabled={!canEdit} label="Status" value={item.status} options={STATUS_OPTIONS} onChange={(status) => updateEducationEntry(index, { status })} />
                <Field disabled={!canEdit} label="Title / degree" value={item.degree} onChange={(degree) => updateEducationEntry(index, { degree })} />
                <Field disabled={!canEdit} label="Organization" value={item.school} onChange={(school) => updateEducationEntry(index, { school })} />
                <Field disabled={!canEdit} label="Period" value={item.period} onChange={(period) => updateEducationEntry(index, { period })} />
                <Field disabled={!canEdit} label="Start date" value={item.startDate ?? ""} onChange={(startDate) => updateEducationEntry(index, { startDate })} />
                <Field disabled={!canEdit} label="End date" value={item.endDate ?? ""} onChange={(endDate) => updateEducationEntry(index, { endDate })} />
                <CheckField disabled={!canEdit} label="Currently active" checked={item.current} onChange={(current) => updateEducationEntry(index, { current })} />
                <CheckField disabled={!canEdit} label="Highlight on home" checked={item.highlight} onChange={(highlight) => updateEducationEntry(index, { highlight })} />
                <TextArea disabled={!canEdit} label="Summary note" value={item.note} onChange={(note) => updateEducationEntry(index, { note })} rows={3} />
                {renderTimelineStringList({ index, label: "Bullets", field: "bullets", items: item.bullets, placeholder: "세부 성과 또는 연구 내용" })}
                {renderTimelineLinks(index, item.links)}
                {renderTimelineStringList({ index, label: "Related projects", field: "relatedProjects", items: item.relatedProjects, placeholder: "project-slug" })}
                {renderTimelineStringList({ index, label: "Related skills", field: "relatedSkills", items: item.relatedSkills, placeholder: "Python / RAG / CUDA" })}
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
          <div className="admin-project-selector" aria-label="Project selector">
            {projects.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                className={index === projectIndex ? "active" : ""}
                disabled={!canEdit}
                aria-current={index === projectIndex ? "true" : undefined}
                onClick={() => selectProject(index)}
              >
                <strong>{item.name || `Project ${index + 1}`}</strong>
                <span>{item.status} · {item.period || "no period"}</span>
                <small>{item.tags.length} tags · {item.relatedNotes.length} notes</small>
              </button>
            ))}
          </div>
          <div className="admin-project-layout">
            <div className="admin-project-card">
              <div className="admin-card-head">
                <div>
                  <span className="admin-kicker">project</span>
                  <strong>Basic info</strong>
                </div>
              </div>
              <div className="admin-grid">
                <Field disabled={!canEdit} label="Name" value={project.name} onChange={(name) => updateProject({ name })} />
                <Field disabled={!canEdit} label="Slug" value={project.slug} onChange={(slug) => updateProject({ slug })} />
                <Field disabled={!canEdit} label="Period" value={project.period} onChange={(period) => updateProject({ period })} />
                <Field disabled={!canEdit} label="Link" value={project.link} onChange={(link) => updateProject({ link })} />
              </div>
            </div>
            <div className="admin-project-card">
              <div className="admin-card-head">
                <div>
                  <span className="admin-kicker">state</span>
                  <strong>Publishing</strong>
                </div>
              </div>
              <div className="admin-grid">
                <SelectField disabled={!canEdit} label="Status" value={project.status} options={STATUS_OPTIONS} onChange={(status) => updateProject({ status })} />
                <SelectField disabled={!canEdit} label="Category" value={project.category} options={PROJECT_CATEGORY_OPTIONS} onChange={(category) => updateProject({ category })} />
                <SelectField disabled={!canEdit} label="Focus" value={project.focus} options={PROJECT_FOCUS_OPTIONS} onChange={(focus) => updateProject({ focus })} />
                <SelectField disabled={!canEdit} label="Proof level" value={project.proofLevel} options={PROJECT_PROOF_LEVEL_OPTIONS} onChange={(proofLevel) => updateProject({ proofLevel })} />
                <CheckField disabled={!canEdit} label="Highlight on home" checked={project.highlight} onChange={(highlight) => updateProject({ highlight })} />
                <CheckField disabled={!canEdit} label="Private project" checked={project.private} onChange={(privateProject) => updateProject({ private: privateProject })} />
              </div>
            </div>
            {renderCoverImageCard({
              kind: "projects",
              slug: project.slug,
              value: project.coverImage,
              title: project.name,
              onUrlChange: (coverImage) => updateProjectCoverImage(project.slug, coverImage),
              onRemove: () => removeProjectCoverImage(project.slug),
            })}
            <div className="admin-project-card">
              <div className="admin-card-head">
                <div>
                  <span className="admin-kicker">content</span>
                  <strong>Summary</strong>
                </div>
              </div>
              <TextArea disabled={!canEdit} label="Description" value={project.desc} onChange={(desc) => updateProject({ desc })} rows={4} />
              <TextArea disabled={!canEdit} label="Metric" value={project.metric} onChange={(metric) => updateProject({ metric })} rows={2} />
              {renderProjectMetricsEditor(project)}
            </div>
            <div className="admin-project-card">
              <div className="admin-card-head">
                <div>
                  <span className="admin-kicker">evidence</span>
                  <strong>Evaluation</strong>
                </div>
              </div>
              <div className="admin-grid">
                <Field
                  disabled={!canEdit}
                  label="Evaluation baseline"
                  value={project.evaluation.baseline ?? ""}
                  onChange={(baseline) => updateProject({ evaluation: { ...project.evaluation, baseline } })}
                />
                <Field
                  disabled={!canEdit}
                  label="Evaluation dataset"
                  value={project.evaluation.dataset ?? ""}
                  onChange={(dataset) => updateProject({ evaluation: { ...project.evaluation, dataset } })}
                />
                <TextArea
                  disabled={!canEdit}
                  label="Evaluation method"
                  value={project.evaluation.method ?? ""}
                  onChange={(method) => updateProject({ evaluation: { ...project.evaluation, method } })}
                  rows={3}
                />
              </div>
            </div>
            <div className="admin-project-card">
              <div className="admin-card-head">
                <div>
                  <span className="admin-kicker">graph</span>
                  <strong>Relations</strong>
                </div>
              </div>
              {renderProjectChipList({
                label: "Tags",
                field: "tags",
                items: project.tags,
                draft: projectTagDraft,
                onDraftChange: setProjectTagDraft,
                placeholder: "Python, RAG",
              })}
              {renderProjectChipList({
                label: "Related notes",
                field: "relatedNotes",
                items: project.relatedNotes,
                draft: projectRelatedNoteDraft,
                onDraftChange: setProjectRelatedNoteDraft,
                placeholder: "note-slug",
              })}
            </div>
          </div>
          <MarkdownEditor disabled={!canEdit} label="Project body" body={project.body} mode={mode} onMode={setMode} onChange={(body) => updateProject({ body })} onPreviewClick={handlePreviewClick} previewUrl={adminPreviewUrl} />
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
            {renderCoverImageCard({
              kind: "research",
              slug: item.slug,
              value: item.coverImage,
              title: item.title,
              onUrlChange: (coverImage) => updateResearchCoverImage(item.slug, coverImage),
              onRemove: () => removeResearchCoverImage(item.slug),
            })}
            <TextArea disabled={!canEdit} label="Description" value={item.desc} onChange={(desc) => updateResearch({ desc })} rows={4} />
            <Field disabled={!canEdit} label="Related notes" value={item.relatedNotes.join(", ")} onChange={(value) => updateResearch({ relatedNotes: splitList(value) })} />
          </div>
          <MarkdownEditor disabled={!canEdit} label="Research body" body={item.body} mode={mode} onMode={setMode} onChange={(body) => updateResearch({ body })} onPreviewClick={handlePreviewClick} previewUrl={adminPreviewUrl} />
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
            <div className="admin-card" key={editableListKey("skill-group", index)}>
              <div className="admin-card-head admin-skill-group-head">
                <label className="admin-skill-group-name">
                  <span>Group</span>
                  <input disabled={!canEdit} value={group.label} onChange={(event) => updateSkillGroup(index, { label: event.target.value })} />
                </label>
                <div className="admin-card-actions">
                  <ControlButton disabled={!canEdit || index === 0} onClick={() => moveSkillGroup(index, "up")}>Up</ControlButton>
                  <ControlButton disabled={!canEdit || index === skills.length - 1} onClick={() => moveSkillGroup(index, "down")}>Down</ControlButton>
                  <ControlButton danger disabled={!canEdit} onClick={() => removeSkillGroup(index)}>Remove</ControlButton>
                </div>
              </div>
              <div className="admin-skill-chip-list">
                {group.items.length === 0 && <span className="admin-empty">아직 기술이 없습니다. 아래 입력창에서 하나씩 추가하세요.</span>}
                {group.items.map((skill, itemIndex) => (
                  <div className="admin-skill-chip" key={editableListKey("skill-item", index, itemIndex)}>
                    <input
                      aria-label={`${group.label || "Skill group"} skill ${itemIndex + 1}`}
                      disabled={!canEdit}
                      value={skill}
                      onChange={(event) => updateSkillItem(index, itemIndex, event.target.value)}
                    />
                    <button type="button" disabled={!canEdit || itemIndex === 0} aria-label={`${skill} move left`} onClick={() => moveSkillItem(index, itemIndex, "up")}>←</button>
                    <button type="button" disabled={!canEdit || itemIndex === group.items.length - 1} aria-label={`${skill} move right`} onClick={() => moveSkillItem(index, itemIndex, "down")}>→</button>
                    <button type="button" className="danger" disabled={!canEdit} aria-label={`${skill} remove`} onClick={() => removeSkillItem(index, itemIndex)}>×</button>
                  </div>
                ))}
                <div className="admin-skill-add-form">
                  <input
                    disabled={!canEdit}
                    value={skillDrafts[index] ?? ""}
                    onChange={(event) => setSkillDrafts((drafts) => ({ ...drafts, [index]: event.target.value }))}
                    onKeyDown={(event) => handleSkillAddKeyDown(event, index)}
                    placeholder="Add skill and press Enter"
                  />
                  <button type="button" disabled={!canEdit} onClick={() => addSkillItem(index)}>Add</button>
                </div>
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
            <div className="admin-card" key={editableListKey("starred", index)}>
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
                <Field disabled={!canEdit} label="URL" value={repo.href} onChange={(href) => updateStarredRepo(index, { href })} />
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
      <MarkdownEditor disabled={!canEdit} label="Note body" body={note.body} mode={mode} onMode={setMode} onChange={(body) => updateNote({ body })} onPreviewClick={handlePreviewClick} previewUrl={adminPreviewUrl} />
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
            {SECTIONS.map((section) => {
              const dirty = hasDirtySection(dirtySections, section.key);
              return (
                <button key={section.key} className={[active === section.key ? "active" : "", dirty ? "dirty" : ""].filter(Boolean).join(" ")} onClick={() => setActive(section.key)}>
                  <span>{section.label}</span>
                  {dirty && <span className="admin-dirty-dot" title="Unsaved changes" />}
                </button>
              );
            })}
          </nav>
        </aside>
        <section className="admin-main" style={{ background: T.surface, borderColor: T.border }}>
          <header className="admin-header">
            <div>
              <span className="admin-kicker">current save scope</span>
              <h2>{savePayload.branch}</h2>
              <p className="admin-scope">{currentScope}{activeDirty ? " · unsaved changes" : ""}</p>
              {dirtySections.length > 0 && <p className="admin-unsaved-summary">Unsaved sections: {dirtySectionLabels}</p>}
              <p>{status}</p>
              {publishLink && (
                <a className="admin-pr-result" href={publishLink.href} target="_blank" rel="noopener noreferrer">
                  {publishLink.label}
                </a>
              )}
            </div>
            <div className="admin-actions">
              <button type="button" onClick={toggleTheme}>{theme === "dark" ? "Light" : "Dark"}</button>
              {!session?.authenticated && !localPreview && <a href="/api/auth/login">GitHub Login</a>}
              {!session?.authenticated && import.meta.env.DEV && !localPreview && <a href="/admin?demo=1">Local Preview</a>}
              {session?.authenticated && <a href="/api/auth/logout">Logout</a>}
              <a href={adminPreviewUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!canEdit} onClick={handlePreviewClick}>Preview</a>
              <button type="button" disabled={!canSaveDraft(canEdit, activeDirty)} onClick={saveDraft}>{sectionActionLabel(active, "save")}</button>
              <button type="button" disabled={!canPublishDraft(canEdit, activeDirty, activeDraftReady)} onClick={publishDraft}>{sectionActionLabel(active, "publish")}</button>
            </div>
          </header>
          {undoAction && (
            <div className="admin-undo-toast" role="status">
              <span>{undoAction.message}</span>
              <div>
                <button type="button" onClick={undoAction.onUndo}>Undo</button>
                <button type="button" onClick={() => setUndoAction(null)}>Dismiss</button>
              </div>
            </div>
          )}
          <div className="admin-panel">
            {renderLocaleTabs()}
            {adminEditorLocale === "en" ? renderEnglishEditor() : renderEditor()}
          </div>
        </section>
      </div>
      <style>{`
        .admin-shell { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: 100dvh; }
        .admin-sidebar { border-right: 1px solid; padding: 28px 20px; }
        .admin-sidebar h1 { margin: 18px 0 4px; font-size: 1.6rem; }
        .admin-sidebar p, .admin-header p { color: ${T.sub}; margin: 0; line-height: 1.6; }
        .admin-back { font-family: ${FONT_MONO}; font-size: .75rem; text-decoration: none; }
        .admin-sidebar nav { display: grid; gap: 4px; margin-top: 28px; }
        .admin-sidebar button, .admin-actions button, .admin-actions a, .admin-editor-bar button, .admin-editor-bar a, .admin-file-button,
        .admin-cover-actions button,
        .admin-toolbar button, .admin-card-actions button, .admin-inline-list button, .admin-skill-chip button, .admin-skill-add-form button, .admin-project-selector button, .admin-import button, .admin-candidate button, .admin-undo-toast button, .admin-translation button, .admin-locale-tabs button {
          border: 1px solid ${T.border}; background: ${T.surface}; color: ${T.sub};
          border-radius: 4px; padding: 8px 10px; font-family: ${FONT_MONO}; cursor: pointer; text-decoration: none;
        }
        .admin-sidebar button { text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .admin-sidebar button.active, .admin-editor-bar button.active, .admin-locale-tabs button.active, .admin-project-selector button.active { color: ${T.green}; border-color: ${T.green}; background: ${T.greenBg}; }
        .admin-sidebar button.dirty { border-color: ${T.green}; }
        .admin-dirty-dot { width: 7px; height: 7px; border-radius: 999px; background: ${T.green}; box-shadow: 0 0 0 3px ${T.greenBg}; flex: 0 0 auto; }
        .admin-actions button:disabled, .admin-actions a[aria-disabled="true"], .admin-editor-bar button:disabled, .admin-editor-bar a[aria-disabled="true"], .admin-file-button[aria-disabled="true"], .admin-cover-actions button:disabled, .admin-toolbar button:disabled, .admin-card-actions button:disabled, .admin-inline-list button:disabled, .admin-skill-chip button:disabled, .admin-skill-add-form button:disabled, .admin-project-selector button:disabled, .admin-import button:disabled, .admin-candidate button:disabled, .admin-translation button:disabled, .admin-locale-tabs button:disabled { opacity: .45; cursor: not-allowed; }
        .admin-toolbar button.danger, .admin-card-actions button.danger, .admin-inline-list button.danger, .admin-skill-chip button.danger { color: ${T.red}; border-color: ${T.red}; background: ${T.redBg}; }
        .admin-main { border-left: 0; min-width: 0; padding: 28px; }
        .admin-header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 22px; }
        .admin-header h2 { margin: 4px 0 6px; font-size: 1.35rem; font-family: ${FONT_MONO}; }
        .admin-scope { font-family: ${FONT_MONO}; font-size: .76rem; }
        .admin-unsaved-summary { color: ${T.green} !important; font-family: ${FONT_MONO}; font-size: .76rem; }
        .admin-pr-result {
          display: inline-flex;
          align-items: center;
          margin-top: 8px;
          border: 1px solid ${T.green};
          background: ${T.greenBg};
          color: ${T.green};
          border-radius: 4px;
          padding: 7px 9px;
          font-family: ${FONT_MONO};
          font-size: .72rem;
          text-decoration: none;
        }
        .admin-kicker { color: ${T.green}; font-family: ${FONT_MONO}; font-size: .72rem; text-transform: uppercase; }
        .admin-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .admin-undo-toast {
          border: 1px solid ${T.green}; background: ${T.greenBg}; color: ${T.text};
          border-radius: 6px; padding: 11px 12px; margin-bottom: 14px; display: flex; gap: 12px; justify-content: space-between; align-items: center;
        }
        .admin-undo-toast span { line-height: 1.6; }
        .admin-undo-toast div { display: flex; gap: 8px; flex-wrap: wrap; }
        .admin-undo-toast button { border-color: ${T.green}; color: ${T.green}; background: ${T.surface}; }
        .admin-panel { border: 1px solid ${T.border}; border-radius: 6px; padding: 18px; background: ${T.bg}; display: grid; gap: 14px; }
        .admin-locale-tabs {
          display: inline-flex; width: fit-content; max-width: 100%; border: 1px solid ${T.border};
          background: ${T.surface}; border-radius: 6px; padding: 4px; gap: 4px; flex-wrap: wrap;
        }
        .admin-locale-tabs button {
          display: inline-flex; align-items: center; gap: 8px; border-radius: 4px; min-height: 34px;
        }
        .admin-locale-tabs button span {
          color: inherit; opacity: .78; font-size: .66rem; text-transform: uppercase;
        }
        .admin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .admin-stack { display: grid; gap: 14px; }
        .admin-card { border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px; padding: 14px; display: grid; gap: 12px; }
        .admin-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .admin-card strong { color: ${T.text}; font-size: .95rem; }
        .admin-card-actions, .admin-toolbar { display: flex; flex-wrap: wrap; gap: 8px; }
        .admin-project-selector { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
        .admin-project-selector button {
          display: grid; gap: 5px; text-align: left; min-height: 82px; align-content: start;
          background: ${T.surface}; color: ${T.sub};
        }
        .admin-project-selector button strong { color: inherit; font-size: .86rem; overflow-wrap: anywhere; }
        .admin-project-selector button span, .admin-project-selector button small {
          color: inherit; opacity: .78; font-family: ${FONT_MONO}; font-size: .68rem; line-height: 1.5;
        }
        .admin-project-layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .admin-project-card {
          border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px;
          padding: 14px; display: grid; gap: 12px; align-content: start;
        }
        .admin-project-card strong { color: ${T.text}; font-size: .95rem; }
        .admin-project-card .admin-card-head strong { display: block; margin-top: 4px; }
        .admin-project-card .admin-field-block { grid-column: 1 / -1; }
        .admin-project-layout .admin-cover-card { grid-column: 1 / -1; }
        .admin-project-chip-panel { display: grid; gap: 8px; min-width: 0; }
        .admin-project-chip-head { display: flex; justify-content: space-between; gap: 10px; color: ${T.sub}; font-family: ${FONT_MONO}; font-size: .76rem; }
        .admin-project-chip-head small { color: ${T.muted}; }
        .admin-project-chip-list { align-items: stretch; }
        .admin-project-chip input { width: clamp(112px, 16vw, 190px); }
        .admin-project-chip-add input { width: clamp(140px, 18vw, 230px); }
        .admin-project-metric-panel { display: grid; gap: 10px; }
        .admin-project-metric-list { display: grid; gap: 10px; }
        .admin-project-metric-row {
          border: 1px solid ${T.border}; background: ${T.bg}; border-radius: 6px; padding: 10px;
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
        }
        .admin-project-metric-actions { grid-column: 1 / -1; display: flex; gap: 6px; flex-wrap: wrap; }
        .admin-skill-group-head { align-items: center; }
        .admin-skill-group-name {
          display: grid; gap: 6px; min-width: min(360px, 100%); flex: 1;
          color: ${T.sub}; font-family: ${FONT_MONO}; font-size: .72rem;
        }
        .admin-skill-group-name input,
        .admin-skill-candidate-toolbar select {
          width: 100%; box-sizing: border-box; border: 1px solid ${T.border}; background: ${T.bg}; color: ${T.text};
          border-radius: 4px; padding: 9px 10px; font-family: ${FONT_SANS}; font-size: .9rem;
        }
        .admin-skill-chip-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0; }
        .admin-skill-chip {
          display: inline-flex; align-items: center; gap: 4px; max-width: 100%;
          border: 1px solid ${T.border}; background: ${T.bg}; border-radius: 999px; padding: 4px;
        }
        .admin-skill-chip input {
          width: clamp(82px, 13vw, 156px); min-width: 0; border: 0; outline: none;
          background: transparent; color: ${T.text}; font-family: ${FONT_MONO}; font-size: .74rem;
        }
        .admin-skill-chip button {
          display: inline-grid; place-items: center; min-width: 26px; height: 26px;
          border-radius: 999px; padding: 0 6px; line-height: 1;
        }
        .admin-skill-add-form {
          display: inline-flex; align-items: center; gap: 6px; max-width: 100%;
          border: 1px dashed ${T.border}; background: ${T.surface}; border-radius: 999px; padding: 4px;
        }
        .admin-skill-add-form input {
          width: clamp(150px, 18vw, 220px); min-width: 0; border: 0; outline: none;
          background: transparent; color: ${T.text}; font-family: ${FONT_SANS}; font-size: .86rem;
        }
        .admin-skill-add-form button { border-radius: 999px; padding: 6px 10px; }
        .admin-import { border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px; padding: 14px; display: grid; gap: 12px; }
        .admin-import-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .admin-import-head strong { display: block; margin-top: 4px; color: ${T.text}; }
        .admin-import-head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
        .admin-import-count { color: ${T.green}; font-family: ${FONT_MONO}; font-size: .72rem; }
        .admin-import-form { display: grid; grid-template-columns: minmax(180px, 1fr) 150px auto; gap: 10px; align-items: end; }
        .admin-import-form label { display: grid; gap: 6px; color: ${T.sub}; font-size: .72rem; font-family: ${FONT_MONO}; }
        .admin-import-form input, .admin-import-form select {
          width: 100%; box-sizing: border-box; border: 1px solid ${T.border}; background: ${T.bg}; color: ${T.text};
          border-radius: 4px; padding: 9px 10px; font-family: ${FONT_SANS}; font-size: .9rem;
        }
        .admin-import-warnings { display: grid; gap: 4px; color: ${T.muted}; font-family: ${FONT_MONO}; font-size: .68rem; }
        .admin-import-state { border: 1px solid ${T.green}; background: ${T.greenBg}; color: ${T.green}; border-radius: 4px; padding: 8px 10px; font-family: ${FONT_MONO}; font-size: .72rem; }
        .admin-candidate-list { display: grid; gap: 8px; }
        .admin-candidate { border: 1px solid ${T.border}; background: ${T.bg}; border-radius: 4px; padding: 11px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; }
        .admin-candidate > div { display: grid; gap: 5px; }
        .admin-candidate p { color: ${T.sub}; margin: 5px 0; line-height: 1.6; }
        .admin-candidate span { color: ${T.muted}; font-family: ${FONT_MONO}; font-size: .68rem; }
        .admin-candidate .admin-applied-badge { width: fit-content; color: ${T.green}; border: 1px solid ${T.green}; background: ${T.greenBg}; border-radius: 999px; padding: 3px 7px; }
        .admin-skill-candidate-toolbar { display: flex; justify-content: space-between; align-items: end; gap: 10px; flex-wrap: wrap; }
        .admin-skill-candidate-toolbar label {
          display: grid; gap: 6px; min-width: min(240px, 100%);
          color: ${T.sub}; font-family: ${FONT_MONO}; font-size: .72rem;
        }
        .admin-skill-candidate-toolbar strong { color: ${T.green}; font-family: ${FONT_MONO}; font-size: .8rem; }
        .admin-skill-candidate-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
        .admin-skill-candidate-chip {
          border-radius: 999px !important; padding: 6px 9px !important; font-size: .72rem;
          border-color: ${T.green} !important; background: ${T.greenBg} !important; color: ${T.green} !important;
        }
        .admin-translation { border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px; padding: 14px; display: grid; gap: 12px; }
        .admin-translation-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
        .admin-translation-head strong { display: block; margin-top: 4px; color: ${T.text}; }
        .admin-translation-head p { color: ${T.sub}; margin: 6px 0 0; line-height: 1.6; }
        .admin-translation-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
        .admin-translation-actions span { color: ${T.green}; font-family: ${FONT_MONO}; font-size: .72rem; }
        .admin-translation-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .admin-translation-field { display: grid; gap: 6px; color: ${T.sub}; font-family: ${FONT_MONO}; font-size: .76rem; }
        .admin-translation-field small { min-height: 3.2em; color: ${T.muted}; font-family: ${FONT_SANS}; line-height: 1.6; }
        .admin-avatar-card {
          grid-column: 1 / -1; border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px;
          padding: 14px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 14px; align-items: center;
        }
        .admin-avatar-preview {
          width: clamp(72px, 8vw, 104px); aspect-ratio: 1; border-radius: 999px; object-fit: cover;
          border: 1px solid ${T.green}; background: ${T.bg};
        }
        .admin-avatar-body { display: grid; gap: 7px; min-width: 0; }
        .admin-avatar-body strong { color: ${T.text}; font-size: .95rem; }
        .admin-avatar-body p { color: ${T.sub}; line-height: 1.6; margin: 0; overflow-wrap: anywhere; }
        .admin-avatar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .admin-file-button { display: inline-flex; align-items: center; justify-content: center; }
        .admin-file-button input { display: none; }
        .admin-file-button[aria-disabled="true"] { pointer-events: none; }
        .admin-cover-card {
          grid-column: 1 / -1; border: 1px solid ${T.border}; background: ${T.surface}; border-radius: 6px;
          padding: 14px; display: grid; grid-template-columns: minmax(160px, 32%) minmax(0, 1fr); gap: 14px; align-items: stretch;
        }
        .admin-cover-preview, .admin-cover-empty {
          width: 100%; min-height: 150px; aspect-ratio: 16 / 9; border: 1px solid ${T.border}; border-radius: 4px;
          background: ${T.bg}; object-fit: cover; display: grid; place-items: center; color: ${T.muted}; font-family: ${FONT_MONO}; font-size: .72rem;
        }
        .admin-cover-body { display: grid; gap: 8px; min-width: 0; align-content: start; }
        .admin-cover-body strong { color: ${T.text}; font-size: .95rem; }
        .admin-cover-body p { color: ${T.sub}; line-height: 1.6; margin: 0; overflow-wrap: anywhere; }
        .admin-cover-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .admin-field { display: grid; gap: 6px; color: ${T.sub}; font-size: .78rem; font-family: ${FONT_MONO}; }
        .admin-field-block { grid-column: 1 / -1; }
        .admin-field input, .admin-field textarea, .admin-field select, .admin-stack select, .admin-inline-row input, .admin-editor textarea, .admin-wysiwyg, .admin-translation-field textarea {
          width: 100%; box-sizing: border-box; border: 1px solid ${T.border}; background: ${T.surface}; color: ${T.text};
          border-radius: 4px; padding: 10px 11px; font-family: ${FONT_SANS}; font-size: .92rem; line-height: 1.7;
        }
        .admin-check-field { align-self: end; min-height: 43px; display: flex; align-items: center; gap: 9px; color: ${T.sub}; font-size: .78rem; font-family: ${FONT_MONO}; }
        .admin-check-field input { width: 16px; height: 16px; accent-color: ${T.green}; }
        .admin-inline-list { display: grid; gap: 8px; color: ${T.sub}; font-size: .78rem; font-family: ${FONT_MONO}; }
        .admin-inline-row { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto auto; gap: 8px; align-items: center; }
        .admin-list-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .admin-timeline-list { grid-column: 1 / -1; border: 1px solid ${T.border}; background: ${T.bg}; border-radius: 6px; padding: 12px; }
        .admin-timeline-row { grid-template-columns: minmax(180px, 1fr) auto auto auto; }
        .admin-timeline-link-row { grid-template-columns: minmax(120px, .7fr) minmax(180px, 1fr) auto auto auto; }
        .admin-nav-row { grid-template-columns: minmax(120px, .8fr) minmax(160px, 1.2fr) minmax(100px, .7fr); align-items: end; }
        .admin-contact-card { grid-column: 1 / -1; }
        .admin-contact-row {
          border: 1px solid ${T.border}; background: ${T.bg}; border-radius: 6px; padding: 12px;
          display: grid; grid-template-columns: minmax(120px, .7fr) minmax(120px, .8fr) minmax(160px, 1fr) minmax(220px, 1.4fr) auto;
          gap: 10px; align-items: end;
        }
        .admin-empty { border: 1px dashed ${T.border}; border-radius: 6px; padding: 18px; color: ${T.sub}; }
        .admin-empty.compact { padding: 10px 12px; font-size: .74rem; }
        .admin-editor { display: grid; gap: 10px; }
        .admin-editor-bar { display: flex; justify-content: space-between; align-items: center; color: ${T.sub}; font-family: ${FONT_MONO}; font-size: .78rem; }
        .admin-editor-bar div { display: flex; gap: 6px; }
        .admin-wysiwyg { min-height: 240px; white-space: pre-wrap; }
        @media (max-width: 860px) {
          .admin-shell { grid-template-columns: 1fr; }
          .admin-sidebar { border-right: 0; border-bottom: 1px solid; }
          .admin-grid { grid-template-columns: 1fr; }
          .admin-header { flex-direction: column; }
          .admin-actions { justify-content: flex-start; width: 100%; }
          .admin-actions button, .admin-actions a { flex: 1 1 160px; text-align: center; }
          .admin-undo-toast { flex-direction: column; align-items: flex-start; }
          .admin-card-head { flex-direction: column; }
          .admin-project-layout { grid-template-columns: 1fr; }
          .admin-project-selector { grid-template-columns: 1fr; }
          .admin-avatar-card { grid-template-columns: 1fr; align-items: start; }
          .admin-cover-card { grid-template-columns: 1fr; }
          .admin-import-form { grid-template-columns: 1fr; }
          .admin-candidate { grid-template-columns: 1fr; }
          .admin-inline-row { grid-template-columns: 1fr; }
          .admin-timeline-link-row { grid-template-columns: 1fr; }
          .admin-nav-row, .admin-contact-row { grid-template-columns: 1fr; }
          .admin-translation-head { flex-direction: column; }
          .admin-translation-actions { justify-content: flex-start; }
          .admin-translation-list { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
