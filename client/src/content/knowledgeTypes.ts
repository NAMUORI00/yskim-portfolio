import type { Localized } from "@/components/capabilities/capabilityModel";
export type DomainId = "ml" | "retrieval" | "media" | "backend" | "frontend" | "data" | "device" | "infra";

export interface DomainDef {
  id: DomainId;
  /** 지도 위 짧은 이름 */
  label: Localized;
  title: Localized;
  /** 이 묶음이 무엇을 모았는지 (편집상 설명 — 성과가 아님) */
  summary: Localized;
}


export type EvidenceKind = "project" | "research" | "paper" | "work" | "code" | "record" | "site" | "stack";

export interface EvidenceSourceDef {
  id: string;
  kind: EvidenceKind;
  /** 저장소 기준 원문 파일 — 테스트가 quote 를 이 파일들에서 찾습니다 (화면에는 보이지 않음) */
  files: string[];
  /** paper·work: content/education.json 의 원본 degree */
  ref?: string;
  /** code·record·site·stack 의 화면 이름 (project·research·paper·work 는 콘텐츠에서 가져옴) */
  title?: Localized;
  /** 분야를 펼친 층 그림의 근거 칸에 쓰는 짧은 이름 (상태를 바꾸지 않음 — 예: IEEE 원고는 "심사 중") */
  short?: Localized;
  /** paper·work 외의 상태 문구 (project 는 프로젝트 자세히 보기의 상태를 씀) */
  status?: Localized;
  /** 근거를 볼 수 있는 이 사이트 안의 주소 */
  href?: string;
}


export type NodeKind = "tech" | "concept" | "method";
export type ClaimMode = "built" | "studied" | "interest" | "listed";

export interface Claim {
  /** 근거 출처 id (project:<slug> · research:<slug> · EVIDENCE_SOURCES 의 id) */
  source: string;
  /** 원문(한국어)에 그대로 있는 문장 */
  quote: string;
  mode: ClaimMode;
}

export interface KnowledgeNodeDef {
  id: string;
  kind: NodeKind;
  domain: DomainId;
  label: Localized;
  /** 설명 칸의 전체 이름 (없으면 label) */
  title?: Localized;
  /** content/skills.json 에 적힌 이름 — 스택 항목과 짝지을 때 */
  stack?: string;
  /** 무엇인가요 — 일반적인 설명 */
  what: Localized;
  /** 직접 한 일 — 근거 문장에서만 씁니다 (interest·listed 는 공통 문구) */
  did?: Localized;
  claims: Claim[];
}


export type Relation = "uses" | "implements" | "applies" | "supports" | "prerequisite";

export const RELATIONS: readonly Relation[] = ["uses", "implements", "applies", "supports", "prerequisite"];

export interface KnowledgeEdgeDef {
  from: string;
  to: string;
  relation: Relation;
  /** 근거 출처 id */
  source: string;
  /** 원문(한국어)에 그대로 있는 문장 */
  quote: string;
}

