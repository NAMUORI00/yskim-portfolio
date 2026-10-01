/*
 * 프로젝트별 아키텍처 흐름 (홈 프로젝트 자세히 보기의 작은 도식과 넓게 보기)
 * 각 도식은 해당 프로젝트 본문(content/projects/<slug>.mdx)에 적힌 구성 요소만 사용합니다.
 * 본문이 짧은 프로젝트는 scope: "overview" 로 표시하고, 적혀 있지 않은
 * 데이터베이스·API·프레임워크를 덧붙이지 않습니다.
 * 도식은 직선 흐름입니다: edges[i] 는 nodes[i] → nodes[i+1] 사이에 오가는 것을 적습니다.
 */
import type { CapabilityId, Localized } from "./capabilityModel";

export type LaneId =
  | "user"
  | "ai"
  | "server"
  | "data"
  | "field"
  | "sim"
  | "tool"
  | "operator"
  | "external"
  | "mywork"
  | "team"
  | "outcome";

export const LANES: Record<LaneId, { ko: string; en: string }> = {
  user: { ko: "사용자 화면", en: "User screen" },
  ai: { ko: "AI·모델", en: "AI / model" },
  server: { ko: "서버·저장", en: "Server / storage" },
  data: { ko: "데이터·문서", en: "Data / documents" },
  field: { ko: "현장·장치", en: "Field / device" },
  sim: { ko: "시뮬레이션 환경", en: "Simulation" },
  tool: { ko: "스크립트·도구", en: "Script / tooling" },
  operator: { ko: "운영자", en: "Operator" },
  external: { ko: "외부 서비스", en: "External service" },
  mywork: { ko: "내 작업", en: "My work" },
  team: { ko: "팀 작업", en: "Team work" },
  outcome: { ko: "결과", en: "Outcome" },
};

export interface ArchNode {
  id: string;
  lane: LaneId;
  label: Localized;
  /** 도식 상자가 좁을 때 쓰는 짧은 이름 (없으면 label) */
  box?: Localized;
  tech?: string[];
  detail: Localized;
}

export interface ArchDiagram {
  title?: Localized;
  caption?: Localized;
  lanes: LaneId[];
  nodes: ArchNode[];
  /** edges[i]: nodes[i] → nodes[i+1] 로 전달되는 것 */
  edges: Localized[];
}

export interface ProjectArchitecture {
  slug: string;
  purpose: Localized;
  scope: "detailed" | "overview";
  diagrams: ArchDiagram[];
  note?: Localized;
}

const t = (ko: string, en: string): Localized => ({ ko, en });

/** 영역별 프로젝트 (한 영역 안에서는 중복 없음, 영역 사이에는 겹칠 수 있음) */
export const AREA_PROJECTS: Record<CapabilityId, string[]> = {
  ai: ["mv-evirag", "smartfarm-rag", "aerospace-rag", "music-source-separation"],
  product: ["music-splitter-web", "food-scan", "spring-community-board", "introduce-cv-page", "js-quiz-app", "good-price-jeju", "unity-hackathon"],
  data: ["tourism-data", "good-price-jeju"],
  embedded: ["smart-home-2017", "golden-glove", "hangul-clock"],
  automation: ["mediamtx-installer", "cross-review-bridge", "introduce-cv-page"],
  leadership: ["golden-glove", "food-scan", "good-price-jeju"],
};

