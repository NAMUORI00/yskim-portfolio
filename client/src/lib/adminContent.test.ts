import { describe, expect, it } from "vitest";
import {
  appendSaveFiles,
  buildSavePayload,
  noteBranchName,
  projectBranchName,
  researchBranchName,
  serializeNote,
  serializeProject,
  serializeResearch,
} from "./adminContent";
import type { ContentOrder, EducationEntry, NoteEntry, ProfileContent, ProjectEntry, ResearchEntry, SiteContent } from "@/content";

const project: ProjectEntry = {
  slug: "aerospace-rag",
  name: "aerospace-rag",
  period: "2026.05",
  desc: "RAG system",
  metric: "MRR +31%",
  category: "career",
  focus: "research",
  proofLevel: "core",
  metrics: [{ label: "MRR", value: "+31%", baseline: "Dense-only", note: "80개 질의" }],
  evaluation: { baseline: "Dense-only retrieval", dataset: "항공우주 질의 80개", method: "same corpus / top-k" },
  tags: ["Python", "RAG"],
  link: "https://github.com/NAMUORI00/aerospace-rag",
  highlight: true,
  private: false,
  status: "published",
  coverImage: "/uploads/projects/aerospace-rag.webp",
  relatedNotes: ["rag-evaluation"],
  body: "## 개요\n\n본문",
};

const research: ResearchEntry = {
  slug: "rag",
  title: "Retrieval-Augmented Generation",
  desc: "Hybrid retrieval",
  status: "published",
  coverImage: "/uploads/research/rag.webp",
  showDiagram: true,
  relatedNotes: ["rag-evaluation"],
  body: "## RAG\n\n본문",
};

const note: NoteEntry = {
  slug: "rag-evaluation",
  title: "RAG 평가 노트",
  status: "published",
  date: "2026-05-18",
  summary: "평가 기준",
  tags: ["RAG"],
  relatedProjects: ["aerospace-rag"],
  relatedResearch: ["rag"],
  body: "## 평가\n\n본문",
};

const profile: ProfileContent = {
  name: "김유석",
  romanizedName: "KIM YUSEOK",
  handle: "NAMUORI00",
  status: "구직 중",
  avatarUrl: "https://github.com/NAMUORI00.png",
  headline: "AI 연구 · 엔지니어 지망",
  summaryLead: "효율적이고 확장 가능한 시스템을 구축하는 소프트웨어 엔지니어입니다.",
  summary: ["본문"],
  contacts: [{ id: "github", type: "github", label: "github.com/NAMUORI00", href: "https://github.com/NAMUORI00" }],
};

const site: SiteContent = {
  title: "김유석 | AI 연구 엔지니어 포트폴리오",
  description: "CS/AI 석사 진학 중",
  url: "https://namuori.net",
  navigation: [{ id: "about", label: "소개", icon: "user" }],
  images: { heroTree: "tree", ragDiagram: "rag", dotPattern: "dot" },
};

const timeline: EducationEntry[] = [
  {
    type: "publication",
    degree: "RAG 평가 논문 준비",
    school: "Independent research",
    period: "2026",
    startDate: "2026-03",
    endDate: "",
    note: "검색 품질 평가 프로토콜 정리",
    current: true,
    status: "draft",
    highlight: false,
    bullets: ["Recall@k 기준 정리", "Ablation 설계"],
    links: [{ label: "Draft", href: "https://namuori.net/notes/rag-evaluation" }],
    relatedProjects: ["aerospace-rag"],
    relatedSkills: ["RAG", "Evaluation"],
  },
];

const order: ContentOrder = {
  research: ["rag"],
  projects: ["aerospace-rag"],
  notes: ["rag-evaluation"],
};

describe("admin content helpers", () => {
  it("creates stable draft branch names", () => {
    expect(projectBranchName("aerospace-rag")).toBe("draft/project-aerospace-rag");
    expect(researchBranchName("rag")).toBe("draft/research-rag");
    expect(noteBranchName("rag-evaluation")).toBe("draft/note-rag-evaluation");
  });

  it("serializes project/research/note MDX", () => {
    expect(serializeProject(project).path).toBe("content/projects/aerospace-rag.mdx");
    expect(serializeProject(project).content).toContain("category: career");
    expect(serializeProject(project).content).toContain("focus: research");
    expect(serializeProject(project).content).toContain("proofLevel: core");
    expect(serializeProject(project).content).toContain('metrics: [{"label":"MRR","value":"+31%","baseline":"Dense-only","note":"80개 질의"}]');
    expect(serializeProject(project).content).toContain('evaluation: {"baseline":"Dense-only retrieval","dataset":"항공우주 질의 80개","method":"same corpus / top-k"}');
    expect(serializeProject(project).content).toContain("highlight: true");
    expect(serializeProject(project).content).toContain("coverImage: /uploads/projects/aerospace-rag.webp");
    expect(serializeResearch(research).path).toBe("content/research/rag.mdx");
    expect(serializeResearch(research).content).toContain("showDiagram: true");
    expect(serializeResearch(research).content).toContain("coverImage: /uploads/research/rag.webp");
    expect(serializeNote(note).path).toBe("content/notes/rag-evaluation.mdx");
    expect(serializeNote(note).content).toContain("relatedProjects:");
  });

  it("builds save payloads for GitHub API", () => {
    const payload = buildSavePayload({ kind: "project", value: project, order });

    expect(payload.branch).toBe("draft/project-aerospace-rag");
    expect(payload.message).toBe("Update project: aerospace-rag");
    expect(payload.files).toEqual([
      expect.objectContaining({
        path: "content/projects/aerospace-rag.mdx",
        content: expect.stringContaining("slug: aerospace-rag"),
      }),
      {
        path: "content/order.json",
        content: `${JSON.stringify(order, null, 2)}\n`,
      },
    ]);
  });

  it("builds a save payload for extended timeline entries", () => {
    const payload = buildSavePayload({ kind: "education", value: timeline });

    expect(payload.branch).toBe("draft/education");
    expect(payload.message).toBe("Update timeline");
    expect(payload.files[0]).toEqual({
      path: "content/education.json",
      content: `${JSON.stringify(timeline, null, 2)}\n`,
    });
  });

  it("includes profile status and avatar URL in profile saves", () => {
    const payload = buildSavePayload({ kind: "profile", value: profile });

    expect(payload.branch).toBe("draft/profile");
    expect(payload.files[0]).toEqual({
      path: "content/profile.json",
      content: expect.stringContaining('"status": "구직 중"'),
    });
    expect(payload.files[0].content).toContain('"avatarUrl": "https://github.com/NAMUORI00.png"');
  });

  it("builds a save payload for site settings", () => {
    const payload = buildSavePayload({ kind: "site", value: site });

    expect(payload.branch).toBe("draft/site");
    expect(payload.message).toBe("Update site settings");
    expect(payload.files[0]).toEqual({
      path: "content/site.json",
      content: `${JSON.stringify(site, null, 2)}\n`,
    });
  });

  it("appends binary files without mutating the original save payload", () => {
    const payload = buildSavePayload({ kind: "profile", value: profile });
    const next = appendSaveFiles(payload, [
      {
        path: "client/public/uploads/avatar/namuori-avatar.webp",
        content: "aGVsbG8=",
        encoding: "base64",
      },
    ]);

    expect(payload.files).toHaveLength(1);
    expect(next.files).toHaveLength(2);
    expect(next.files[1]).toEqual({
      path: "client/public/uploads/avatar/namuori-avatar.webp",
      content: "aGVsbG8=",
      encoding: "base64",
    });
  });
});
