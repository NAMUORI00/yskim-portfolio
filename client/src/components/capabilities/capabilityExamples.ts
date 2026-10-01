/*
 * 영역별 "흐름 예시" — 한 프로젝트에서 실제로 구현한 경로만 요약합니다.
 * 각 예시는 서로 다른 프로젝트이며 하나의 시스템으로 이어지지 않습니다.
 * 문장은 연결된 프로젝트 본문(content/projects/*.mdx)의 사실만 사용합니다.
 */
import type { CapabilityId, Localized } from "./capabilityModel";

export interface FlowExample {
  slug: string;
  source: Localized[];
  work: Localized[];
  result: Localized[];
  /** [입력→처리, 처리→결과] 연결선 라벨 */
  links: [Localized, Localized];
}

const t = (ko: string, en: string): Localized => ({ ko, en });

export const FLOW_EXAMPLES: Record<CapabilityId, FlowExample[]> = {
  ai: [
    {
      slug: "smartfarm-rag",
      source: [t("사용자 질문", "User question"), t("공개 문서", "Public documents")],
      work: [t("단어·의미·관계 검색 결합", "Combined keyword, semantic and relation search"), t("질문에 맞는 검색 조합 선택", "Retrieval mix chosen per question")],
      result: [t("문서 근거를 담은 AI 답변", "AI answer grounded in documents"), t("기존 방식 비교 · KCI 논문 게재", "Baseline comparison · KCI paper")],
      links: [t("질문 특징", "question features"), t("검색된 근거", "retrieved evidence")],
    },
    {
      slug: "mv-evirag",
      source: [t("질문", "Question"), t("여러 카메라 영상", "Multi-camera video")],
      work: [t("살펴볼 영상 선택", "Selecting which video to inspect"), t("LoRA 학습으로 답변 가능 여부 판단", "LoRA-trained answerability check")],
      result: [t("답변 또는 보류", "Answer or abstain"), t("IEEE Access 심사 중 · 제1저자", "IEEE Access under review · first author")],
      links: [t("선택된 영상", "selected video"), t("판단 결과", "decision")],
    },
    {
      slug: "aerospace-rag",
      source: [t("항공우주 업무 문서", "Aerospace work documents"), t("질문", "Question")],
      work: [t("Qdrant·BM25·Graph 검색", "Qdrant · BM25 · graph search")],
      result: [t("Ollama 답변 생성", "Answer generated with Ollama")],
      links: [t("문서 색인", "indexed documents"), t("관련 문서", "relevant passages")],
    },
  ],
  product: [
    {
      slug: "music-splitter-web",
      source: [t("음원 업로드", "Audio upload")],
      work: [t("Spring Boot 서버 · 로그인", "Spring Boot server · login"), t("FastAPI · Spleeter 분리", "FastAPI · Spleeter separation")],
      result: [t("5개 음원 다운로드", "Five separated stems to download")],
      links: [t("파일 전달", "file"), t("분리 결과", "separated stems")],
    },
    {
      slug: "food-scan",
      source: [t("Flutter 앱에서 음식 촬영", "Food photo in a Flutter app")],
      work: [t("Python FastAPI 서버", "Python FastAPI server"), t("Google Vision API 인식", "Google Vision API recognition")],
      result: [t("인식 결과에 맞는 영양정보", "Nutrition info for the result")],
      links: [t("이미지 전송", "image"), t("인식 결과", "recognized food")],
    },
    {
      slug: "js-quiz-app",
      source: [t("JSON 문제 파일", "JSON question file")],
      work: [t("Vue 화면에서 순서 섞기·채점", "Shuffle and scoring in Vue")],
      result: [t("오답 복습", "Review of wrong answers")],
      links: [t("문제 불러오기", "load questions"), t("오답 기록", "wrong answers")],
    },
  ],
  data: [
    {
      slug: "tourism-data",
      source: [t("관광·소비 데이터", "Tourism and spending data")],
      work: [t("Python 전처리", "Python preprocessing"), t("시각화", "Visualization")],
      result: [t("모빌리티 배치 제안서", "Mobility placement proposal")],
      links: [t("정리", "cleaning"), t("팀 분석", "team analysis")],
    },
    {
      slug: "good-price-jeju",
      source: [t("공공데이터 지역별 업소 정보", "Regional business data (public portal)")],
      work: [t("지역별 업소 정보 활용", "Using regional business records"), t("지도 API · JavaScript 웹 화면", "Map API · JavaScript web view")],
      result: [t("지도 기반 업소 안내 화면", "Map-based business finder")],
      links: [t("업소 목록", "business list"), t("위치 표시", "map markers")],
    },
  ],
  embedded: [
    {
      slug: "smart-home-2017",
      source: [t("센서", "Sensors")],
      work: [t("Arduino 수집 펌웨어", "Arduino collection firmware"), t("PHP·MySQL 저장", "PHP · MySQL storage")],
      result: [t("웹 모니터링 화면", "Web monitoring screen")],
      links: [t("측정값", "readings"), t("저장된 값", "stored values")],
    },
    {
      slug: "golden-glove",
      source: [t("손가락 움직임", "Finger movement")],
      work: [t("회로 구현", "Circuit"), t("Arduino(C++) 펌웨어", "Arduino (C++) firmware")],
      result: [t("장갑형 음악 연주 키트", "Music-playing glove kit")],
      links: [t("센서 읽기", "sensor reading"), t("통신", "communication")],
    },
  ],
  automation: [
    {
      slug: "mediamtx-installer",
      source: [t("반복되는 설치 절차", "Repeated install steps")],
      work: [t("Shell 스크립트 (Ubuntu 24.04)", "Shell script (Ubuntu 24.04)")],
      result: [t("명령어로 실행하는 MediaMTX 설치", "MediaMTX setup run as commands")],
      links: [t("절차 정리", "steps"), t("명령 실행", "run")],
    },
    {
      slug: "cross-review-bridge",
      source: [t("외부 AI의 코드 검토 결과", "Code review from an external AI")],
      work: [t("PowerShell 리뷰 흐름", "PowerShell review loop"), t("운영자 승인", "Operator approval")],
      result: [t("개발 작업에 연결된 교차 리뷰", "Cross-review linked to the work")],
      links: [t("검토 의견", "review comments"), t("승인된 의견", "approved items")],
    },
    {
      slug: "introduce-cv-page",
      source: [t("편집기에서 쓴 마크다운 글", "Markdown written in an editor")],
      work: [t("GitHub API 연동", "GitHub API integration")],
      result: [t("변경 검토 요청(PR)", "Pull request for review")],
      links: [t("저장 요청", "save"), t("변경 생성", "change")],
    },
  ],
  leadership: [
    {
      slug: "golden-glove",
      source: [t("캡스톤 아이디어", "Capstone idea")],
      work: [t("팀장 · 아이디어 구체화", "Team lead · scoping"), t("회로·펌웨어 개발 · 진행 관리", "Circuit/firmware work · coordination")],
      result: [t("2023 연계 캡스톤 우수상", "2023 joint capstone excellence award")],
      links: [t("구체화", "scoping"), t("팀 개발", "team build")],
    },
    {
      slug: "food-scan",
      source: [t("캡스톤 아이디어", "Capstone idea")],
      work: [t("팀장 · 주요 개발", "Team lead · core development"), t("Python 서버와 Flutter 화면 연결", "Linking Python server and Flutter UI")],
      result: [t("2022 연계 캡스톤 장려상", "2022 joint capstone encouragement award")],
      links: [t("구체화", "scoping"), t("팀 개발", "team build")],
    },
  ],
};

/** 영역별 관련 프로젝트에 더해 보여줄 소프트웨어 예시(기존 proofSlugs 에 없는 항목). */
export const EXTRA_RELATED_SLUGS: Partial<Record<CapabilityId, string[]>> = {
  product: ["js-quiz-app", "unity-hackathon"],
};
