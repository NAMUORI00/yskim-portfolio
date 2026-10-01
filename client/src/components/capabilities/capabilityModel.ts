/*
 * Capability Atlas — presentation model (local design concept)
 * ─────────────────────────────────────────────────────────────
 * 기술 목록(skills.json)과 프로젝트(content/projects/*.mdx)가 원본입니다.
 * 이 파일은 그 원본을 "무엇을 받아 → 어떻게 처리해 → 무엇을 만드는지"로
 * 읽히게 하는 편집 레이어만 담습니다. 각 문장은 연결된 프로젝트 본문에
 * 적힌 사실만 요약하며, 숙련도·수치·성과를 새로 만들지 않습니다.
 */
import type { LucideIcon } from "lucide-react";
import { BrainCircuit, ChartColumn, Cpu, MonitorSmartphone, UsersRound, Workflow } from "lucide-react";
import type { ProjectEntry, SkillGroup } from "@/content";
import type { Locale } from "@/lib/i18nContent";

export type CapabilityId = "ai" | "product" | "data" | "embedded" | "automation" | "leadership";

export interface Localized {
  ko: string;
  en: string;
}

export interface CapabilityFlow {
  input: Localized[];
  work: Localized[];
  output: Localized[];
}

export interface CapabilityDefinition {
  id: CapabilityId;
  icon: LucideIcon;
  /** skills.json 의 원본(한국어) label — 기술 목록을 이 그룹에서 가져옵니다. */
  sourceLabel: string;
  title: Localized;
  summary: Localized;
  flow: CapabilityFlow;
  /** 이 역량을 직접 확인할 수 있는 프로젝트 slug (앞쪽일수록 대표). */
  proofSlugs: string[];
}

export const LANGUAGE_SOURCE_LABEL = "개발에 사용하는 언어";

