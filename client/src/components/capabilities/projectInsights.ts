/*
 * 홈 프로젝트 "자세히 보기"의 요약 · 구현한 모듈 · 비교 (자세히 보기를 열 때 지연 로딩)
 * ─────────────────────────────────────────────────────────────
 * 모든 문장은 content/projects/<slug>.mdx 본문과 이 폴더의 흐름 자료
 * (capabilityCodeFlows.ts · capabilityRecordedTraces.ts · capabilityArchitectures.ts)에
 * 적힌 사실만 씁니다. 성능 수치, 측정한 개선, 도입·사업 효과, 만든 동기는 쓰지 않습니다.
 *
 * 비교의 근거(basis)
 *   source       : 프로젝트 기록에 적힌 설계상 비교 (예: 추가 AI 호출을 대체)
 *   illustrative : 차이를 설명하려고 세운 개념적 비교 기준. 화면에 "이해를 위한 비교 예시"로 표시하며,
 *                  실제 이전 구현이나 실험 기준이라고 말하지 않습니다.
 *   split        : 가져다 쓴 기존 모델·도구와 직접 만든 부분의 경계
 *   team         : 팀원이 맡은 부분과 직접 맡은 부분
 * 기록이 짧은 프로젝트(sparse)에는 구성 요소나 비교를 만들어 넣지 않고, 기록된 범위만 적습니다.
 */
import type { Localized } from "./capabilityModel";

/** 결과의 성격 — 게재 논문, 심사 중 논문, 구현 결과, 시뮬레이터 검증, 탐색, 수상, 참여를 구분합니다. */
export type InsightStatusKind = "published" | "review" | "implemented" | "simulated" | "exploratory" | "award" | "participation";

export interface InsightStatus {
  kind: InsightStatusKind;
  text: Localized;
}

export interface InsightModule {
  name: Localized;
  role: Localized;
}

export type ComparisonBasis = "source" | "illustrative" | "split" | "team";

export interface ComparisonSide {
  title: Localized;
  text: Localized;
}

export interface ProjectComparison {
  basis: ComparisonBasis;
  topic: Localized;
  before: ComparisonSide;
  after: ComparisonSide;
  note?: Localized;
}

export interface ProjectInsight {
  slug: string;
  /** 이 프로젝트로 할 수 있게 된 일 (한두 문장) */
  enables: Localized;
  status: InsightStatus[];
  /** 직접 구현한 모듈 */
  modules: InsightModule[];
  comparisons: ProjectComparison[];
  /** 기록이 짧아 도식·비교를 생략할 때, 기록된 범위 */
  sparse?: Localized;
}

const t = (ko: string, en: string): Localized => ({ ko, en });

