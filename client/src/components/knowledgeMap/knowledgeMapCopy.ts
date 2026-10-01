/* 층위형 지식 지도의 화면 문구 (한국어·영어) */
import type { Locale } from "@/lib/i18nContent";
import type { MapLayer, MapNode } from "./knowledgeMapModel";

export interface MapCopy {
  kicker: string;
  railLabel: string;
  subtitle: string;
  layers: Record<MapLayer, string>;
  groupLabel: (counts: Record<MapLayer, number>) => string;
  hint: string;
  explorerHint: string;
  overviewTitle: string;
  overview: string;
  expand: string;
  expandLabel: string;
  openMap: string;
  pinned: string;
  unpin: string;
  related: {
    research: { down: string; downDeep: string };
    project: { up: string; down: string };
    tech: { up: string; upDeep: string };
  };
  noResearch: string;
  noTech: string;
  usedCount: (count: number) => string;
  locate: Record<MapLayer, string>;
  nodeName: (node: MapNode, up: number, down: number) => string;
  pinAnnounce: (node: MapNode, up: number, down: number) => string;
  unpinAnnounce: string;
  explorerTitle: string;
  explorerDesc: string;
  close: string;
  views: { tilt: string; front: string; list: string };
  viewGroup: string;
  rotateLeft: string;
  rotateRight: string;
  resetAngle: string;
  looseProjects: string;
  emptyMap: string;
}

const KO: MapCopy = {
  kicker: "Knowledge Map",
  railLabel: "포트폴리오 지식 지도",
  subtitle: "연구 질문 → 프로젝트 → 기술",
  layers: { research: "연구 질문", project: "프로젝트", tech: "기술" },
  groupLabel: (counts) => `지식 지도: 연구 질문 ${counts.research}개, 프로젝트 ${counts.project}개, 기술 ${counts.tech}개`,
  hint: "Tab으로 들어가 ←→ 같은 층, ↑↓ 위아래 층으로 옮기고 Enter로 고정, Esc로 풉니다.",
  explorerHint: "끌거나 Shift+화살표로 각도를 바꿉니다.",
  overviewTitle: "세 층으로 읽는 작업",
  overview: "연구 질문을 고르면 그 질문을 뒷받침한 프로젝트와 사용한 기술만 이어서 보여 줍니다. 프로젝트나 기술에서 거슬러 올라갈 수도 있습니다.",
  expand: "넓게 보기",
  expandLabel: "지식 지도 넓게 보기",
  openMap: "지식 지도 열기",
  pinned: "고정됨",
  unpin: "고정 풀기",
  related: {
    research: { down: "근거 프로젝트", downDeep: "사용 기술" },
    project: { up: "연구 질문", down: "사용 기술" },
    tech: { up: "사용한 프로젝트", upDeep: "이어지는 연구 질문" },
  },
  noResearch: "연구 질문과 직접 이어지지 않은 작업입니다.",
  noTech: "기술 스택에 올린 태그가 없습니다.",
  usedCount: (count) => `이 포트폴리오의 프로젝트 ${count}개에서 사용`,
  locate: { research: "연구 분야에서 보기", project: "프로젝트 목록에서 보기", tech: "기술 스택에서 보기" },
  nodeName: (node, up, down) => {
    if (node.layer === "research") return `${node.title} — 연구 질문, 근거 프로젝트 ${down}개`;
    if (node.layer === "project") return `${node.title} — 프로젝트, 연구 질문 ${up}개, 기술 ${down}개`;
    return `${node.title} — 기술, 프로젝트 ${up}개에서 사용`;
  },
  pinAnnounce: (node, up, down) => {
    if (node.layer === "research") return `${node.label} 고정: 근거 프로젝트 ${down}개`;
    if (node.layer === "project") return `${node.label} 고정: 연구 질문 ${up}개, 기술 ${down}개`;
    return `${node.label} 고정: 프로젝트 ${up}개`;
  },
  unpinAnnounce: "고정을 풀었습니다",
  explorerTitle: "지식 지도 — 연구 질문에서 기술까지",
  explorerDesc: "위에서부터 연구 질문, 그 질문을 뒷받침한 프로젝트, 프로젝트에서 사용한 기술을 겹친 층으로 놓았습니다.",
  close: "닫기",
  views: { tilt: "기울여 보기", front: "정면 보기", list: "목록" },
  viewGroup: "보기 방식",
  rotateLeft: "왼쪽으로 돌리기",
  rotateRight: "오른쪽으로 돌리기",
  resetAngle: "처음 각도",
  looseProjects: "연구 질문과 직접 이어지지 않은 프로젝트",
  emptyMap: "지도에 놓을 연구 질문과 프로젝트가 아직 없습니다.",
};

const EN: MapCopy = {
  kicker: "Knowledge Map",
  railLabel: "Portfolio knowledge map",
  subtitle: "Research → projects → technologies",
  layers: { research: "Research", project: "Projects", tech: "Stack" },
  groupLabel: (counts) =>
    `Knowledge map: ${counts.research} research questions, ${counts.project} projects, ${counts.tech} technologies`,
  hint: "Tab in, then use ←→ within a layer and ↑↓ across layers. Enter pins, Esc clears.",
  explorerHint: "Drag or use Shift+arrows to change the angle.",
  overviewTitle: "Work in three layers",
  overview: "Pick a research question to trace only the projects that support it and the tools they used. You can also trace upward from a project or a technology.",
  expand: "Wide view",
  expandLabel: "Open the knowledge map in a wide view",
  openMap: "Open the knowledge map",
  pinned: "Pinned",
  unpin: "Unpin",
  related: {
    research: { down: "Supporting projects", downDeep: "Technologies used" },
    project: { up: "Research questions", down: "Technologies used" },
    tech: { up: "Used in projects", upDeep: "Leads to research" },
  },
  noResearch: "Not directly tied to a research question.",
  noTech: "No tags from the technology stack.",
  usedCount: (count) => `Used in ${count} ${count === 1 ? "project" : "projects"} in this portfolio`,
  locate: { research: "Show in research interests", project: "Show in the project list", tech: "Show in the technology stack" },
  nodeName: (node, up, down) => {
    if (node.layer === "research") return `${node.title} — research question, ${down} supporting ${down === 1 ? "project" : "projects"}`;
    if (node.layer === "project") return `${node.title} — project, ${up} research ${up === 1 ? "question" : "questions"}, ${down} technologies`;
    return `${node.title} — technology, used in ${up} ${up === 1 ? "project" : "projects"}`;
  },
  pinAnnounce: (node, up, down) => {
    if (node.layer === "research") return `${node.label} pinned: ${down} supporting projects`;
    if (node.layer === "project") return `${node.label} pinned: ${up} research questions, ${down} technologies`;
    return `${node.label} pinned: used in ${up} projects`;
  },
  unpinAnnounce: "Unpinned",
  explorerTitle: "Knowledge map — from research to technologies",
  explorerDesc: "Stacked from the top: research questions, the projects that support them, and the technologies those projects used.",
  close: "Close",
  views: { tilt: "Tilted", front: "Front", list: "List" },
  viewGroup: "View",
  rotateLeft: "Rotate left",
  rotateRight: "Rotate right",
  resetAngle: "Reset angle",
  looseProjects: "Projects not tied to a research question",
  emptyMap: "There are no research questions or projects to place yet.",
};

export function mapCopy(locale: Locale): MapCopy {
  return locale === "en" ? EN : KO;
}
