import type {
  EducationEntry,
  PortfolioContent,
  ProjectEntry,
} from "@/content/types";
import { marked } from "marked";

export type DocumentKind = "resume" | "portfolio";
export type Detail = "summary" | "standard" | "detailed";
export type Purpose = "ai" | "research" | "service";
export const documentNames = {
  resume: "이력서·경력기술서",
  portfolio: "포트폴리오",
};
export const purposeNames = {
  ai: "AI·LLM 개발",
  research: "연구개발",
  service: "백엔드·서비스 개발",
};
export const typeNames: Record<string, string> = {
  work: "경력",
  research: "연구 경험",
  publication: "논문",
  education: "학력",
  award: "수상",
  milestone: "기타 이력",
  talk: "발표",
  project: "활동",
};
export interface Selection {
  projects: string[];
  records: string[];
}
export const recordId = (entry: EducationEntry) =>
  entry.id ?? `${entry.type}:${entry.degree}:${entry.period}`;
export const availableProjects = (content: PortfolioContent) =>
  content.projects.filter(p => p.status === "published" && !p.private);
export const availableRecords = (content: PortfolioContent) =>
  content.education.filter(e => e.status === "published");
export function recommend(
  content: PortfolioContent,
  purpose: Purpose
): Selection {
  const preferred =
    purpose === "service"
      ? ["music-splitter-web", "smartfarm-rag", "spring-community-board"]
      : ["smartfarm-rag", "mv-evirag", "music-splitter-web"];
  return {
    projects: preferred.filter(id =>
      availableProjects(content).some(p => p.slug === id)
    ),
    records: availableRecords(content).map(recordId),
  };
}
export function moveItem(ids: string[], id: string, delta: number) {
  const index = ids.indexOf(id),
    next = index + delta;
  if (index < 0 || next < 0 || next >= ids.length) return ids;
  const result = [...ids];
  [result[index], result[next]] = [result[next], result[index]];
  return result;
}
export function selectedItems(content: PortfolioContent, selection: Selection) {
  return {
    projects: Array.from(new Set(selection.projects)).flatMap(id =>
      availableProjects(content).filter(p => p.slug === id)
    ),
    records: Array.from(new Set(selection.records)).flatMap(id =>
      availableRecords(content).filter(e => recordId(e) === id)
    ),
  };
}
export interface BodyBlock {
  heading?: string;
  text: string;
}
function plain(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|__|`/g, "")
    .trim();
}
export function bodyBlocks(body: string): BodyBlock[] {
  let heading = "";
  return marked
    .lexer(body)
    .flatMap(token => {
      if (token.type === "heading") {
        heading = plain(token.text);
        return [];
      }
      if (token.type === "paragraph")
        return [{ heading, text: plain(token.text) }];
      if (token.type === "list")
        return token.items.map((item: { text: string }) => ({
          heading,
          text: plain(item.text),
        }));
      return [];
    })
    .filter(b => b.text);
}
export function projectBlocks(project: ProjectEntry, detail: Detail) {
  const blocks = bodyBlocks(project.body);
  if (detail !== "summary") return blocks;
  // Keep role and evidence/limitations even when shortening implementation details.
  return blocks.filter(
    b =>
      /역할|성과|결과|비교|검증|한계/.test(b.heading ?? "") ||
      /시뮬레|심사 중|실제.*아님|탐색|제한/.test(b.text)
  );
}
export function recommendationReason(project: ProjectEntry, purpose: Purpose) {
  if (purpose === "research" && project.focus === "research")
    return "연구 설계·구현·검증 경험을 보여주는 작업입니다.";
  if (purpose === "service" && project.focus === "product")
    return "사용자 기능과 서비스 구현 경험을 보여주는 작업입니다.";
  return project.highlight
    ? "사이트에서 대표 작업으로 선정한 프로젝트입니다."
    : "지원 분야와 연결되는 본인 역할을 확인한 뒤 포함하세요.";
}
