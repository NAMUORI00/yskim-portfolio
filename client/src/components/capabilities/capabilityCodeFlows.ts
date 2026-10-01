/*
 * 코드로 확인한 흐름 (홈 프로젝트 자세히 보기의 작은 도식과 넓게 보기)
 * ─────────────────────────────────────────────────────────────
 * 저장소 코드에 적힌 처리 순서, 요청·응답 형식, 경로·항목 이름만 옮깁니다.
 * 실행 기록이 아니므로 실제 입력 값, 점수, 답변, 처리 시간, 성능은 넣지 않습니다.
 *
 * 근거
 *   music-splitter-web : 공개 저장소 NAMUORI00/MusicSplitterWeb 78ee472 커밋을 읽은 기술 글
 *                        ("MusicSplitterWeb의 업로드와 음원 처리 흐름") — SpleeterController, spleeter.html,
 *                        API/main.py 의 경로. 로컬에 저장소 사본은 없습니다.
 *   mv-evirag          : 연구 저장소(읽기 전용)의 README 와 평가 실행 코드
 *                        (사전 동결 재평가 러너: 답변 모델 요청 형식, 응답 JSON 검사, 확신도 계산,
 *                        가용성 점수 특징, 확신도 순 선택)
 * 단계마다 받은 것·처리·보낸 것은 넓게 보기 전용 capabilityJourneys.ts 에 있습니다.
 */
import type { Localized } from "./capabilityModel";
import type { FlowView } from "./capabilityFlowModel";

const t = (ko: string, en: string): Localized => ({ ko, en });

const NOT_A_RUN = t(
  "실행 기록이 아니므로 실제 입력 값, 점수, 결과, 처리 시간은 보여 주지 않습니다.",
  "Not a run record, so it shows no actual inputs, scores, results or processing times.",
);
const PACE = t("단계 사이 재생 간격은 보기 쉽게 정한 속도입니다.", "The pace between steps is for viewing only.");

