import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { portfolioContent } from "@/content";
import { DOMAINS, EDGES, EVIDENCE_SOURCES, NODES, RELATIONS, type KnowledgeNodeDef } from "./knowledgeData";
import { evidenceSourceDef, nodeStatusFrom } from "./graph3dModel";

function repoFile(path: string): string {
  return fileURLToPath(new URL(`../../../../${path}`, import.meta.url).href);
}

const files = new Map<string, string>();
/** 작업 트리는 CRLF 일 수 있어 줄바꿈을 맞춘 뒤 찾습니다. */
function read(path: string): string {
  if (!files.has(path)) files.set(path, readFileSync(repoFile(path), "utf8").replace(/\r\n/g, "\n"));
  return files.get(path)!;
}

function sourceText(id: string): string {
  const def = evidenceSourceDef(id);
  if (!def) throw new Error(`unknown evidence source ${id}`);
  return def.files.map(read).join("\n");
}

const byId = new Map(NODES.map((node) => [node.id, node]));
const statusOf = (node: KnowledgeNodeDef) => nodeStatusFrom(node.claims.map((claim) => claim.mode));
const published = {
  projects: portfolioContent.projects.filter((item) => item.status === "published"),
  research: portfolioContent.research.filter((item) => item.status === "published"),
  papers: portfolioContent.education.filter((item) => item.type === "publication" && item.status === "published"),
};
const SOFT_SKILL_GROUP = "아이디어 구체화와 팀 개발 진행";

/** 연구 글의 '더 탐구하고 싶은 내용' 단락 */
function interestSection(slug: string): string {
  const body = read(`content/research/${slug}.mdx`);
  const start = body.indexOf("## 더 탐구하고 싶은 내용");
  const end = body.indexOf("\n## ", start + 4);
  return start < 0 ? "" : body.slice(start, end < 0 ? undefined : end);
}