export const ARCHITECTURES: Record<string, ProjectArchitecture> = {
  "mv-evirag": {
    slug: "mv-evirag",
    purpose: t("여러 카메라 영상으로 답할지·보류할지 단계별로 판단", "Deciding, stage by stage, whether to answer or abstain from multi-camera video"),
    scope: "detailed",
    diagrams: [
      {
        lanes: ["field", "ai", "outcome"],
        nodes: [
          {
            id: "input",
            lane: "field",
            label: t("질문 + 여러 카메라 영상", "Question + multi-camera video"),
            detail: t(
              "질문과 여러 카메라에서 얻은 영상이 함께 들어옵니다. 평가에는 관심 영역을 제공한 입력과 규칙으로 정한 정보 가용성 조건을 사용했습니다.",
              "A question arrives together with video from several cameras. Evaluation used inputs with given regions of interest and rule-defined information-availability conditions.",
            ),
          },
          {
            id: "select",
            lane: "ai",
            label: t("살펴볼 영상 선택", "Select which video to inspect"),
            detail: t(
              "어떤 영상을 살펴볼지 먼저 정합니다. 관련 인물이 보여도 행동 판단에 필요한 부분이 가려질 수 있어, 영상 선택을 답변 여부와 같은 판단으로 다루지 않았습니다.",
              "First decides which video to look at. A relevant person may be visible while the part needed to judge the action is occluded, so video selection is not treated as the same decision as answerability.",
            ),
          },
          {
            id: "answerable",
            lane: "ai",
            label: t("답할 수 있는지 판단", "Judge answerability"),
            tech: ["PyTorch", "LoRA"],
            detail: t(
              "선택된 영상으로 답할 수 있는지 판단합니다. 답변에 필요한 정보가 있는 입력과 없는 입력을 함께 LoRA로 학습했습니다.",
              "Judges whether the selected video can support an answer. Inputs with and without the needed information were trained together using LoRA.",
            ),
          },
          {
            id: "release",
            lane: "ai",
            label: t("확신도로 제공 여부 결정", "Decide release by confidence"),
            detail: t(
              "답변을 생성한 뒤, 응답의 확신도를 바탕으로 그 답변을 제공할지 정합니다.",
              "After an answer is generated, its confidence decides whether the answer is released.",
            ),
          },
          {
            id: "result",
            lane: "outcome",
            label: t("답변 제공 또는 보류", "Answer or abstain"),
            detail: t(
              "답한 질문의 수와 잘못된 답변의 수를 함께 평가했고, 비교 결과를 제1저자 논문으로 정리했습니다.",
              "Evaluation looked at how many questions were answered together with how many answers were wrong; the comparison was written up as a first-author paper.",
            ),
          },
        ],
        edges: [t("질문·영상 후보", "question · candidate videos"), t("선택된 영상", "selected video"), t("생성된 답변", "generated answer"), t("제공 / 보류", "release / abstain")],
      },
    ],
  },

  "smartfarm-rag": {
    slug: "smartfarm-rag",
    purpose: t("질문 특징에 맞춰 문서 검색 조합을 고르는 질의응답", "Question answering that picks a retrieval mix to fit each question"),
    scope: "detailed",
    diagrams: [
      {
        title: t("질의응답 연구", "Question-answering research"),
        lanes: ["user", "ai", "data", "outcome"],
        nodes: [
          {
            id: "question",
            lane: "user",
            label: t("질문", "Question"),
            detail: t("사용자의 질문에서 시작합니다.", "Starts from the user's question."),
          },
          {
            id: "route",
            lane: "ai",
            label: t("검색 조합 선택", "Choose retrieval mix"),
            detail: t(
              "질문의 특징에 따라 적합한 검색 조합을 고릅니다. 검색 조합의 사전 비교 결과를 활용해, 검색 비율을 정하기 위한 추가 AI 호출을 대체했습니다.",
              "Picks a suitable retrieval mix from the question's features. Prior comparisons of retrieval mixes replace an extra AI call that would otherwise set the retrieval ratio.",
            ),
          },
          {
            id: "retrieve",
            lane: "data",
            label: t("단어·의미·관계 검색", "Keyword · semantic · relation search"),
            box: t("단어·의미·관계 검색", "Combined search"),
            detail: t("문서의 단어, 의미, 정보 간 관계를 활용하는 검색 방식을 결합합니다.", "Combines retrieval that uses a document's words, meaning, and the relations between pieces of information."),
          },
          {
            id: "generate",
            lane: "ai",
            label: t("AI 답변 생성", "AI answer generation"),
            tech: ["RAG"],
            detail: t("검색된 문서 근거를 바탕으로 답변을 생성합니다. 이렇게 검색과 답변 생성을 잇는 방식을 RAG라고 합니다.", "Generates the answer from the retrieved evidence — linking retrieval and generation this way is called RAG."),
          },
          {
            id: "answer",
            lane: "outcome",
            label: t("문서 근거를 담은 답변", "Evidence-grounded answer"),
            detail: t("공개 자료로 기존 검색 방식과 비교 실험을 했고, 관련 연구를 KCI 논문으로 게재했습니다.", "Compared against existing retrieval methods on public data; the related study was published in a KCI journal."),
          },
        ],
        edges: [t("질문의 특징", "question features"), t("선택된 검색 조합", "chosen mix"), t("검색된 근거", "retrieved evidence"), t("답변", "answer")],
      },
      {
        title: t("운영 지원 흐름 (시뮬레이션)", "Operations support (simulation)"),
        caption: t(
          "이 운영 흐름은 시뮬레이션 환경에서 검증했습니다. 실제 농장 설비를 제어한 것이 아닙니다.",
          "This operating flow was validated in a simulation environment. It does not control real farm equipment.",
        ),
        lanes: ["sim", "ai", "operator"],
        nodes: [
          {
            id: "observe",
            lane: "sim",
            label: t("관측 정보", "Observations"),
            detail: t("시뮬레이션 환경의 관측 정보가 흐름의 출발점입니다.", "Observations from the simulation environment start the flow."),
          },
          {
            id: "explain",
            lane: "ai",
            label: t("문서 근거 + AI 설명", "Document evidence + AI explanation"),
            box: t("문서 근거 + AI 설명", "Evidence + explanation"),
            detail: t("관측 정보에 문서 근거와 AI 설명을 연결합니다.", "Links the observations to document evidence and an AI explanation."),
          },
          {
            id: "approve",
            lane: "operator",
            label: t("운영자 승인", "Operator approval"),
            detail: t("실행 전에 운영자가 승인하는 단계를 둡니다.", "An operator approval step comes before anything is executed."),
          },
          {
            id: "verify",
            lane: "sim",
            label: t("실행 결과 확인", "Check execution result"),
            box: t("실행 결과 확인", "Check the result"),
            detail: t("승인 후 실행 결과를 시뮬레이션 환경에서 확인합니다.", "After approval, the execution result is checked in the simulation environment."),
          },
        ],
        edges: [t("관측 정보", "observations"), t("근거·설명", "evidence · explanation"), t("승인", "approval")],
      },
    ],
  },

  "aerospace-rag": {
    slug: "aerospace-rag",
    purpose: t("항공우주 업무 문서를 세 가지 검색으로 찾아 답변에 활용", "Three retrieval channels over aerospace work documents, feeding answers"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["user", "data", "ai"],
        nodes: [
          { id: "q", lane: "user", label: t("질문", "Question"), detail: t("업무 문서에 대한 질문입니다.", "A question about the work documents.") },
          {
            id: "search",
            lane: "data",
            label: t("Dense · Sparse · Graph 검색", "Dense · sparse · graph retrieval"),
            tech: ["Qdrant", "BM25", "Graph"],
            detail: t(
              "항공우주 업무 문서를 대상으로 의미(Dense·Qdrant), 단어(Sparse·BM25), 정보 관계(Graph)를 활용하는 세 검색 채널을 조합합니다.",
              "Combines three channels over the aerospace documents: meaning (dense · Qdrant), words (sparse · BM25), and relations (graph).",
            ),
          },
          {
            id: "gen",
            lane: "ai",
            label: t("Ollama 답변 생성", "Answer generation with Ollama"),
            tech: ["Ollama", "LLM"],
            detail: t("찾은 문서 내용을 AI 답변 생성에 활용합니다.", "Uses the retrieved passages to generate the AI answer."),
          },
        ],
        edges: [t("질문", "question"), t("관련 문서 내용", "relevant passages")],
      },
    ],
  },

  "music-source-separation": {
    slug: "music-source-separation",
    purpose: t("보컬·악기 분리 모델의 학습 실험과 조건 관리", "Training experiments and condition management for vocal/instrument separation"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["tool", "ai", "outcome"],
        nodes: [
          { id: "cfg", lane: "tool", label: t("Hydra 설정 파일", "Hydra config files"), tech: ["Hydra"], detail: t("설정 파일로 실험 조건을 관리합니다.", "Experiment conditions are managed through config files.") },
          {
            id: "train",
            lane: "ai",
            label: t("기존 분리 모델 학습", "Training an existing separation model"),
            tech: ["PyTorch", "CUDA"],
            detail: t("보컬과 악기를 분리하는 기존 AI 모델을 GPU 학습 환경에서 학습합니다.", "Trains an existing vocal/instrument separation model in a GPU environment."),
          },
          { id: "exp", lane: "outcome", label: t("조건별 학습 실험", "Experiments per condition"), detail: t("설정에 따라 나뉜 학습 실험입니다.", "Training runs separated by configuration.") },
        ],
        edges: [t("실험 조건", "experiment conditions"), t("학습 실행", "training runs")],
      },
    ],
  },

  "music-splitter-web": {
    slug: "music-splitter-web",
    purpose: t("음원 업로드 → AI 5개 음원 분리 → 다운로드 웹 서비스", "Upload audio → AI five-stem separation → download"),
    scope: "detailed",
    note: t("학부 프로젝트로 로컬 환경에서 실행하는 웹 서비스입니다.", "An undergraduate web service run in a local environment."),
    diagrams: [
      {
        lanes: ["user", "server", "ai"],
        nodes: [
          { id: "upload", lane: "user", label: t("회원가입·로그인 후 음원 업로드", "Sign in, then upload audio"), detail: t("웹 화면에서 로그인하고 음원 파일을 올립니다.", "The user signs in on the web page and uploads an audio file.") },
          {
            id: "spring",
            lane: "server",
            label: t("Spring Boot 웹 서버", "Spring Boot web server"),
            tech: ["Java", "Spring Boot", "Spring Security"],
            detail: t("Spring Security로 회원가입·로그인을 처리하고, 업로드한 파일을 Python 서버로 넘깁니다.", "Handles signup/login with Spring Security and hands the uploaded file to the Python server."),
          },
          {
            id: "fastapi",
            lane: "ai",
            label: t("FastAPI 서버 · Spleeter 분리", "FastAPI server · Spleeter separation"),
            tech: ["Python", "FastAPI", "Spleeter"],
            detail: t("기존 Spleeter 모델로 음원을 보컬·악기 등 5개로 분리합니다.", "Splits the track into five stems (vocals, instruments, …) with the existing Spleeter model."),
          },
          { id: "download", lane: "user", label: t("분리 결과 다운로드", "Download separated stems"), detail: t("분리된 음원을 내려받습니다.", "The separated stems are downloaded.") },
        ],
        edges: [t("음원 파일", "audio file"), t("분리 요청", "separation request"), t("분리된 5개 음원", "five separated stems")],
      },
    ],
  },

  "food-scan": {
    slug: "food-scan",
    purpose: t("음식 사진을 인식해 영양정보를 보여주는 모바일 앱", "Mobile app showing nutrition info from a food photo"),
    scope: "detailed",
    diagrams: [
      {
        lanes: ["user", "server", "ai", "data"],
        nodes: [
          {
            id: "shoot",
            lane: "user",
            label: t("앱에서 음식 촬영", "Take a food photo in the app"),
            box: t("앱에서 촬영", "Photo in the app"),
            tech: ["Flutter", "Dart"],
            detail: t("Flutter 앱 화면에서 음식을 촬영합니다.", "The food is photographed in the Flutter app."),
          },
          { id: "server", lane: "server", label: t("Python 서버", "Python server"), tech: ["Python", "FastAPI"], detail: t("앱이 보낸 사진을 받아 인식 결과를 돌려줍니다.", "Receives the photo from the app and returns the recognition result.") },
          { id: "vision", lane: "ai", label: t("음식 인식", "Food recognition"), box: t("음식 인식", "Recognition"), tech: ["Google Vision API"], detail: t("Google Vision API로 사진 속 음식을 인식합니다.", "Recognizes the food in the photo with the Google Vision API.") },
          { id: "choose", lane: "user", label: t("음식 선택", "Pick the food"), detail: t("인식 결과 중에서 음식을 선택합니다.", "The user picks a food from the recognition result.") },
          { id: "db", lane: "data", label: t("영양정보 데이터베이스", "Nutrition database"), box: t("영양정보 DB", "Nutrition DB"), detail: t("선택한 음식의 영양정보를 데이터베이스에서 불러옵니다.", "Nutrition info for the chosen food is loaded from a database.") },
          { id: "show", lane: "user", label: t("영양정보 표시", "Show nutrition info"), box: t("영양정보 표시", "Nutrition shown"), detail: t("앱 화면에 영양정보를 보여줍니다.", "The app displays the nutrition info.") },
        ],
        edges: [t("음식 사진", "food photo"), t("이미지", "image"), t("인식 결과", "recognition result"), t("선택한 음식", "chosen food"), t("영양정보", "nutrition info")],
      },
    ],
  },

  "spring-community-board": {
    slug: "spring-community-board",
    purpose: t("회원·게시글·댓글 CRUD 웹 게시판", "Member, post, and comment CRUD board"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["user", "server"],
        nodes: [
          { id: "ui", lane: "user", label: t("회원·게시글·댓글 화면", "Member / post / comment pages"), detail: t("회원 관리와 게시글·댓글 등록, 조회, 수정, 삭제를 요청합니다.", "Requests member management and post/comment create, read, update, delete.") },
          { id: "app", lane: "server", label: t("Spring Boot 서버", "Spring Boot server"), tech: ["Java", "Spring Boot"], detail: t("CRUD 기능을 처리하는 서버입니다.", "The server handling the CRUD features.") },
          { id: "db", lane: "server", label: t("JPA · 데이터베이스", "JPA · database"), tech: ["JPA"], detail: t("JPA로 서버와 데이터베이스를 연결합니다.", "JPA connects the server to the database.") },
        ],
        edges: [t("등록·조회·수정·삭제", "create · read · update · delete"), t("엔티티 저장·조회", "entity persistence")],
      },
    ],
  },

  "introduce-cv-page": {
    slug: "introduce-cv-page",
    purpose: t("편집기에서 쓴 글을 GitHub PR로 연결하는 블로그·이력서", "Blog/CV that turns editor posts into GitHub pull requests"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["user", "external"],
        nodes: [
          { id: "editor", lane: "user", label: t("마크다운 편집기", "Markdown editor"), tech: ["TypeScript", "Next.js", "React"], detail: t("블로그·이력서 글을 편집기에서 작성합니다.", "Blog and CV posts are written in the editor.") },
          { id: "api", lane: "external", label: t("GitHub API", "GitHub API"), tech: ["GitHub API"], detail: t("작성한 글을 GitHub API로 넘깁니다.", "The written post is passed to the GitHub API.") },
          { id: "pr", lane: "external", label: t("변경 검토 요청(PR)", "Pull request for review"), detail: t("글이 PR로 만들어져, 검토를 거쳐 발행되는 흐름을 실험했습니다.", "The post becomes a PR, experimenting with a review-then-publish flow.") },
        ],
        edges: [t("작성한 글", "written post"), t("PR 생성", "create PR")],
      },
    ],
  },

  "js-quiz-app": {
    slug: "js-quiz-app",
    purpose: t("4지선다 퀴즈와 오답 복습 웹 앱", "Multiple-choice quiz with wrong-answer review"),
    scope: "detailed",
    diagrams: [
      {
        lanes: ["data", "user"],
        nodes: [
          { id: "json", lane: "data", label: t("JSON 문제 파일", "JSON question file"), tech: ["JSON"], detail: t("문제는 JSON 파일에 담겨 있습니다.", "Questions live in a JSON file.") },
          { id: "show", lane: "user", label: t("순서를 섞어 문제 표시", "Show shuffled questions"), tech: ["Vue", "Vite", "JavaScript"], detail: t("문제를 읽어 순서를 섞어 보여주고, 시작·재시작을 지원합니다.", "Reads the questions, shows them shuffled, and supports start/restart.") },
          { id: "score", lane: "user", label: t("채점 · 정답 수 관리", "Scoring · correct count"), detail: t("정답 수와 오답을 관리합니다.", "Tracks the number of correct answers and the wrong ones.") },
          { id: "review", lane: "user", label: t("오답 복습", "Wrong-answer review"), detail: t("틀린 문제를 다시 확인합니다.", "Lets the user revisit the questions they missed.") },
        ],
        edges: [t("문제 목록", "questions"), t("선택한 답", "chosen answers"), t("틀린 문제", "missed questions")],
      },
    ],
  },

  "good-price-jeju": {
    slug: "good-price-jeju",
    purpose: t("공공데이터와 지도로 착한가격업소 안내", "Finding good-price businesses with public data and maps"),
    scope: "overview",
    note: t("모바일 화면과 챗봇 구성은 프로젝트 자료에 함께 정리되어 있으며, 이 도식에는 웹 화면 흐름만 담았습니다.", "Mobile screens and a chatbot design are also in the project materials; this diagram shows only the web flow."),
    diagrams: [
      {
        lanes: ["data", "user"],
        nodes: [
          { id: "open", lane: "data", label: t("공공데이터포털 지역별 업소 정보", "Regional business data (public data portal)"), tech: ["공공데이터"], detail: t("공공데이터포털의 지역별 착한가격업소 정보를 활용합니다.", "Uses regional good-price business records from the public data portal.") },
          { id: "map", lane: "user", label: t("지도 기반 웹 화면", "Map-based web page"), tech: ["JavaScript", "지도 API"], detail: t("지도 위에서 업소 정보를 확인하도록 구성했습니다.", "Business info is browsed on a map.") },
        ],
        edges: [t("업소 정보", "business records")],
      },
    ],
  },

  "unity-hackathon": {
    slug: "unity-hackathon",
    purpose: t("AR·VR 해커톤에서 팀으로 만든 Unity 게임", "Unity game built as a team at an AR/VR hackathon"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["team", "outcome"],
        nodes: [
          { id: "team", lane: "team", label: t("다른 대학 학생들과 팀 구성", "Team with students from other universities"), detail: t("해커톤에서 팀을 꾸려 게임 제작에 참여했습니다.", "Formed a team at the hackathon and took part in building the game.") },
          { id: "build", lane: "team", label: t("Unity 게임 제작", "Building the game in Unity"), tech: ["Unity"], detail: t("해커톤 기간 동안 Unity로 팀 프로젝트를 진행했습니다.", "The team project was built in Unity during the hackathon.") },
          { id: "game", lane: "outcome", label: t("해커톤 게임 · 장려상", "Hackathon game · encouragement award"), detail: t("2017 AR·VR 해커톤 장려상", "2017 AR/VR hackathon encouragement award") },
        ],
        edges: [t("팀 구성", "team formed"), t("완성한 게임", "finished game")],
      },
    ],
  },

  "tourism-data": {
    slug: "tourism-data",
    purpose: t("관광·소비 데이터 분석으로 모빌리티 배치 제안", "Mobility placement proposal from tourism and spending data"),
    scope: "detailed",
    diagrams: [
      {
        lanes: ["data", "mywork", "team", "outcome"],
        nodes: [
          { id: "raw", lane: "data", label: t("관광·소비 데이터", "Tourism and spending data"), detail: t("분석에 쓴 원자료입니다.", "The raw data used for the analysis.") },
          { id: "prep", lane: "mywork", label: t("전처리 · 시각화", "Preprocessing · visualization"), tech: ["Python"], detail: t("Python으로 데이터를 정리하고 시각화했습니다 (담당 부분).", "Cleaned and visualized the data in Python (my part).") },
          { id: "team", lane: "team", label: t("군집화·예측 분석", "Clustering · forecasting"), detail: t("팀원들이 수행한 분석입니다.", "Analysis carried out by teammates.") },
          { id: "proposal", lane: "outcome", label: t("모빌리티 배치 제안서", "Mobility placement proposal"), detail: t("팀 분석 결과를 제안서로 정리했습니다.", "The team's findings were organized into the proposal.") },
        ],
        edges: [t("원자료", "raw data"), t("정리된 데이터·시각화", "cleaned data · charts"), t("분석 결과", "findings")],
      },
    ],
  },

  "smart-home-2017": {
    slug: "smart-home-2017",
    purpose: t("센서 데이터를 저장하고 웹에서 확인하는 모니터링", "Storing sensor data and monitoring it on the web"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["field", "server", "user"],
        nodes: [
          { id: "sensor", lane: "field", label: t("센서", "Sensors"), detail: t("장치에 연결된 센서가 값을 측정합니다.", "Sensors attached to the device take measurements.") },
          { id: "arduino", lane: "field", label: t("Arduino 수집 펌웨어", "Arduino collection firmware"), tech: ["Arduino"], detail: t("Arduino에서 센서 데이터를 수집합니다.", "Collects sensor data on the Arduino.") },
          { id: "store", lane: "server", label: t("PHP · MySQL 저장", "PHP · MySQL storage"), tech: ["PHP", "MySQL"], detail: t("수집한 데이터를 데이터베이스에 저장합니다.", "Stores the collected data in the database.") },
          { id: "web", lane: "user", label: t("웹 모니터링 화면", "Web monitoring page"), detail: t("저장된 데이터를 웹 화면에서 확인합니다.", "The stored data is viewed on a web page.") },
        ],
        edges: [t("측정값", "readings"), t("수집한 데이터", "collected data"), t("저장된 데이터", "stored data")],
      },
    ],
  },

  "golden-glove": {
    slug: "golden-glove",
    purpose: t("손가락 움직임으로 연주하는 코딩 학습용 음악 장갑", "Finger-driven music glove for kids' coding education"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["field", "outcome"],
        nodes: [
          { id: "finger", lane: "field", label: t("손가락 움직임", "Finger movement"), detail: t("장갑을 낀 손가락의 움직임이 입력입니다.", "Movement of the gloved fingers is the input.") },
          {
            id: "fw",
            lane: "field",
            label: t("장갑 회로 + Arduino 펌웨어", "Glove circuit + Arduino firmware"),
            tech: ["Arduino", "C++"],
            detail: t("장갑형 장치의 회로와 동작 코드를 구현했습니다. 공개 저장소에 좌·우 장갑용 Arduino 코드와 센서 읽기·통신 테스트 코드가 있습니다.", "Built the glove's circuit and operating code. The public repository holds Arduino code for the left and right gloves plus sensor-reading and communication tests."),
          },
          { id: "kit", lane: "outcome", label: t("장갑형 음악 연주 키트", "Music-playing glove kit"), detail: t("어린 학생의 코딩 학습을 위한 키트입니다.", "A kit meant for young students learning to code.") },
        ],
        edges: [t("센서 읽기", "sensor reading"), t("동작 코드", "operating code")],
      },
    ],
  },

  "hangul-clock": {
    slug: "hangul-clock",
    purpose: t("창업동아리에서 만든 Arduino 한글시계", "Arduino Korean word clock built in a startup club"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["team", "outcome"],
        nodes: [
          { id: "club", lane: "team", label: t("LINC사업단 창업동아리 활동", "LINC startup club activity"), detail: t("제주대학교 LINC사업단 창업동아리 활동으로 진행했습니다.", "Done as part of Jeju National University's LINC startup club.") },
          { id: "clock", lane: "outcome", label: t("Arduino 기반 한글시계", "Arduino-based Korean word clock"), tech: ["Arduino"], detail: t("Arduino를 활용한 한글시계 제작에 참여했습니다.", "Took part in building a Korean word clock with Arduino.") },
        ],
        edges: [t("제작", "build")],
      },
    ],
  },

  "mediamtx-installer": {
    slug: "mediamtx-installer",
    purpose: t("영상 스트리밍 서버 설치 절차를 스크립트로 자동화", "Scripting the setup of a video streaming server"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["operator", "tool", "server"],
        nodes: [
          { id: "steps", lane: "operator", label: t("반복되는 설치·설정 절차", "Repeated install and setup steps"), detail: t("매번 손으로 하던 환경 설정 절차입니다.", "Environment setup that was done by hand each time.") },
          { id: "script", lane: "tool", label: t("Shell 설치 스크립트", "Shell install script"), tech: ["Shell"], detail: t("설치 절차를 명령어로 실행할 수 있게 스크립트로 정리했습니다.", "Turns the procedure into a script run as commands.") },
          { id: "server", lane: "server", label: t("Ubuntu 24.04 · MediaMTX", "Ubuntu 24.04 · MediaMTX"), tech: ["Ubuntu", "MediaMTX"], detail: t("Ubuntu 24.04에 MediaMTX 영상 스트리밍 서버를 설치합니다.", "Installs the MediaMTX streaming server on Ubuntu 24.04.") },
        ],
        edges: [t("절차 정리", "procedure"), t("명령어 실행", "run commands")],
      },
    ],
  },

  "cross-review-bridge": {
    slug: "cross-review-bridge",
    purpose: t("외부 AI 코드 검토를 사람 승인과 함께 개발 작업에 연결", "Routing external AI code review into work, with human approval"),
    scope: "overview",
    diagrams: [
      {
        lanes: ["ai", "tool", "operator"],
        nodes: [
          { id: "reviewer", lane: "ai", label: t("외부 AI 리뷰어", "External AI reviewer"), detail: t("코드 검토 결과를 내는 외부 AI입니다.", "An external AI that produces code review results.") },
          { id: "bridge", lane: "tool", label: t("PowerShell 리뷰 흐름", "PowerShell review loop"), tech: ["PowerShell"], detail: t("검토 결과를 받아 개발 작업 쪽으로 넘기는 흐름입니다.", "Receives the review and carries it toward the development work.") },
          { id: "approve", lane: "operator", label: t("운영자 승인", "Operator approval"), detail: t("사람이 승인하는 단계를 거칩니다.", "A human approval step sits in the loop.") },
          { id: "codex", lane: "ai", label: t("Codex 개발 작업", "Codex development work"), detail: t("승인된 검토 의견이 Codex 쪽 개발 작업으로 이어집니다.", "Approved review items flow into the Codex-side development work.") },
        ],
        edges: [t("코드 검토 결과", "review results"), t("검토 의견", "review items"), t("승인된 의견", "approved items")],
      },
    ],
  },
};