export const CAPABILITIES: CapabilityDefinition[] = [
  {
    id: "ai",
    icon: BrainCircuit,
    sourceLabel: "문서·영상·음원을 처리하는 AI 개발",
    title: { ko: "AI 연구·개발", en: "AI Research & Development" },
    summary: {
      ko: "문서·영상·음원을 다루는 AI 기능을 설계·구현하고, 기존 방식과 비교 실험한 결과를 논문으로 정리합니다.",
      en: "Designs and implements AI features for documents, video, and audio, compares them with existing approaches, and writes the results up as papers.",
    },
    flow: {
      input: [
        { ko: "업무·공개 문서", en: "Work and public documents" },
        { ko: "다중 시점 감시 영상", en: "Multi-view surveillance video" },
        { ko: "음원 파일", en: "Audio tracks" },
      ],
      work: [
        { ko: "질문에 맞는 검색 조합 선택", en: "Choosing retrieval combinations per question" },
        { ko: "LoRA 학습과 답변·보류 판단", en: "LoRA training with answer / abstain decisions" },
        { ko: "음원 분리 모델 학습 실험", en: "Source-separation training experiments" },
      ],
      output: [
        { ko: "문서 근거 기반 질의응답 기능", en: "Document-grounded question answering" },
        { ko: "기존 방식과의 비교 실험", en: "Comparisons with existing approaches" },
        { ko: "제1저자 논문 (KCI 게재 · IEEE Access 심사 중)", en: "First-author papers (KCI published · IEEE Access under review)" },
      ],
    },
    proofSlugs: ["mv-evirag", "smartfarm-rag", "aerospace-rag", "music-source-separation"],
  },
  {
    id: "product",
    icon: MonitorSmartphone,
    sourceLabel: "웹·서버·모바일 기능 구현",
    title: { ko: "웹·서버·모바일 개발", en: "Web, Backend & Mobile" },
    summary: {
      ko: "화면과 서버 API, 데이터베이스를 연결해 업로드부터 결과 확인까지 이어지는 기능을 구현합니다.",
      en: "Connects interfaces, server APIs, and databases into features that run end to end — from upload to result.",
    },
    flow: {
      input: [
        { ko: "음원·음식 사진 업로드", en: "Audio and food-photo uploads" },
        { ko: "회원·게시글·댓글 입력", en: "Member, post, and comment input" },
        { ko: "편집기에서 쓴 마크다운 글", en: "Markdown written in an editor" },
      ],
      work: [
        { ko: "Spring Boot 서버와 Python FastAPI 연결", en: "Connecting Spring Boot to a Python FastAPI server" },
        { ko: "Spring Security 회원가입·로그인", en: "Signup / login with Spring Security" },
        { ko: "Flutter 화면과 Python 서버 연동", en: "Linking a Flutter UI to a Python server" },
      ],
      output: [
        { ko: "분리된 음원 다운로드", en: "Downloadable separated stems" },
        { ko: "인식 결과에 맞는 영양정보 표시", en: "Nutrition info matched to recognition results" },
        { ko: "게시글 CRUD · GitHub PR 생성 흐름", en: "Post CRUD · GitHub PR creation flow" },
      ],
    },
    proofSlugs: ["music-splitter-web", "food-scan", "spring-community-board", "introduce-cv-page"],
  },
  {
    id: "data",
    icon: ChartColumn,
    sourceLabel: "데이터 정리·분석·시각화",
    title: { ko: "데이터 정리·시각화", en: "Data Preparation & Visualization" },
    summary: {
      ko: "관광·공공데이터를 정리하고 시각화해 팀의 분석과 서비스 화면에 쓰일 수 있게 만듭니다.",
      en: "Cleans and visualizes tourism and public data so it can feed the team's analysis and service screens.",
    },
    flow: {
      input: [
        { ko: "관광·소비 데이터", en: "Tourism and spending data" },
        { ko: "공공데이터포털 지역별 업소 정보", en: "Regional business data from a public portal" },
      ],
      work: [
        { ko: "Python 데이터 전처리", en: "Python data preprocessing" },
        { ko: "시각화와 팀 분석 결과 정리", en: "Visualization and organizing team findings" },
      ],
      output: [
        { ko: "모빌리티 배치 제안서", en: "Mobility placement proposal" },
        { ko: "지도 기반 업소 안내 화면", en: "Map-based business information screen" },
      ],
    },
    proofSlugs: ["tourism-data", "good-price-jeju"],
  },
  {
    id: "embedded",
    icon: Cpu,
    sourceLabel: "센서·장치 제어와 웹 모니터링",
    title: { ko: "임베디드·센서", en: "Embedded & Sensors" },
    summary: {
      ko: "센서·회로·펌웨어로 장치를 동작시키고, 수집한 값을 저장해 웹에서 확인할 수 있게 합니다.",
      en: "Builds devices with sensors, circuits, and firmware, and stores collected readings for web monitoring.",
    },
    flow: {
      input: [
        { ko: "센서 측정값", en: "Sensor readings" },
        { ko: "손가락 움직임", en: "Finger movements" },
      ],
      work: [
        { ko: "회로 구현", en: "Circuit implementation" },
        { ko: "Arduino 펌웨어 작성", en: "Arduino firmware" },
        { ko: "PHP·MySQL 저장 연결", en: "Storage via PHP and MySQL" },
      ],
      output: [
        { ko: "웹 모니터링 화면", en: "Web monitoring screen" },
        { ko: "장갑형 음악 연주 키트", en: "Music-playing glove kit" },
        { ko: "한글시계", en: "Korean word clock" },
      ],
    },
    proofSlugs: ["smart-home-2017", "golden-glove", "hangul-clock"],
  },
  {
    id: "automation",
    icon: Workflow,
    sourceLabel: "개발 환경 구성과 반복 작업 자동화",
    title: { ko: "인프라·자동화", en: "Infrastructure & Automation" },
    summary: {
      ko: "반복되는 설치·설정 작업을 스크립트로 정리하고, AI 코드 검토에 사람이 승인하는 단계를 연결합니다.",
      en: "Turns repetitive installation, setup, and review steps into scripts and workflows that keep a human approval step.",
    },
    flow: {
      input: [
        { ko: "반복되는 서버 설치 절차", en: "Repeated server installation steps" },
        { ko: "외부 AI의 코드 검토 결과", en: "Code reviews from external AI tools" },
        { ko: "편집기에서 작성한 글", en: "Posts written in an editor" },
      ],
      work: [
        { ko: "Shell 설치 스크립트", en: "Shell installation script" },
        { ko: "PowerShell 리뷰 흐름 + 운영자 승인", en: "PowerShell review loop + operator approval" },
        { ko: "GitHub API 연동", en: "GitHub API integration" },
      ],
      output: [
        { ko: "명령어로 실행하는 MediaMTX 설치", en: "MediaMTX setup runnable as commands" },
        { ko: "승인을 거친 교차 리뷰", en: "Approved cross-review" },
        { ko: "변경 검토 요청(PR) 생성", en: "Pull requests for change review" },
      ],
    },
    proofSlugs: ["mediamtx-installer", "cross-review-bridge", "introduce-cv-page"],
  },
  {
    id: "leadership",
    icon: UsersRound,
    sourceLabel: "아이디어 구체화와 팀 개발 진행",
    title: { ko: "기획·팀 리딩", en: "Planning & Team Leadership" },
    summary: {
      ko: "아이디어를 구체적인 기능으로 정리하고, 팀장으로서 주요 개발과 진행 관리를 함께 맡습니다.",
      en: "Shapes ideas into concrete features and, as team lead, takes on core development alongside coordination.",
    },
    flow: {
      input: [
        { ko: "캡스톤·팀 프로젝트 아이디어", en: "Capstone and team project ideas" },
        { ko: "공공데이터 활용 서비스 기획", en: "Service planning with public data" },
      ],
      work: [
        { ko: "아이디어 구체화", en: "Ideation and scoping" },
        { ko: "회로·서버 등 주요 개발", en: "Core development — circuits, servers" },
        { ko: "팀 진행 관리", en: "Team coordination" },
      ],
      output: [
        { ko: "2023 연계 캡스톤 우수상", en: "2023 joint capstone excellence award" },
        { ko: "2022 연계 캡스톤 장려상", en: "2022 joint capstone encouragement award" },
        { ko: "지도 기반 업소 안내 서비스", en: "Map-based business finder service" },
      ],
    },
    proofSlugs: ["golden-glove", "food-scan", "good-price-jeju"],
  },
];