export const PROJECT_INSIGHTS: Record<string, ProjectInsight> = {
  "smartfarm-rag": {
    slug: "smartfarm-rag",
    enables: t(
      "질문마다 알맞은 검색 조합으로 문서를 찾아 근거가 담긴 답변을 만듭니다. 별도 운영 지원 시스템에서는 센서 관측부터 운영자 승인, 실행 결과 확인까지 이었습니다.",
      "Finds documents with a retrieval mix chosen for each question, so answers carry their evidence. A separate operations-support system runs from sensor observations to operator approval and a check of the result.",
    ),
    status: [
      { kind: "published", text: t("KCI · 제1저자", "KCI journal · first author") },
      { kind: "simulated", text: t("운영 흐름 · 시뮬레이터", "Operations flow · simulator") },
    ],
    modules: [
      {
        name: t("검색 조합 선택", "Retrieval-mix selection"),
        role: t("질문의 특징에 맞춰 검색 조합을 고르는 절차", "Picks the retrieval mix that fits each question's features"),
      },
      {
        name: t("단어·의미·관계 검색 결합", "Keyword, semantic and relation retrieval"),
        role: t("세 방식으로 찾은 문서를 답변의 근거로 함께 사용", "Uses documents found in three ways together as evidence for the answer"),
      },
      {
        name: t("운영 지원 흐름", "Operations-support flow"),
        role: t(
          "관측 확인, 문서 근거·AI 설명, 운영자 승인, 실행 결과 확인을 연결하고 시뮬레이터에서 검증",
          "Links observation checks, document evidence and AI explanations, operator approval and result checks, validated on a simulator",
        ),
      },
    ],
    comparisons: [
      {
        basis: "source",
        topic: t("검색 비율을 정하는 방법", "How the retrieval ratio is set"),
        before: {
          title: t("추가 AI 호출로 결정", "An extra AI call decides"),
          text: t("질문마다 검색 방식의 비율을 정하려고 AI를 한 번 더 호출합니다.", "Each question takes one more AI call to set the ratio of retrieval methods."),
        },
        after: {
          title: t("사전 비교 결과로 선택", "Chosen from prior comparisons"),
          text: t(
            "검색 조합을 미리 비교해 둔 결과를 활용해, 질문의 특징에 맞는 조합을 추가 AI 호출 없이 고릅니다.",
            "Comparisons of retrieval mixes made in advance are used to pick a mix that fits the question, without the extra AI call.",
          ),
        },
        note: t(
          "공개 자료로 기존 검색 방식과 비교한 실험은 KCI 논문으로 게재했습니다. 이 페이지에는 실험 수치를 옮기지 않았습니다.",
          "The comparison with existing retrieval methods on public data is published in the KCI paper; its figures are not copied here.",
        ),
      },
      {
        basis: "illustrative",
        topic: t("센서 값이 서로 맞지 않을 때", "When sensors disagree"),
        before: {
          title: t("받은 값을 모두 판단에 쓰는 경우", "Judging with every value received"),
          text: t("센서 하나가 비정상적인 값을 보내도 그 값이 판단 근거에 그대로 섞입니다.", "One sensor's abnormal value goes straight into the evidence for the judgement."),
        },
        after: {
          title: t("품질 검사와 교차 확인 (화면 기록)", "Quality check and cross-check (screen record)"),
          text: t(
            "품질이 의심되는 재배실 온도 65.0°C를 판단에서 빼고, 같은 구역의 근권 온도·상대 습도와 비교해 '센서 이상 의심'으로 표시했습니다. 이 값으로는 설비를 조작하지 않습니다.",
            "The doubtful 65.0°C room temperature was left out of the judgement and set against the zone's root-zone temperature and humidity, then flagged as a suspect sensor. No equipment is operated on that value.",
          ),
        },
        note: t(
          "오른쪽은 2026-10-01 시뮬레이터 화면 기록입니다. 실제 농장 측정이나 설비 제어 결과가 아닙니다.",
          "The right side is a simulator screen record from 2026-10-01, not real farm measurements or equipment control.",
        ),
      },
    ],
  },

  "mv-evirag": {
    slug: "mv-evirag",
    enables: t(
      "여러 카메라 영상으로 질문에 답할 때, 근거가 보일 가능성이 높은 화면부터 살피고 근거가 부족하면 답하지 않고 보류합니다.",
      "When answering questions from several camera views, it looks first at the view most likely to show the evidence and abstains instead of answering when the evidence falls short.",
    ),
    status: [{ kind: "review", text: t("IEEE Access · 2026.08 투고 · 제1저자", "IEEE Access · submitted 2026.08 · first author") }],
    modules: [
      {
        name: t("가용성 점수", "Availability score"),
        role: t(
          "답변 전에 화면마다 근거가 보이는지 0–1 점수를 매겨 먼저 볼 화면을 정함",
          "Scores each view from 0 to 1 for visible evidence before any answer, setting which view to look at first",
        ),
      },
      {
        name: t("답변·보류 학습", "Answer/abstain training"),
        role: t(
          "근거가 있는 입력과 없는 입력을 함께 LoRA로 학습해, 근거가 없으면 보류하게 함",
          "Trains on inputs with and without the needed evidence using LoRA, so the model abstains when evidence is missing",
        ),
      },
      {
        name: t("확신도 기반 제공", "Confidence-based release"),
        role: t("응답 토큰의 확률로 확신도를 계산해 답변을 내보낼지 결정", "Computes confidence from the reply's token probabilities to decide whether to release the answer"),
      },
      {
        name: t("평가 실행 코드", "Evaluation runner"),
        role: t("요청을 만들고 응답 형식을 검사해, 답한 비율과 오답을 함께 집계", "Builds requests, checks the reply format, and tallies answer coverage together with errors"),
      },
    ],
    comparisons: [
      {
        basis: "illustrative",
        topic: t("판단에 필요한 부분이 가려진 화면", "A view where the needed part is hidden"),
        before: {
          title: t("한 번에 답하는 방식", "Answering in one pass"),
          text: t(
            "질문과 영상을 모델에 넣고 나온 답을 그대로 내보내면, 행동을 판단할 부분이 가려진 화면에서도 답이 나올 수 있습니다.",
            "If the question and video go into a model and its output is released as is, an answer can come out even when the part needed to judge the action is hidden.",
          ),
        },
        after: {
          title: t("세 판단을 나눈 선택적 응답", "Selective response in three decisions"),
          text: t(
            "볼 화면(가용성 점수), 답할 수 있는지(LoRA로 학습한 답변·보류), 답을 내보낼지(확신도)를 나누어 판단하고, 근거가 부족하면 보류합니다.",
            "Which view to use (availability score), whether it can be answered (answer/abstain trained with LoRA) and whether to release the answer (confidence) are judged separately, and the system abstains when evidence is short.",
          ),
        },
        note: t(
          "실제 비교 실험의 기준과 결과는 IEEE Access에 투고해 심사 중인 논문에 있으며, 이 페이지에는 수치를 옮기지 않았습니다.",
          "The baselines and results of the actual experiments are in the paper under review at IEEE Access; no figures are copied here.",
        ),
      },
    ],
  },

  "music-splitter-web": {
    slug: "music-splitter-web",
    enables: t(
      "웹 화면에서 음원 파일을 올리면 보컬·드럼·베이스·피아노·나머지 다섯 개 음원으로 나누어, 바로 들어 보고 내려받을 수 있게 합니다.",
      "Upload an audio file on a web page and get it split into five stems — vocals, drums, bass, piano and other — ready to play and download.",
    ),
    status: [{ kind: "implemented", text: t("학부 프로젝트 · 로컬 실행", "Undergraduate project · run locally") }],
    modules: [
      {
        name: t("로그인·업로드 화면", "Login and upload page"),
        role: t("Spring Boot와 Spring Security로 회원가입·로그인을 처리하고 /spleeter 화면을 제공", "Spring Boot and Spring Security handle sign-up and login and serve the /spleeter page"),
      },
      {
        name: t("업로드 스크립트", "Upload script"),
        role: t("브라우저에서 고른 음원 파일을 FormData에 담아 FastAPI /audio로 전송", "Sends the chosen audio file from the browser to FastAPI /audio as FormData"),
      },
      {
        name: t("FastAPI /audio 처리", "FastAPI /audio handler"),
        role: t(
          "파일 저장 → Spleeter 5stems 분리 호출 → 결과 경로 5개 응답을 한 요청 안에서 처리",
          "Saves the file, calls Spleeter 5-stem separation and returns five result paths within one request",
        ),
      },
      {
        name: t("결과 재생·내려받기", "Playback and download"),
        role: t("응답 경로마다 오디오 플레이어와 내려받기를 연결", "Builds an audio player and a download for each returned path"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("기존 모델과 웹 서비스", "Existing model and web service"),
        before: {
          title: t("Spleeter 5stems", "Spleeter 5stems"),
          text: t("음원 파일 하나를 다섯 개 WAV로 나누는 기존 분리 모델입니다.", "An existing separation model that splits one audio file into five WAVs."),
        },
        after: {
          title: t("업로드부터 재생까지 이어지는 웹 기능", "A web feature from upload to playback"),
          text: t(
            "로그인·업로드 화면, 파일을 받아 분리를 호출하고 결과 경로를 돌려주는 FastAPI 처리, 결과를 재생·내려받는 화면을 연결해 기존 모델을 웹 기능으로 만들었습니다.",
            "Connected the login and upload page, FastAPI handling that receives the file, calls separation and returns the result paths, and a page to play and download the results — turning the existing model into a web feature.",
          ),
        },
        note: t(
          "공개 저장소 78ee472 커밋의 코드에서 확인한 구성입니다. 브라우저가 FastAPI 서버로 파일을 직접 보내며, 이 경로는 Spring 로그인 검사를 거치지 않습니다.",
          "Confirmed in the public repository's code at commit 78ee472. The browser sends the file straight to the FastAPI server, and that path does not go through the Spring login check.",
        ),
      },
    ],
  },

  "aerospace-rag": {
    slug: "aerospace-rag",
    enables: t(
      "항공우주 업무 문서에서 질문과 관련된 내용을 의미·단어·관계 세 가지 방식으로 찾아, Ollama 답변 생성에 활용합니다.",
      "Finds passages related to a question in aerospace work documents in three ways — meaning, keywords and relations — and uses them for answer generation with Ollama.",
    ),
    status: [{ kind: "implemented", text: t("검색·답변 생성 연동", "Retrieval and generation connected") }],
    modules: [
      {
        name: t("세 채널 검색", "Three retrieval channels"),
        role: t("Dense(Qdrant)·Sparse(BM25)·Graph 검색을 항공우주 문서에 맞춰 조합", "Combines dense (Qdrant), sparse (BM25) and graph retrieval over the aerospace documents"),
      },
      {
        name: t("답변 생성 연결", "Answer generation"),
        role: t("찾은 문서 내용을 Ollama 답변 생성에 전달", "Passes the retrieved passages to answer generation with Ollama"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("검색 도구와 조합", "Retrieval tools and how they are combined"),
        before: {
          title: t("Qdrant · BM25 · Ollama", "Qdrant · BM25 · Ollama"),
          text: t("벡터 검색, 단어 검색, 답변 생성을 각각 맡는 기존 도구입니다.", "Existing tools that each handle one job: vector search, keyword search and answer generation."),
        },
        after: {
          title: t("항공우주 문서용 RAG", "RAG for aerospace documents"),
          text: t(
            "항공우주 업무 문서를 대상으로 의미(Dense)·단어(Sparse)·관계(Graph) 세 검색 채널을 조합하고, 찾은 내용을 답변 생성에 연결했습니다.",
            "Combined three retrieval channels — meaning (dense), keywords (sparse) and relations (graph) — over aerospace work documents and connected what they find to answer generation.",
          ),
        },
      },
    ],
  },

  "music-source-separation": {
    slug: "music-source-separation",
    enables: t(
      "보컬과 악기를 분리하는 기존 모델의 학습을 GPU 환경에서 실행하고, 실험 조건을 설정 파일로 나누어 조건별로 관리할 수 있게 했습니다.",
      "Runs training of an existing vocal/instrument separation model on a GPU and keeps the experiment conditions apart in config files, so each condition can be managed on its own.",
    ),
    status: [{ kind: "exploratory", text: t("기존 모델 학습 실험", "Training an existing model") }],
    modules: [
      {
        name: t("GPU 학습 실행", "GPU training"),
        role: t("PyTorch·CUDA 환경에서 기존 분리 모델을 학습", "Trains the existing separation model with PyTorch and CUDA"),
      },
      {
        name: t("실험 조건 관리", "Experiment conditions"),
        role: t("Hydra 설정 파일로 조건별 실험을 나누어 관리", "Keeps each experiment's conditions apart in Hydra config files"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("기존 모델과 실험 관리", "Existing model and experiment management"),
        before: {
          title: t("기존 분리 모델", "Existing separation model"),
          text: t("보컬과 악기를 분리하는 기존 AI 모델입니다.", "An existing AI model that separates vocals from instruments."),
        },
        after: {
          title: t("학습 실행과 조건 관리", "Training runs and conditions"),
          text: t(
            "GPU 학습 환경에서 모델을 학습하고, 설정 파일로 실험 조건을 나누어 조건별 학습을 관리했습니다.",
            "Trained the model in a GPU environment and managed training per condition, with the conditions kept in config files.",
          ),
        },
        note: t("탐색 단계의 학습 실험입니다. 이 페이지에는 학습 결과나 성능 수치를 싣지 않았습니다.", "An exploratory training study; no training results or performance figures are shown here."),
      },
    ],
  },

  "food-scan": {
    slug: "food-scan",
    enables: t(
      "음식 사진을 찍으면 인식 결과에서 음식을 고르고, 그 음식의 영양정보를 앱에서 바로 확인할 수 있게 합니다.",
      "Take a photo of a meal, pick the food from the recognition result, and see its nutrition information in the app.",
    ),
    status: [{ kind: "award", text: t("2022 연계 캡스톤 장려상", "2022 joint capstone encouragement award") }],
    modules: [
      {
        name: t("앱–서버 연결", "App–server link"),
        role: t("Flutter 앱에서 찍은 사진을 Python 서버로 보내고 인식 결과를 받음", "Sends the photo from the Flutter app to the Python server and receives the recognition result"),
      },
      {
        name: t("영양정보 조회", "Nutrition lookup"),
        role: t("선택한 음식의 영양정보를 데이터베이스에서 불러옴", "Loads the chosen food's nutrition information from the database"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("외부 인식 서비스와 앱 흐름", "External recognition and the app flow"),
        before: {
          title: t("Google Vision API", "Google Vision API"),
          text: t("사진 속 대상을 인식해 결과를 돌려주는 외부 서비스입니다.", "An external service that recognises what is in a photo."),
        },
        after: {
          title: t("사진에서 영양정보까지 이어지는 흐름", "From photo to nutrition"),
          text: t(
            "앱의 사진을 서버에서 인식하고, 고른 음식의 영양정보를 데이터베이스에서 불러와 보여 주도록 연결했습니다. 팀장으로 기획과 진행도 맡았습니다.",
            "Connected the app's photo to recognition on the server and the chosen food to nutrition data from the database. Also led the team's planning and coordination.",
          ),
        },
      },
    ],
  },

  "spring-community-board": {
    slug: "spring-community-board",
    enables: t(
      "회원이 게시글과 댓글을 등록·조회·수정·삭제하고, 그 내용이 데이터베이스에 저장되는 웹 게시판입니다.",
      "A web board where members create, read, update and delete posts and comments, with everything stored in a database.",
    ),
    status: [{ kind: "implemented", text: t("개인 개발 · CRUD", "Personal project · CRUD") }],
    modules: [
      {
        name: t("회원·게시글·댓글 기능", "Members, posts and comments"),
        role: t("회원 관리와 게시글·댓글의 등록·조회·수정·삭제", "Member management and create, read, update and delete for posts and comments"),
      },
      {
        name: t("데이터 연결", "Data access"),
        role: t("Spring Boot 서버와 데이터베이스를 JPA로 연결", "Connects the Spring Boot server to the database through JPA"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("프레임워크와 구현한 기능", "Framework and features"),
        before: {
          title: t("Spring Boot · JPA", "Spring Boot · JPA"),
          text: t("웹 서버를 실행하고 객체를 데이터베이스 테이블과 연결해 주는 프레임워크입니다.", "Frameworks that run the web server and map objects to database tables."),
        },
        after: {
          title: t("회원·게시글·댓글 기능", "Member, post and comment features"),
          text: t(
            "회원 관리와 게시글·댓글의 등록·조회·수정·삭제 기능을 만들고, 데이터베이스와 연결했습니다.",
            "Built member management and create/read/update/delete for posts and comments, connected to the database.",
          ),
        },
      },
    ],
  },

  "introduce-cv-page": {
    slug: "introduce-cv-page",
    enables: t(
      "편집기에서 쓴 글을 바로 반영하지 않고 GitHub 변경 검토 요청(PR)으로 만들어, 검토를 거쳐 발행하는 흐름을 실험했습니다.",
      "Rather than applying a post straight from the editor, it turns the post into a GitHub pull request so it is published after review — an experiment with that flow.",
    ),
    status: [{ kind: "exploratory", text: t("PR 기반 발행 흐름 실험", "Experiment with PR-based publishing") }],
    modules: [
      {
        name: t("편집–PR 연동", "Editor-to-PR link"),
        role: t("편집기에서 쓴 마크다운 글을 GitHub API로 PR로 만듦", "Turns Markdown written in the editor into a pull request through the GitHub API"),
      },
      {
        name: t("블로그·이력서 화면", "Blog and CV site"),
        role: t("Next.js·React·TypeScript 기반 블로그와 이력서 시스템", "A blog and CV system built with Next.js, React and TypeScript"),
      },
    ],
    comparisons: [
      {
        basis: "illustrative",
        topic: t("글을 발행하는 방식", "How a post gets published"),
        before: {
          title: t("편집기에서 바로 반영", "Applied straight from the editor"),
          text: t("저장하는 순간 글이 바뀌어, 변경 내용을 따로 검토할 단계가 없습니다.", "The post changes the moment it is saved, with no step to review the change."),
        },
        after: {
          title: t("PR로 만들어 검토 후 반영", "Reviewed as a pull request"),
          text: t(
            "편집기에서 쓴 글이 GitHub의 PR이 되어, 변경 내용을 검토한 뒤 반영하는 흐름을 실험했습니다.",
            "The post becomes a GitHub pull request, so the change is reviewed before it is applied — the flow this project experiments with.",
          ),
        },
      },
    ],
  },

  "js-quiz-app": {
    slug: "js-quiz-app",
    enables: t(
      "JSON 파일의 문제를 섞어 4지선다로 풀고, 채점한 뒤 틀린 문제를 다시 확인할 수 있게 합니다.",
      "Shuffles questions from a JSON file into multiple-choice quizzes, scores them, and lets you revisit the ones you missed.",
    ),
    status: [{ kind: "implemented", text: t("학부 개발 프로젝트", "Undergraduate project") }],
    modules: [
      {
        name: t("문제 표시", "Question display"),
        role: t("JSON 파일의 문제를 읽어 순서를 섞어 표시", "Reads the questions from JSON and shows them shuffled"),
      },
      {
        name: t("채점과 진행", "Scoring and flow"),
        role: t("정답 수와 오답을 관리하고 시작·재시작을 지원", "Tracks correct answers and misses, with start and restart"),
      },
      {
        name: t("오답 복습", "Review of misses"),
        role: t("틀린 문제를 다시 확인", "Brings back the questions you missed"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("화면 도구와 퀴즈 기능", "UI tools and quiz features"),
        before: {
          title: t("Vue · Vite · JSON", "Vue · Vite · JSON"),
          text: t("화면을 만드는 프레임워크, 개발 도구, 문제를 담는 데이터 형식입니다.", "A UI framework, a build tool and the data format holding the questions."),
        },
        after: {
          title: t("섞기 · 채점 · 오답 복습", "Shuffle · score · review"),
          text: t(
            "문제를 섞어 보여 주고, 정답 수와 오답을 관리해 시작·재시작과 오답 복습까지 이어지게 했습니다.",
            "Shows the questions shuffled and tracks correct answers and misses, carrying through to restart and review.",
          ),
        },
      },
    ],
  },

  "good-price-jeju": {
    slug: "good-price-jeju",
    enables: t(
      "공공데이터포털의 지역별 착한가격업소 정보를 지도 기반 웹 화면에서 찾아볼 수 있게 합니다.",
      "Lets people browse regional good-price businesses from the public data portal on a map-based web page.",
    ),
    status: [{ kind: "implemented", text: t("학부 팀 프로젝트", "Undergraduate team project") }],
    modules: [
      {
        name: t("지도 기반 웹 화면", "Map-based web page"),
        role: t("공공데이터포털의 지역별 업소 정보를 지도 위에서 확인", "Shows the portal's regional business records on a map"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("공공데이터와 서비스 화면", "Public data and the service"),
        before: {
          title: t("공공데이터포털 · 지도 API", "Public data portal · map API"),
          text: t("지역별 업소 정보와 지도를 제공하는 공개 자료와 서비스입니다.", "Public records of regional businesses and a map service."),
        },
        after: {
          title: t("지도에서 찾는 업소 안내", "Finding businesses on a map"),
          text: t(
            "업소 정보를 지도 위에서 찾아보도록 웹 화면을 구성했습니다. 서비스 기획과 아이디어 구체화부터 개발 전반에 참여했습니다.",
            "Built the web page for browsing the businesses on a map, taking part from planning and ideation through development.",
          ),
        },
        note: t(
          "모바일 화면과 챗봇 구성은 프로젝트 자료에 함께 정리되어 있으며, 여기에는 웹 화면만 담았습니다.",
          "Mobile screens and a chatbot design are also in the project materials; only the web page is described here.",
        ),
      },
    ],
  },

  "unity-hackathon": {
    slug: "unity-hackathon",
    enables: t(
      "AR·VR 해커톤 기간 동안 다른 대학 학생들과 팀을 이루어 Unity 게임을 만들었습니다.",
      "A Unity game built during an AR/VR hackathon with students from other universities.",
    ),
    status: [{ kind: "award", text: t("2017 AR·VR 해커톤 장려상", "2017 AR/VR hackathon encouragement award") }],
    modules: [],
    comparisons: [],
    sparse: t(
      "남아 있는 기록은 팀 구성, Unity 게임 제작 참여, 장려상 수상까지입니다. 구성 요소를 나눌 만큼의 기록이 없어 도식과 비교는 생략했습니다.",
      "The surviving record covers forming the team, taking part in building the Unity game and the award. There is not enough record to break it into components, so the diagram and comparison are left out.",
    ),
  },

  "tourism-data": {
    slug: "tourism-data",
    enables: t(
      "관광·소비 데이터를 정리하고 시각화해, 팀이 모빌리티 배치를 제안하는 근거로 쓸 수 있게 했습니다.",
      "Cleaned and visualised tourism and spending data so the team could base its mobility-placement proposal on it.",
    ),
    status: [{ kind: "award", text: t("2021 빅데이터 스마트관광 해커톤 장려상", "2021 Smart Tourism Big Data Hackathon encouragement award") }],
    modules: [
      {
        name: t("데이터 전처리", "Preprocessing"),
        role: t("Python으로 관광·소비 데이터를 정리", "Cleaned the tourism and spending data in Python"),
      },
      {
        name: t("시각화", "Visualisation"),
        role: t("팀 분석과 배치 제안에 쓰도록 데이터를 시각화", "Visualised the data for the team's analysis and placement proposal"),
      },
    ],
    comparisons: [
      {
        basis: "team",
        topic: t("역할 나눔", "Who did what"),
        before: {
          title: t("군집화 · 예측 분석", "Clustering · forecasting"),
          text: t("팀원들이 수행한 분석입니다.", "Analysis carried out by teammates."),
        },
        after: {
          title: t("전처리 · 시각화 · 제안서", "Preprocessing · visualisation · proposal"),
          text: t(
            "분석에 쓸 데이터를 Python으로 정리·시각화하고, 팀의 분석 결과를 배치 제안서로 정리했습니다.",
            "Prepared and visualised the data in Python and organised the team's findings into the placement proposal.",
          ),
        },
      },
    ],
  },

  "smart-home-2017": {
    slug: "smart-home-2017",
    enables: t("장치의 센서 값을 데이터베이스에 저장하고 웹 화면에서 확인할 수 있게 합니다.", "Stores readings from the device's sensors in a database and shows them on a web page."),
    status: [{ kind: "award", text: t("2017 컴퓨터공학과 전시회 기업체우수상", "2017 Computer Engineering Exhibition corporate excellence award") }],
    modules: [
      {
        name: t("센서 수집 펌웨어", "Collection firmware"),
        role: t("Arduino에서 센서 데이터를 수집", "Collects sensor data on the Arduino"),
      },
      {
        name: t("데이터 저장", "Storage"),
        role: t("PHP·MySQL로 데이터베이스에 저장", "Stores the data in a database with PHP and MySQL"),
      },
      {
        name: t("웹 모니터링 화면", "Web monitoring"),
        role: t("저장된 값을 웹에서 확인", "Shows the stored values on a web page"),
      },
    ],
    comparisons: [
      {
        basis: "illustrative",
        topic: t("센서 값을 확인하는 곳", "Where the readings can be seen"),
        before: {
          title: t("장치에만 남는 값", "Values left on the device"),
          text: t("측정값을 장치 앞에서만 볼 수 있고, 지난 값을 모아 보기 어렵습니다.", "Readings can only be seen at the device, and past values are hard to look back on."),
        },
        after: {
          title: t("저장하고 웹에서 확인", "Stored and shown on the web"),
          text: t(
            "Arduino가 수집한 값을 PHP·MySQL로 저장해, 웹 모니터링 화면에서 확인할 수 있게 연결했습니다.",
            "Values collected on the Arduino are stored through PHP and MySQL and viewed on a web monitoring page.",
          ),
        },
      },
    ],
  },

  "golden-glove": {
    slug: "golden-glove",
    enables: t(
      "장갑을 낀 손가락의 움직임으로 음악을 연주하는 키트로, 어린 학생의 코딩 학습에 쓰도록 만들었습니다.",
      "A kit that plays music from the movements of gloved fingers, made for young students learning to code.",
    ),
    status: [{ kind: "award", text: t("2023 연계 캡스톤 우수상", "2023 joint capstone excellence award") }],
    modules: [
      {
        name: t("장갑 회로", "Glove circuit"),
        role: t("장갑형 장치의 회로를 구현", "Built the glove device's circuit"),
      },
      {
        name: t("Arduino 펌웨어", "Arduino firmware"),
        role: t("좌·우 장갑의 동작 코드(C++)와 센서 읽기·통신 테스트", "Operating code (C++) for the left and right gloves, with sensor-reading and communication tests"),
      },
    ],
    comparisons: [
      {
        basis: "split",
        topic: t("보드와 직접 만든 장치", "Boards and the device built on them"),
        before: {
          title: t("Arduino 보드", "Arduino boards"),
          text: t("센서를 읽고 동작 코드를 실행하는 마이크로컨트롤러 보드입니다.", "Microcontroller boards that read sensors and run the device code."),
        },
        after: {
          title: t("장갑 회로와 펌웨어", "Glove circuit and firmware"),
          text: t(
            "장갑형 장치의 회로를 구현하고 펌웨어를 작성했습니다. 팀장으로 아이디어 구체화와 진행 관리도 맡았습니다.",
            "Built the glove's circuit and wrote its firmware; also led ideation and coordination as team lead.",
          ),
        },
        note: t(
          "공개 저장소에 좌·우 장갑용 Arduino 코드와 센서 읽기·통신 테스트 코드가 정리되어 있습니다.",
          "The public repository holds the Arduino code for both gloves and sensor-reading and communication tests.",
        ),
      },
    ],
  },

  "hangul-clock": {
    slug: "hangul-clock",
    enables: t(
      "제주대학교 LINC사업단 창업동아리 활동으로 Arduino를 활용한 한글시계를 제작했습니다.",
      "An Arduino-based Korean word clock built in Jeju National University's LINC entrepreneurship club.",
    ),
    status: [{ kind: "participation", text: t("창업동아리 활동", "Entrepreneurship club") }],
    modules: [],
    comparisons: [],
    sparse: t(
      "남아 있는 기록은 동아리 활동과 Arduino 한글시계 제작 참여까지입니다. 구성 요소를 나눌 만큼의 기록이 없어 도식과 비교는 생략했습니다.",
      "The surviving record covers the club activity and taking part in building the Arduino word clock. There is not enough record to break it into components, so the diagram and comparison are left out.",
    ),
  },

  "mediamtx-installer": {
    slug: "mediamtx-installer",
    enables: t(
      "Ubuntu 24.04에서 MediaMTX 영상 스트리밍 서버를 설치하는 반복 절차를 명령어로 실행할 수 있게 합니다.",
      "Runs the repeated steps for installing the MediaMTX streaming server on Ubuntu 24.04 as commands.",
    ),
    status: [{ kind: "implemented", text: t("설치 스크립트", "Install script") }],
    modules: [
      {
        name: t("설치 스크립트", "Install script"),
        role: t("Ubuntu 24.04용 MediaMTX 설치 절차를 Shell 스크립트로 정리", "The MediaMTX install procedure for Ubuntu 24.04, written as a shell script"),
      },
    ],
    comparisons: [
      {
        basis: "illustrative",
        topic: t("스트리밍 서버를 설치하는 방법", "Installing the streaming server"),
        before: {
          title: t("손으로 설치할 때", "By hand"),
          text: t("설치와 설정 명령을 매번 차례대로 직접 입력합니다.", "Each install and setup command is typed in order, every time."),
        },
        after: {
          title: t("스크립트로 설치할 때", "With the script"),
          text: t("정리해 둔 절차를 스크립트로 실행해, 반복되는 환경 설정을 명령어로 처리합니다.", "The documented procedure runs as a script, so the repeated setup is handled by commands."),
        },
      },
    ],
  },

  "cross-review-bridge": {
    slug: "cross-review-bridge",
    enables: t(
      "외부 AI가 낸 코드 검토 의견을 사람의 승인 단계를 거쳐 Codex 개발 작업으로 이어지게 합니다.",
      "Carries an external AI's code-review comments through a human approval step into Codex development work.",
    ),
    status: [{ kind: "implemented", text: t("리뷰 흐름 구현", "Review loop built") }],
    modules: [
      {
        name: t("PowerShell 리뷰 흐름", "PowerShell review loop"),
        role: t("외부 AI의 검토 결과를 받아 개발 작업 쪽으로 전달", "Receives the external AI's review and carries it toward the development work"),
      },
      {
        name: t("운영자 승인 단계", "Operator approval"),
        role: t("사람이 승인한 의견만 Codex 개발 작업으로 넘김", "Only comments a person approves move on to Codex development work"),
      },
    ],
    comparisons: [
      {
        basis: "illustrative",
        topic: t("AI 검토 의견을 반영하는 방법", "Acting on AI review comments"),
        before: {
          title: t("의견을 바로 반영할 때", "Applied directly"),
          text: t("외부 AI의 검토 의견이 사람의 확인 없이 개발 작업으로 이어질 수 있습니다.", "An external AI's comments can flow into the work without a person checking them."),
        },
        after: {
          title: t("승인 단계를 둔 리뷰 흐름", "A loop with an approval step"),
          text: t("검토 의견이 운영자 승인을 거친 뒤에 Codex 개발 작업으로 넘어갑니다.", "Review comments pass operator approval before they move on to Codex development work."),
        },
      },
    ],
  },
};

export function insightFor(slug: string): ProjectInsight | null {
  return PROJECT_INSIGHTS[slug] ?? null;
}