export const MUSIC_SPLITTER_CODE_FLOW: FlowView = {
  key: "music-splitter-web:code:upload",
  slug: "music-splitter-web",
  evidence: "code",
  scope: "detailed",
  title: t("음원 업로드에서 분리 결과 재생까지", "From upload to playing the stems"),
  caption: t(
    "화면은 Spring 서버가 주지만, 음원 파일은 브라우저가 FastAPI 서버로 직접 보내고 그 응답으로 결과를 재생합니다.",
    "Spring serves the page, but the browser sends the audio file straight to the FastAPI server and plays the results from its reply.",
  ),
  provenance: t("공개 저장소 78ee472 커밋의 코드 · 실행 기록 아님", "Code at commit 78ee472 of the public repository · not a run record"),
  lanes: ["user", "server", "ai"],
  nodes: [
    {
      id: "page",
      lane: "server",
      title: t("Spring Boot · 로그인과 업로드 화면", "Spring Boot · login and upload page"),
      short: t("로그인·화면", "Login · page"),
      label: t("Spring 로그인·화면", "Spring login · page"),
      tech: ["Spring Boot", "Spring Security"],
      detail: t(
        "Spring Security로 회원가입·로그인을 처리하고, /spleeter 경로에 업로드 화면을 돌려줍니다.",
        "Spring Security handles sign-up and login, and /spleeter returns the upload page.",
      ),
    },
    {
      id: "upload",
      lane: "user",
      title: t("브라우저가 음원을 직접 전송", "The browser sends the audio itself"),
      short: t("POST /audio", "POST /audio"),
      label: t("브라우저 업로드", "Browser upload"),
      tech: ["JavaScript"],
      detail: t(
        "화면의 JavaScript가 고른 음원 파일을 FormData에 담아 FastAPI 서버의 /audio로 보냅니다.",
        "The page's JavaScript puts the chosen audio file in FormData and posts it to /audio on the FastAPI server.",
      ),
    },
    {
      id: "receive",
      lane: "server",
      title: t("FastAPI /audio · 파일 저장", "FastAPI /audio · saving the file"),
      short: t("파일 저장", "Save file"),
      label: t("FastAPI /audio", "FastAPI /audio"),
      tech: ["Python", "FastAPI"],
      detail: t(
        "업로드된 파일 전체를 읽어 output 폴더에 올린 이름 그대로 저장하고, 같은 요청 안에서 분리를 시작합니다.",
        "Reads the whole upload, saves it in the output folder under its original name, and starts separation within the same request.",
      ),
    },
    {
      id: "separate",
      lane: "ai",
      title: t("Spleeter 5stems 분리", "Spleeter 5-stem separation"),
      short: t("5개로 분리", "Split into 5"),
      label: t("Spleeter 분리", "Spleeter split"),
      tech: ["Spleeter"],
      detail: t(
        "기존 Spleeter 5stems 모델로 보컬·드럼·베이스·피아노·나머지 다섯 개의 WAV 파일을 만듭니다.",
        "The existing Spleeter 5-stem model writes five WAV files: vocals, drums, bass, piano and other.",
      ),
    },
    {
      id: "respond",
      lane: "server",
      title: t("Success 응답 · 경로 5개", "Success reply · five paths"),
      short: t("경로 5개 응답", "Five paths"),
      label: t("FastAPI 응답", "FastAPI reply"),
      detail: t(
        "다섯 결과 파일의 경로를 만들어 Success 메시지와 함께 돌려줍니다.",
        "Builds the paths of the five result files and returns them with a Success message.",
      ),
    },
    {
      id: "play",
      lane: "user",
      title: t("플레이어 5개 · 내려받기", "Five players · download"),
      short: t("재생·다운로드", "Play · download"),
      label: t("재생·내려받기", "Play · download"),
      detail: t(
        "응답의 경로마다 오디오 플레이어를 만들고, 각 파일을 내려받을 수 있게 합니다.",
        "Creates an audio player for each path in the reply and lets each file be downloaded.",
      ),
    },
  ],
  links: [
    { from: "page", to: "upload", label: t("업로드 화면", "upload page") },
    { from: "upload", to: "receive", label: t("POST /audio", "POST /audio") },
    { from: "receive", to: "separate", label: t("원본 파일", "original file") },
    { from: "separate", to: "respond", label: t("WAV 5개", "5 WAV files") },
    { from: "respond", to: "play", label: t("Success · 경로 5개", "Success · 5 paths") },
  ],
  source: {
    summary: t("공개 저장소 코드 · 78ee472 커밋", "Public repository code · commit 78ee472"),
    items: [
      {
        term: t("근거", "Basis"),
        text: t(
          "공개 저장소 NAMUORI00/MusicSplitterWeb의 78ee472 커밋에서 Spring 화면 컨트롤러(SpleeterController), 업로드 화면(spleeter.html)의 JavaScript, Python 처리 서버(API/main.py)를 따라 읽은 경로입니다.",
          "The path read through commit 78ee472 of the public repository NAMUORI00/MusicSplitterWeb: the Spring page controller (SpleeterController), the upload page's JavaScript (spleeter.html) and the Python processing server (API/main.py).",
        ),
      },
      {
        term: t("화면에 쓴 이름", "Names shown"),
        text: t(
          "/spleeter, /audio, FormData, spleeter:5stems, separate_to_file, output, vocals·drums·bass·piano·other.wav는 코드에 적힌 이름입니다. {파일 이름}은 업로드한 파일 이름이 들어갈 자리입니다.",
          "/spleeter, /audio, FormData, spleeter:5stems, separate_to_file, output and vocals·drums·bass·piano·other.wav are names from the code. {file name} stands for the uploaded file's name.",
        ),
      },
    ],
    limits: [
      NOT_A_RUN,
      t("학부 프로젝트로 로컬 환경에서 실행한 웹 서비스입니다.", "An undergraduate web service run in a local environment."),
      t(
        "로그인은 Spring 서버에서 처리하며, 브라우저가 직접 부르는 /audio 경로는 같은 로그인 검사를 거치지 않습니다.",
        "Login is handled by the Spring server; the /audio path the browser calls directly does not go through that login check.",
      ),
      PACE,
    ],
  },
};