export function pick(text: Localized, locale: Locale): string {
  return locale === "en" ? text.en : text.ko;
}

/** 원본(한국어) skills 순서를 기준으로, 현지화된 skills 에서 같은 위치의 그룹을 찾습니다. */
export function findSkillGroup(sourceSkills: SkillGroup[], localizedSkills: SkillGroup[], sourceLabel: string): SkillGroup | null {
  const index = sourceSkills.findIndex((group) => group.label === sourceLabel);
  if (index < 0) return null;
  return localizedSkills[index] ?? sourceSkills[index] ?? null;
}

export function resolveProofProjects(slugs: string[], projects: ProjectEntry[]): ProjectEntry[] {
  return slugs.flatMap((slug) => {
    const project = projects.find((item) => item.slug === slug && item.status === "published");
    return project ? [project] : [];
  });
}

/** 프로젝트 본문의 "맡은 역할 / My role" 단락을 가져옵니다. 없으면 desc 를 사용합니다. */
export function projectRoleText(project: ProjectEntry): string {
  const role = project.body.match(/## (?:맡은 역할|My role)\s+([^#]+?)(?=\n\s*\n|$)/)?.[1]?.trim();
  return role || project.desc;
}

export function capabilitiesForProject(slug: string): CapabilityDefinition[] {
  return CAPABILITIES.filter((capability) => capability.proofSlugs.includes(slug));
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

/** 기술 항목이 해당 영역의 근거 프로젝트 태그에 실제로 등장하는지 여부. */
export function tagsUsedInProjects(projects: ProjectEntry[]): Set<string> {
  return new Set(projects.flatMap((project) => project.tags.map(normalizeTag)));
}

export function isItemUsed(item: string, used: Set<string>): boolean {
  return used.has(normalizeTag(item));
}