describe("knowledge sources", () => {
  it("gives every node at least one claim quoted word for word from a real file in this repository", () => {
    for (const node of NODES) {
      expect(node.claims.length, node.id).toBeGreaterThan(0);
      for (const claim of node.claims) {
        const def = evidenceSourceDef(claim.source);
        expect(def, `${node.id}: ${claim.source}`).not.toBeNull();
        for (const file of def!.files) expect(existsSync(repoFile(file)), file).toBe(true);
        expect(sourceText(claim.source), `${node.id} ← ${claim.source}`).toContain(claim.quote);
      }
    }
    for (const source of EVIDENCE_SOURCES) for (const file of source.files) expect(existsSync(repoFile(file)), file).toBe(true);
  });

  it("cites only published content, and finds every paper or job it names in the timeline", () => {
    const sources = new Set(NODES.flatMap((node) => node.claims.map((claim) => claim.source)).concat(EDGES.map((edge) => edge.source)));
    for (const id of Array.from(sources)) {
      const def = evidenceSourceDef(id)!;
      if (def.kind === "project") expect(published.projects.some((item) => item.slug === def.ref), id).toBe(true);
      if (def.kind === "research") expect(published.research.some((item) => item.slug === def.ref), id).toBe(true);
      if (def.kind === "paper" || def.kind === "work") {
        const entry = portfolioContent.education.find((item) => item.degree === def.ref);
        expect(entry?.status, id).toBe("published");
        expect(entry?.type, id).toBe(def.kind === "paper" ? "publication" : def.ref === "석사과정 학생연구원" ? "research" : "work");
      }
    }
  });

  it("types every edge, quotes it from a real file, and backs it with a source that one of its ends also cites", () => {
    const seen = new Set<string>();
    for (const edge of EDGES) {
      const context = `${edge.from} -${edge.relation}-> ${edge.to}`;
      expect(byId.has(edge.from), context).toBe(true);
      expect(byId.has(edge.to), context).toBe(true);
      expect(edge.from).not.toBe(edge.to);
      expect(RELATIONS).toContain(edge.relation);
      expect(seen.has(`${edge.from}>${edge.to}`) || seen.has(`${edge.to}>${edge.from}`), `duplicate ${context}`).toBe(false);
      seen.add(`${edge.from}>${edge.to}`);
      expect(sourceText(edge.source), context).toContain(edge.quote);
      const ends = [byId.get(edge.from)!, byId.get(edge.to)!].flatMap((node) => node.claims.map((claim) => claim.source));
      expect(ends, context).toContain(edge.source);
    }
  });

  it("keeps each relation meaningful for the kinds of knowledge it joins", () => {
    for (const edge of EDGES) {
      const from = byId.get(edge.from)!;
      const to = byId.get(edge.to)!;
      const context = `${edge.from} -${edge.relation}-> ${edge.to}`;
      // 근거 없는 항목(스택 목록)은 어디에도 잇지 않고, 관심 주제는 설명용 '바탕' 관계의 끝에만 둡니다.
      expect(statusOf(from), context).toBe("evidenced");
      if (statusOf(to) !== "evidenced") {
        expect(statusOf(to), context).toBe("interest");
        expect(edge.relation, context).toBe("prerequisite");
      }
      if (edge.relation === "uses") expect(to.kind, context).toBe("tech");
      if (edge.relation === "implements") {
        expect(from.kind, context).toBe("method");
        expect(to.kind, context).toBe("concept");
      }
      if (edge.relation === "applies") expect(to.kind, context).not.toBe("tech");
      if (edge.relation === "supports") {
        expect(from.kind, context).not.toBe("tech");
        expect(to.kind, context).not.toBe("tech");
      }
    }
  });

  it("keeps interest-only and stack-only items apart from experience", () => {
    const projectText = published.projects.map((item) => [item.name, item.desc, item.metric, item.body, ...item.tags].join("\n")).join("\n");
    const researchText = published.research.map((item) => [item.title, item.desc, item.body].join("\n")).join("\n");
    for (const node of NODES) {
      const status = statusOf(node);
      if (status === "evidenced") {
        expect(node.claims.some(c => c.mode === "built" || c.mode === "studied"), node.id).toBe(true);
        continue;
      }
      // 관심·목록 항목은 '직접 한 일'을 따로 쓰지 않고 공통 문구(작업 기록 없음)를 씁니다.
      expect(node.did, node.id).toBeUndefined();
      expect(node.claims.every((claim) => claim.mode === status), node.id).toBe(true);
      if (status === "interest") {
        for (const claim of node.claims) {
          expect(claim.source, node.id).toMatch(/^research:/);
          expect(interestSection(claim.source.slice("research:".length)), node.id).toContain(claim.quote);
        }
      }
      if (status === "listed") {
        expect(node.stack, node.id).toBeDefined();
        // 스택에만 적힌 항목은 정말로 프로젝트·연구 글에 쓰인 기록이 없어야 합니다 (생기면 근거를 연결해 옮깁니다).
        const name = node.stack!.toLowerCase();
        expect(projectText.toLowerCase(), node.id).not.toContain(name);
        expect(researchText.toLowerCase(), node.id).not.toContain(name);
      }
    }
  });

  it("covers the portfolio: every published project, research note and paper is cited, and every stack item has a place", () => {
    const cited = new Set(NODES.flatMap((node) => node.claims.map((claim) => claim.source)));
    for (const project of published.projects) expect(cited.has(`project:${project.slug}`), project.slug).toBe(true);
    for (const research of published.research) expect(cited.has(`research:${research.slug}`), research.slug).toBe(true);
    const papers = EVIDENCE_SOURCES.filter((source) => source.kind === "paper");
    for (const paper of published.papers) {
      const source = papers.find((item) => item.ref === paper.degree);
      expect(source, paper.degree).toBeDefined();
      expect(cited.has(source!.id), paper.degree).toBe(true);
    }
    const stackItems = new Set(portfolioContent.skills.filter((group) => group.label !== SOFT_SKILL_GROUP).flatMap((group) => group.items));
    for (const item of Array.from(stackItems)) {
      expect(NODES.filter((node) => (node.stack ?? (node.kind === "tech" ? node.label.ko : undefined)) === item).map((node) => node.id), item).toHaveLength(1);
    }
    for (const node of NODES) if (node.stack) expect(stackItems.has(node.stack), node.id).toBe(true);
  });

  it("states publication status and scope as the sources do — no stronger", () => {
    const venue = (degree: string) => portfolioContent.education.find((item) => item.degree === degree)!.school;
    expect(venue("스마트팜 RAG를 위한 질의 적응형 검색 채널 제어")).toContain("KCI 게재");
    expect(venue("근거 추적형 로컬 RAG 기반 온디바이스 의료 질의응답 시스템")).toContain("발표");
    expect(venue("Role-Separated Selective Response for Question Answering in Multi-View Video Surveillance")).toContain("심사 중");

    for (const node of NODES) {
      const ko = node.did?.ko ?? "";
      const en = node.did?.en ?? "";
      // 심사 중인 원고를 게재된 것처럼 쓰지 않습니다.
      if (ko.includes("IEEE")) {
        expect(ko, node.id).toContain("심사 중");
        expect(ko, node.id).not.toMatch(/IEEE[^.]*게재/);
        expect(en, node.id).toContain("under review");
      }
      // 숙련도·전문가 표현은 쓰지 않습니다.
      expect(`${ko} ${en}`, node.id).not.toMatch(/숙련|전문가|마스터|expert|proficien|master(ed|y)/i);
    }
    for (const node of NODES) expect(node.did).toBeUndefined();
    // Work descriptions are now the source claims; the independent narrative was removed.

  });

  it("has unique ids, known domains with real substance, and no starred repositories or soft skills", () => {
    expect(new Set(NODES.map((node) => node.id)).size).toBe(NODES.length);
    for (const node of NODES) expect(node.id, node.id).not.toContain(":");
    const domainIds = DOMAINS.map((domain) => domain.id);
    for (const node of NODES) expect(domainIds).toContain(node.domain);
    for (const domain of DOMAINS) {
      expect(NODES.filter((node) => node.domain === domain.id && statusOf(node) === "evidenced").length, domain.id).toBeGreaterThanOrEqual(3);
    }
    const text = JSON.stringify(NODES);
    for (const repo of portfolioContent.starred) expect(text).not.toContain(repo.name);
    const soft = portfolioContent.skills.find((group) => group.label === SOFT_SKILL_GROUP)!;
    for (const item of soft.items) expect(NODES.some((node) => node.label.ko === item || (node.stack ?? (node.kind === "tech" ? node.label.ko : undefined)) === item), item).toBe(false);
  });
});