export const MV_EVIRAG_CODE_FLOW: FlowView = {
  key: "mv-evirag:code:answer",
  slug: "mv-evirag",
  evidence: "code",
  scope: "detailed",
  title: t("질문에서 답변 또는 보류까지", "From a question to an answer or abstention"),
  caption: t(
    "답변 모델을 부르기 전에는 근거 가용성 점수를 쓰고, 부른 뒤에는 응답 형식과 확신도로 답변을 내보낼지 정합니다.",
    "Before the answer model is called an evidence-availability score is used; afterwards the reply's format and confidence decide whether the answer is released.",
  ),
  provenance: t("연구 저장소의 평가 실행 코드 · 실행 기록 아님", "Evaluation code in the research repository · not a run record"),
  lanes: ["data", "ai", "tool", "outcome"],
  nodes: [
    {
      id: "input",
      lane: "data",
      title: t("질문 + 카메라 화면", "Question + camera views"),
      short: t("질문·화면", "Question · views"),
      label: t("질문 + 화면", "Question + views"),
      detail: t(
        "사건마다 질문 문장, 카메라 화면의 전체 프레임, 원해상도로 잘라 낸 판단 영역 이미지가 한 줄의 입력 기록으로 들어옵니다.",
        "Each case arrives as one input record: the question, the camera's full frame and a native-resolution crop of the region to judge.",
      ),
    },
    {
      id: "select",
      lane: "ai",
      title: t("근거 가용성 점수", "Evidence-availability score"),
      short: t("가용성 점수", "Availability"),
      label: t("가용성 점수", "View score"),
      tech: ["SigLIP2", "Grounding DINO", "scikit-learn"],
      detail: t(
        "답변을 만들기 전에, 화면 후보마다 질문에 답할 근거가 보이는지 0–1 점수를 매겨 어떤 화면부터 볼지 정하는 데 씁니다.",
        "Before any answer is generated, each candidate view gets a 0–1 score for whether evidence for the question is visible, used to decide which view to call first.",
      ),
    },
    {
      id: "request",
      lane: "tool",
      title: t("답변 요청 만들기", "Building the answer request"),
      short: t("요청 만들기", "Build request"),
      label: t("요청 만들기", "Build request"),
      tech: ["Python", "vLLM"],
      detail: t(
        "평가 실행 코드가 지시문, 전체 프레임, 판단 영역, 질문을 한 요청으로 묶어 추론 서버에 보냅니다.",
        "The evaluation code bundles the instructions, full frame, region crop and question into one request to the inference server.",
      ),
    },
    {
      id: "answer",
      lane: "ai",
      title: t("답변 또는 보류 (VLM)", "Answer or abstain (VLM)"),
      short: t("답변·보류", "Answer · abstain"),
      label: t("VLM 답변·보류", "VLM answer / abstain"),
      tech: ["Qwen3-VL 8B", "LoRA"],
      detail: t(
        "시각-언어 모델이 주어진 화면만 근거로 답하거나 보류하고, 결과를 JSON 한 줄로 돌려줍니다.",
        "A vision-language model answers from the given views only, or abstains, and replies with one line of JSON.",
      ),
    },
    {
      id: "check",
      lane: "tool",
      title: t("응답 검사 · 확신도", "Checking the reply · confidence"),
      short: t("확신도", "Confidence"),
      label: t("응답 검사·확신도", "Check · confidence"),
      detail: t(
        "응답 형식을 검사해 보류 여부를 정하고, 생성된 토큰의 확률로 확신도를 계산합니다.",
        "Checks the reply's format, settles whether it abstained, and computes a confidence from the generated tokens' probabilities.",
      ),
    },
    {
      id: "release",
      lane: "outcome",
      title: t("제공 또는 보류", "Release or hold"),
      short: t("제공·보류", "Release · hold"),
      label: t("제공·보류", "Release / hold"),
      detail: t(
        "확신도가 높은 응답부터 정한 비율만큼만 답변을 내보내고 나머지는 보류합니다.",
        "Releases answers in order of confidence up to a set share and holds the rest.",
      ),
    },
  ],
  links: [
    { from: "input", to: "select", label: t("이미지 + 질문", "image + question") },
    { from: "select", to: "request", label: t("호출 순서", "call order") },
    { from: "request", to: "answer", label: t("POST /chat/completions", "POST /chat/completions") },
    { from: "answer", to: "check", label: t("JSON + 토큰 확률", "JSON + token probabilities") },
    { from: "check", to: "release", label: t("확신도", "confidence") },
  ],
  source: {
    summary: t("연구 저장소 코드 · 평가 실행 코드", "Research repository code · evaluation runner"),
    items: [
      {
        term: t("근거", "Basis"),
        text: t(
          "연구 저장소의 README와 평가 실행 코드에 적힌 처리 순서, 요청·응답 형식, 확신도 계산, 가용성 점수의 특징 구성을 옮겼습니다.",
          "Taken from the research repository's README and evaluation code: the order of steps, request and reply formats, the confidence formula and the features of the availability score.",
        ),
      },
      {
        term: t("영상", "Video"),
        text: t(
          "평가 영상은 AIHub 원천 데이터이며 라이선스상 재배포하지 않아 이 페이지에 싣지 않습니다.",
          "The evaluation video is AIHub source data; its licence does not allow redistribution, so none is shown here.",
        ),
      },
      {
        term: t("화면에 쓴 이름", "Names shown"),
        text: t(
          "event_question, full_path, crop_path, availability_score, decision, answer, abstained, confidence는 코드의 항목 이름입니다.",
          "event_question, full_path, crop_path, availability_score, decision, answer, abstained and confidence are field names from the code.",
        ),
      },
    ],
    limits: [
      NOT_A_RUN,
      t(
        "가용성 점수로 호출 순서를 정했을 때의 효과는 저장해 둔 응답으로 오프라인에서 비교한 것입니다.",
        "The effect of ordering calls by availability was compared offline on stored replies.",
      ),
      PACE,
    ],
  },
};

/** 코드로 확인한 흐름 */
export const CODE_FLOWS: FlowView[] = [MV_EVIRAG_CODE_FLOW, MUSIC_SPLITTER_CODE_FLOW];

/**
 * 코드로 확인한 흐름이 대신하는 설명용 도식 (프로젝트 → 도식 순번)
 *   music-splitter-web : 소개 글 도식은 Spring 서버가 파일을 Python 서버로 넘긴다고 그렸으나,
 *                        코드에서는 브라우저가 FastAPI 서버로 직접 보냅니다.
 *   mv-evirag          : 같은 세 판단을 코드의 입출력과 함께 그린 흐름으로 대신합니다.
 */
export const SUPERSEDED_DIAGRAMS: Record<string, number[]> = {
  "music-splitter-web": [0],
  "mv-evirag": [0],
};
