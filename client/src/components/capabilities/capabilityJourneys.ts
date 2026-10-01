/*
 * 단계별 데이터 여정 (홈 프로젝트 자세히 보기의 작은 도식과 넓게 보기 — 지연 로딩 묶음에만 들어갑니다)
 * ─────────────────────────────────────────────────────────────
 * 단계마다 "무엇을 어디에서 받아 → 어떻게 처리해 → 무엇을 어디로 보내는지"를 적습니다.
 *   recorded    : 처리 방식과 전달 경로는 대시보드·시뮬레이터 코드에서, 값은 화면 기록에서 옮겼습니다.
 *   code        : 코드에 적힌 순서·형식·이름만 씁니다. 실제 값은 넣지 않습니다.
 *   explanatory : 소개 글 도식의 단계 설명과 화살표 이름(데이터 종류)에서만 만듭니다.
 * 받는 곳·보내는 곳은 흐름의 연결선에서 계산하고, 여기에는 첫 단계의 출발점과 마지막 단계의 도착점만 둡니다.
 */
import type { Localized } from "./capabilityModel";
import type { LaneId } from "./capabilityArchitectures";
import type { FlowLink, FlowView } from "./capabilityFlowModel";

/** 화면에서 lucide 아이콘으로 바꾸는 이름 — 장식이 아니라 데이터·구성 요소의 종류를 나타냅니다. */
export type FlowIcon =
  | "user"
  | "team"
  | "operator"
  | "browser"
  | "phone"
  | "login"
  | "text"
  | "document"
  | "json"
  | "request"
  | "code"
  | "config"
  | "terminal"
  | "audio"
  | "audioFile"
  | "video"
  | "camera"
  | "frames"
  | "image"
  | "model"
  | "gpu"
  | "rule"
  | "score"
  | "search"
  | "filter"
  | "check"
  | "alert"
  | "compare"
  | "route"
  | "gauge"
  | "server"
  | "database"
  | "records"
  | "folder"
  | "device"
  | "sensor"
  | "hand"
  | "sim"
  | "clock"
  | "map"
  | "external"
  | "pr"
  | "result"
  | "award"
  | "chart"
  | "list"
  | "nutrition"
  | "game"
  | "music"
  | "proposal";

export interface JourneyItem {
  label: Localized;
  /** 코드에 적힌 이름·형식 또는 기록된 값 (고정폭으로 표시) */
  value?: string | Localized;
}

export interface JourneyPayload {
  icon: FlowIcon;
  label: Localized;
  items?: JourneyItem[];
  /** 코드에 적힌 형식 한 줄 */
  code?: string;
}

export interface JourneyPlace {
  icon: FlowIcon;
  name: Localized;
}

export interface StepJourney {
  /** 단계(구성 요소)의 아이콘 */
  icon: FlowIcon;
  /** 레인 도식 상자 안의 짧은 결과 줄 */
  summary?: Localized[];
  /** 첫 단계: 데이터가 처음 생기는 곳 */
  origin?: JourneyPlace;
  receives?: JourneyPayload[];
  /** 실제로 하는 처리 */
  process: Localized;
  /** 처리 방식 (예: 규칙, 학습한 모델) */
  method?: Localized;
  /** 내보내는 데이터의 종류·형식 (기록된 값은 단계의 body 로 그립니다) */
  produces?: JourneyPayload;
  /** 마지막 단계: 결과가 닿는 곳 */
  destination?: JourneyPlace;
  /** 다음 단계로 넘길 때 거치는 경로 — 코드에서 확인한 것만 */
  via?: Localized[];
}

interface DetailedJourney {
  steps: Record<string, StepJourney>;
  /** 연결선 위를 지나는 데이터 아이콘 ("from>to") */
  links: Record<string, FlowIcon>;
}

const t = (ko: string, en: string): Localized => ({ ko, en });

/* ────────────────────────────────────────────
   기록된 예시: 스마트팜 센서 불일치 (2026-10-01 화면 기록)
──────────────────────────────────────────── */
const SMARTFARM_SENSOR: DetailedJourney = {
  steps: {
    sense: {
      icon: "sensor",
      summary: [t("주요 4개 · 외 16개", "4 key · 16 more")],
      origin: { icon: "sim", name: t("시뮬레이터", "Simulator") },
      receives: [{ icon: "alert", label: t("A구역 센서 고장 상황 · 재배실 온도", "Zone A sensor-fault event · room temperature") }],
      process: t(
        "시뮬레이터가 2초마다 상태를 한 칸 진행하며 구역별 관측 기록을 만듭니다. 센서 고장 상황에서는 재배실 온도 값이 65 °C 쪽으로 움직이고 품질 표시가 bad로 붙습니다. 다른 값은 기본값을 따라 움직입니다.",
        "The simulator advances its state every 2 seconds and writes observation records per zone. Under the sensor-fault event the room-temperature value moves toward 65 °C with its quality flag set to bad; the other values follow their defaults.",
      ),
      method: t("합성 관측", "Synthetic readings"),
      produces: {
        icon: "sensor",
        label: t("관측 기록 20개", "20 observation records"),
        items: [{ label: t("기록 항목", "Record fields"), value: "metric · value · unit · quality · observed_at" }],
      },
      via: [
        t("텔레메트리 서비스 → 운영 API: GET /v1/telemetry/snapshot", "Telemetry service → operations API: GET /v1/telemetry/snapshot"),
        t("운영 API → 대시보드: GET /v1/dashboard/snapshot, 2초마다", "Operations API → dashboard: GET /v1/dashboard/snapshot, every 2 s"),
      ],
    },
    intake: {
      icon: "clock",
      summary: [t("최근 관측 13:37:45", "Latest reading 13:37:45")],
      receives: [
        {
          icon: "json",
          label: t("현재 상태 응답 (JSON)", "Current-state reply (JSON)"),
          items: [
            { label: t("관측 값", "Readings"), value: "metrics" },
            { label: t("경보", "Alerts"), value: "alerts" },
            { label: t("설비 상태", "Devices"), value: "actuators" },
          ],
        },
      ],
      process: t(
        "대시보드가 2초마다 현재 상태를 요청합니다. 응답이 텔레메트리 서비스에서 온 연결 상태이면 화면 값을 바꾸고, 두 번 연속 그렇지 않으면 연결 끊김으로 표시합니다.",
        "The dashboard requests the current state every 2 seconds. When the reply comes from the telemetry service in a connected state it updates the screen; after two misses in a row it shows a lost connection.",
      ),
      method: t("2초 주기 요청", "Polled every 2 s"),
    },
    quality: {
      icon: "check",
      summary: [t("정상 19 · 의심 1", "19 good · 1 doubtful")],
      receives: [
        {
          icon: "sensor",
          label: t("A구역 관측 20개 · 값마다 품질 표시", "20 Zone A readings, each with a quality flag"),
          items: [{ label: t("품질 표시", "Quality flag"), value: "good · suspect · bad · stale · missing" }],
        },
      ],
      process: t(
        "품질 표시가 good이 아닌 값을 '의심'으로 나눕니다. 의심 값은 판단 근거에서 빼고 센서 교차 확인으로 따로 보냅니다.",
        "Readings whose quality flag is not good are set apart as doubtful. They are left out of the judgement and sent separately to the sensor cross-check.",
      ),
      method: t("규칙", "Rule"),
    },
    range: {
      icon: "gauge",
      summary: [t("기준 안 3 · 벗어남 0 · 기준 없음 16", "3 in · 0 out · 16 no range")],
      receives: [
        { icon: "sensor", label: t("정상 값 19개", "19 good readings") },
        {
          icon: "database",
          label: t("운영 기준 · 지표별 하한·상한", "Operating ranges · lower and upper per metric"),
          items: [{ label: t("요청", "Request"), value: "GET /v1/cultivation-strategies" }],
        },
      ],
      process: t(
        "지금 적용 중인 운영 기준과 값마다 붙은 상태를 함께 봅니다. 상태가 정상이고 기준이 등록된 값은 '기준 안', 정상이 아닌 값은 '벗어남', 기준이 없는 값은 따로 셉니다.",
        "Uses the operating ranges in force together with each value's status: normal with a registered range counts as in range, anything not normal as out of range, and values with no range are counted apart.",
      ),
      method: t("규칙", "Rule"),
    },
    judge: {
      icon: "compare",
      summary: [t("재배실 온도 센서 이상 의심", "Room temperature sensor suspect"), t("이 값으로는 설비를 조작하지 않음", "No equipment is operated on this value")],
      receives: [{ icon: "alert", label: t("현재 상태의 센서 상태 경보", "The sensor-health alert in the current state"), items: [{ label: t("경보 종류", "Alert kind"), value: "sensor_health" }] }],
      process: t(
        "센서 상태 경보가 있으면, 같은 구역에서 품질이 정상이고 기준 안인 주요 센서 두 개를 골라 의심 값과 나란히 둡니다. 다른 센서가 정상이면 실제 환경보다 센서 문제로 보고, 점검 전까지 이 값으로 설비를 조절하지 않는다고 적습니다.",
        "With a sensor-health alert, two key sensors of the same zone that read well and in range are set beside the doubtful value. If they are normal, the sensor rather than the room is the likelier problem, and the value is marked as not to be used for equipment until checked.",
      ),
      method: t("정해진 규칙 · 언어 모델 아님", "Fixed rules, not a language model"),
    },
    plan: {
      icon: "map",
      summary: [t("A구역 · 알림 1", "Zone A · alert 1")],
      process: t(
        "판단이 가리키는 구역을 실제 베드 위치로 그린 배치도에서 찾아 번호 1을 꽂습니다.",
        "Finds the zone the judgement points to on a plan drawn from the real bed positions and pins it with number 1.",
      ),
      destination: { icon: "user", name: t("농부 화면", "The farmer's screen") },
    },
  },
  links: { "sense>intake": "sensor", "intake>quality": "sensor", "quality>range": "sensor", "quality>judge": "sensor", "range>judge": "gauge", "judge>plan": "alert" },
};

/* ────────────────────────────────────────────
   코드로 확인한 흐름: 음원 분리 웹 서비스 (78ee472)
──────────────────────────────────────────── */
const MUSIC_SPLITTER: DetailedJourney = {
  steps: {
    page: {
      icon: "server",
      summary: [t("/spleeter 화면 · 로그인", "/spleeter page · login")],
      origin: { icon: "user", name: t("사용자 브라우저", "The user's browser") },
      receives: [{ icon: "login", label: t("회원가입·로그인 요청, 화면 요청", "Sign-up/login and page requests") }],
      process: t(
        "Spring Security가 회원가입·로그인을 처리하고, 컨트롤러는 /spleeter 경로에 업로드 화면 템플릿을 돌려줍니다. 이 컨트롤러에는 음원 파일을 받아 Python 서버로 넘기는 코드가 없습니다.",
        "Spring Security handles sign-up and login, and the controller returns the upload page template for /spleeter. The controller has no code that receives the audio file or relays it to the Python server.",
      ),
      method: t("화면 제공", "Serves the page"),
      produces: { icon: "browser", label: t("업로드 화면 (HTML + JavaScript)", "Upload page (HTML + JavaScript)"), items: [{ label: t("템플릿", "Template"), value: "spleeter.html" }] },
      via: [t("Spring 서버 → 브라우저: /spleeter 화면", "Spring server → browser: the /spleeter page")],
    },
    upload: {
      icon: "browser",
      summary: [t("FormData → POST /audio", "FormData → POST /audio")],
      receives: [{ icon: "audioFile", label: t("사용자가 고른 음원 파일", "The audio file the user picked") }],
      process: t(
        "화면의 JavaScript가 음원 파일을 FormData에 담아 FastAPI 서버의 /audio로 직접 POST합니다. 응답이 올 때까지 로딩 창을 띄워 둡니다.",
        "The page's JavaScript wraps the file in FormData and POSTs it straight to /audio on the FastAPI server, keeping a loading dialog up until the reply arrives.",
      ),
      method: t("브라우저에서 실행", "Runs in the browser"),
      produces: {
        icon: "request",
        label: t("multipart 요청 · 음원 파일 1개", "Multipart request · one audio file"),
        items: [
          { label: t("요청", "Request"), value: "POST /audio" },
          { label: t("본문", "Body"), value: "FormData" },
        ],
      },
      via: [t("브라우저 → 같은 PC에서 실행한 FastAPI 서버 (Spring 서버를 거치지 않음)", "Browser → the FastAPI server on the same machine (not through the Spring server)")],
    },
    receive: {
      icon: "server",
      summary: [t("output 폴더에 원래 이름으로 저장", "Saved in output/ by name")],
      receives: [{ icon: "audioFile", label: t("음원 파일 (multipart)", "Audio file (multipart)") }],
      process: t(
        "/audio 처리 함수가 파일 전체를 await file.read()로 메모리에 읽어 output 폴더에 올린 이름 그대로 저장합니다. 작업 대기열이나 작업 번호 없이 같은 요청 안에서 바로 분리를 부릅니다.",
        "The /audio handler reads the whole file into memory with await file.read() and saves it in the output folder under its uploaded name. With no job queue or job ID, it calls separation within the same request.",
      ),
      method: t("요청 하나로 끝까지 처리", "One request does it all"),
      produces: { icon: "folder", label: t("저장된 원본 파일", "Saved original file"), items: [{ label: t("저장 위치", "Saved as"), value: t("output/{파일 이름}", "output/{file name}") }] },
    },
    separate: {
      icon: "model",
      summary: [t("WAV 5개", "5 WAV files")],
      receives: [{ icon: "folder", label: t("저장된 원본 파일", "The saved original file") }],
      process: t(
        "서버가 시작할 때 spleeter:5stems 설정으로 만들어 둔 Separator의 separate_to_file을 요청 안에서 직접 호출합니다. 결과는 파일 이름에서 확장자를 뺀 폴더에 다섯 개의 WAV로 저장됩니다.",
        "Calls separate_to_file on the Separator built with the spleeter:5stems setting at startup, directly inside the request. The results are written as five WAVs in a folder named after the file without its extension.",
      ),
      method: t("기존 모델 사용", "Existing model"),
      produces: {
        icon: "audio",
        label: t("분리된 음원 5개 (WAV)", "Five separated stems (WAV)"),
        items: [
          { label: t("보컬", "Vocals"), value: "vocals.wav" },
          { label: t("드럼", "Drums"), value: "drums.wav" },
          { label: t("베이스", "Bass"), value: "bass.wav" },
          { label: t("피아노", "Piano"), value: "piano.wav" },
          { label: t("나머지", "Other"), value: "other.wav" },
        ],
      },
    },
    respond: {
      icon: "json",
      summary: [t("Success · 경로 5개", "Success · 5 paths")],
      receives: [{ icon: "audio", label: t("WAV 5개가 놓일 위치", "Where the five WAVs are written") }],
      process: t(
        "분리 호출이 끝나면 다섯 결과 파일의 경로를 만들어 Success 메시지와 함께 돌려줍니다. 각 파일이 실제로 만들어졌는지는 응답 전에 따로 확인하지 않습니다.",
        "When the separation call returns, it builds the paths of the five result files and returns them with a Success message, without first checking that each file was actually written.",
      ),
      produces: {
        icon: "json",
        label: t("응답 · Success 메시지 + 결과 경로 5개", "Reply · Success message + five result paths"),
        items: [{ label: t("경로 형식", "Path pattern"), value: t("{확장자 뺀 이름}/vocals.wav …", "{name without extension}/vocals.wav …") }],
      },
      via: [t("FastAPI 서버 → 브라우저: POST /audio 의 응답", "FastAPI server → browser: the reply to POST /audio")],
    },
    play: {
      icon: "audio",
      summary: [t("오디오 플레이어 5개", "Five audio players")],
      receives: [{ icon: "json", label: t("Success · 결과 경로 5개", "Success · five result paths") }],
      process: t(
        "응답의 경로마다 FastAPI 서버 주소를 붙여 오디오 플레이어를 만듭니다. 내려받기 경로는 파일이 있는지 확인하고, 없으면 오류 코드 대신 메시지를 돌려줍니다.",
        "Prefixes each path with the FastAPI server's address to build an audio player. The download path checks that the file exists and returns a message rather than an error code when it does not.",
      ),
      method: t("브라우저에서 실행", "Runs in the browser"),
      destination: { icon: "user", name: t("사용자 · 듣기와 내려받기", "The user · listen and download") },
      via: [t("브라우저 → FastAPI 서버의 내려받기 경로", "Browser → the FastAPI server's download path")],
    },
  },
  links: { "page>upload": "browser", "upload>receive": "audioFile", "receive>separate": "folder", "separate>respond": "audio", "respond>play": "json" },
};

/* ────────────────────────────────────────────
   코드로 확인한 흐름: 다중 시점 영상 질의응답 (평가 실행 코드)
──────────────────────────────────────────── */
const MV_EVIRAG: DetailedJourney = {
  steps: {
    input: {
      icon: "frames",
      summary: [t("질문 · 전체 프레임 · 판단 영역", "Question · full frame · region")],
      origin: { icon: "video", name: t("AIHub 다시점 감시 영상", "AIHub multi-view surveillance video") },
      receives: [{ icon: "video", label: t("여러 카메라의 감시 영상", "Surveillance video from several cameras") }],
      process: t(
        "사건마다 질문 문장과 카메라 화면 이미지 두 장(전체 프레임, 원해상도로 잘라 낸 판단 영역)을 한 줄의 입력 기록(JSONL)으로 묶습니다.",
        "Each case becomes one input record (JSONL): the question plus two images of the camera view, the full frame and a native-resolution crop of the region to judge.",
      ),
      method: t("입력 기록", "Input records"),
      produces: {
        icon: "json",
        label: t("입력 기록 한 줄 (JSONL)", "One input record (JSONL)"),
        items: [
          { label: t("질문 문장", "Question"), value: "event_question" },
          { label: t("전체 프레임 이미지", "Full-frame image"), value: "full_path" },
          { label: t("판단 영역 이미지", "Region-crop image"), value: "crop_path" },
        ],
      },
    },
    select: {
      icon: "score",
      summary: [t("화면 후보마다 0–1 점수", "0–1 score per view")],
      receives: [{ icon: "image", label: t("화면 이미지 + 질문 문장", "View image + question") }],
      process: t(
        "SigLIP2로 화면 이미지와 질문을 각각 벡터로 바꾸고, 두 벡터와 그 곱·차이, Grounding DINO 검출 수치(검출 영역 수, 사람 영역 수, 최고 신뢰도, 사람 최고 신뢰도, 영역 넓이 합)를 로지스틱 회귀에 넣어 0–1 점수를 냅니다. 답변을 만들기 전에 쓸 수 있는 점수라 어떤 입력부터 답변 모델에 보낼지 정하는 데 쓰고, 평가에서는 이 순서의 효과를 저장한 응답으로 따로 계산했습니다.",
        "SigLIP2 turns the view image and the question into vectors; the two vectors, their product and difference, and Grounding DINO detection figures (regions, person regions, top confidence, top person confidence, total region area) go into a logistic regression that outputs a 0–1 score. Being available before any answer is generated, it sets which inputs go to the answer model first; in evaluation the effect of that order was computed separately on stored replies.",
      ),
      method: t("학습한 선택 모델", "Trained selector"),
      produces: { icon: "score", label: t("화면별 가용성 점수 (0–1)", "Availability score per view (0–1)"), items: [{ label: t("가용성 점수", "Availability score"), value: "availability_score" }] },
    },
    request: {
      icon: "terminal",
      summary: [t("이미지 2장 + 질문", "2 images + question")],
      receives: [{ icon: "json", label: t("입력 기록 (JSONL 한 줄)", "One input record (JSONL)") }],
      process: t(
        "이미지 파일을 base64 data URL로 바꿔 지시문, '전체 프레임:' 이미지, '원해상도 판단영역:' 이미지, '질문:' 문장 순서로 한 메시지에 담습니다. temperature 0과 고정 seed를 쓰고, 토큰별 로그 확률을 함께 요청합니다.",
        "Converts the image files to base64 data URLs and puts the instructions, the 'full frame:' image, the 'native-resolution region:' image and the 'question:' line into one message, with temperature 0, a fixed seed, and per-token log-probabilities requested.",
      ),
      method: t("평가 실행 코드", "Evaluation code"),
      produces: {
        icon: "request",
        label: t("chat/completions 요청 (JSON)", "chat/completions request (JSON)"),
        items: [
          { label: t("지시문", "Instructions"), value: "system" },
          { label: t("전체 프레임", "Full frame"), value: "image_url · base64" },
          { label: t("판단 영역", "Region crop"), value: "image_url · base64" },
          { label: t("질문", "Question"), value: "text" },
          { label: t("설정", "Settings"), value: "temperature 0 · max_tokens 128 · logprobs" },
        ],
      },
      via: [t("평가 실행 코드 → vLLM 추론 서버: POST /chat/completions", "Evaluation code → vLLM inference server: POST /chat/completions")],
    },
    answer: {
      icon: "model",
      summary: [t("decision · answer", "decision · answer")],
      receives: [{ icon: "request", label: t("지시문 + 이미지 2장 + 질문", "Instructions + 2 images + question") }],
      process: t(
        "Qwen3-VL 8B 시각-언어 모델(그대로 쓴 모델 또는 LoRA로 정렬한 모델)이 지시문에 따라, 근거가 사건을 직접 뒷받침할 때만 짧게 답하고 아니면 정확히 '주어진 근거로는 판단 불가'라고 답합니다.",
        "The Qwen3-VL 8B vision-language model (as released, or aligned with LoRA) follows the instructions: it answers briefly only when the evidence directly supports the event, and otherwise replies exactly 'cannot be judged from the given evidence'.",
      ),
      method: t("VLM · zero-shot 또는 LoRA 정렬", "VLM · zero-shot or LoRA-aligned"),
      produces: { icon: "json", label: t("JSON 한 줄 + 토큰 로그 확률", "One line of JSON + token log-probabilities"), code: '{"decision": "answer | abstain", "answer": "…"}' },
      via: [t("vLLM 추론 서버 → 평가 실행 코드: 요청의 응답", "vLLM inference server → evaluation code: the reply")],
    },
    check: {
      icon: "check",
      summary: [t("확신도 = exp(평균 로그 확률)", "confidence = exp(mean log-prob)")],
      receives: [{ icon: "json", label: t("응답 JSON + 토큰 로그 확률", "Reply JSON + token log-probabilities") }],
      process: t(
        "응답이 decision과 answer 두 항목만 가진 JSON인지 검사하고, 형식이 다르면 그 실행을 멈춥니다. decision이 abstain이거나 보류 문장이 들어 있으면 보류로 봅니다. 확신도는 생성된 토큰 로그 확률의 평균을 지수로 바꾼 값입니다.",
        "Checks that the reply is JSON with exactly decision and answer, and stops the run if not. A decision of abstain, or the abstention sentence in the answer, counts as abstaining. Confidence is the exponential of the mean log-probability of the generated tokens.",
      ),
      method: t("규칙 · 계산", "Rules · arithmetic"),
      produces: {
        icon: "json",
        label: t("평가 기록 한 줄", "One evaluation record"),
        items: [
          { label: t("결정", "Decision"), value: "decision" },
          { label: t("답변", "Answer"), value: "answer" },
          { label: t("보류 여부", "Abstained"), value: "abstained" },
          { label: t("확신도", "Confidence"), value: "confidence" },
        ],
      },
      via: [t("평가 결과 파일(JSONL)에 한 줄씩 덧붙임", "Appended line by line to the evaluation file (JSONL)")],
    },
    release: {
      icon: "filter",
      summary: [t("확신도 순 · 정한 비율만 제공", "By confidence · up to a set share")],
      receives: [{ icon: "score", label: t("응답별 확신도", "Confidence per reply") }],
      process: t(
        "응답을 확신도가 높은 순서로 세워 정한 비율만큼만 답변으로 내보내고 나머지는 보류합니다. 평가는 답변한 비율과 그 가운데 틀린 비율(선택 위험)을 함께 봅니다.",
        "Replies are ranked by confidence; only a set share is released as answers and the rest are held. Evaluation looks at how much was answered together with how much of that was wrong (selective risk).",
      ),
      method: t("확신도 기준", "Confidence-based"),
      destination: { icon: "chart", name: t("평가 집계 · 논문", "Evaluation summary · paper") },
    },
  },
  links: { "input>select": "image", "select>request": "route", "request>answer": "request", "answer>check": "json", "check>release": "score" },
};

const DETAILED: Record<string, DetailedJourney> = {
  "smartfarm-rag:recorded:sensor-mismatch": SMARTFARM_SENSOR,
  "music-splitter-web:code:upload": MUSIC_SPLITTER,
  "mv-evirag:code:answer": MV_EVIRAG,
};

/* ────────────────────────────────────────────
   설명용 흐름: 소개 글 도식의 단계·화살표 아이콘
   (도식 순서대로. 받은 것·보낸 것은 화살표 이름을 그대로 씁니다)
──────────────────────────────────────────── */
interface DiagramIcons {
  nodes: Record<string, FlowIcon>;
  /** edges[i] 와 같은 순서 */
  edges: FlowIcon[];
}

const EXPLANATORY_ICONS: Record<string, DiagramIcons[]> = {
  "smartfarm-rag": [
    { nodes: { question: "user", route: "route", retrieve: "search", generate: "model", answer: "document" }, edges: ["text", "route", "document", "text"] },
    { nodes: { observe: "sim", explain: "model", approve: "operator", verify: "check" }, edges: ["sensor", "document", "check"] },
  ],
  "aerospace-rag": [{ nodes: { q: "user", search: "search", gen: "model" }, edges: ["text", "document"] }],
  "music-source-separation": [{ nodes: { cfg: "config", train: "gpu", exp: "chart" }, edges: ["config", "model"] }],
  "food-scan": [
    { nodes: { shoot: "phone", server: "server", vision: "model", choose: "user", db: "database", show: "nutrition" }, edges: ["image", "image", "list", "text", "nutrition"] },
  ],
  "spring-community-board": [{ nodes: { ui: "browser", app: "server", db: "database" }, edges: ["request", "records"] }],
  "introduce-cv-page": [{ nodes: { editor: "document", api: "external", pr: "pr" }, edges: ["document", "pr"] }],
  "js-quiz-app": [{ nodes: { json: "json", show: "browser", score: "list", review: "check" }, edges: ["json", "list", "list"] }],
  "good-price-jeju": [{ nodes: { open: "database", map: "map" }, edges: ["records"] }],
  "unity-hackathon": [{ nodes: { team: "team", build: "game", game: "award" }, edges: ["team", "game"] }],
  "tourism-data": [{ nodes: { raw: "records", prep: "chart", team: "team", proposal: "proposal" }, edges: ["records", "chart", "document"] }],
  "smart-home-2017": [{ nodes: { sensor: "sensor", arduino: "device", store: "database", web: "browser" }, edges: ["sensor", "records", "records"] }],
  "golden-glove": [{ nodes: { finger: "hand", fw: "device", kit: "music" }, edges: ["sensor", "code"] }],
  "hangul-clock": [{ nodes: { club: "team", clock: "clock" }, edges: ["device"] }],
  "mediamtx-installer": [{ nodes: { steps: "operator", script: "terminal", server: "server" }, edges: ["list", "terminal"] }],
  "cross-review-bridge": [{ nodes: { reviewer: "model", bridge: "terminal", approve: "operator", codex: "code" }, edges: ["document", "list", "check"] }],
};

export const LANE_ICON: Record<LaneId, FlowIcon> = {
  user: "user",
  ai: "model",
  server: "server",
  data: "database",
  field: "device",
  sim: "sim",
  tool: "terminal",
  operator: "operator",
  external: "external",
  mywork: "user",
  team: "team",
  outcome: "result",
};

function diagramIcons(flow: FlowView): DiagramIcons | null {
  const match = /:diagram:(\d+)$/.exec(flow.key);
  if (!match) return null;
  return EXPLANATORY_ICONS[flow.slug]?.[Number(match[1])] ?? null;
}

/** 단계의 여정 — 기록·코드 흐름은 적어 둔 내용을, 설명용 흐름은 도식에서 만든 내용을 돌려줍니다. */
export function journeyFor(flow: FlowView, index: number): StepJourney | null {
  const node = flow.nodes[index];
  if (!node) return null;
  const detailed = DETAILED[flow.key]?.steps[node.id];
  if (detailed) return detailed;
  const icons = diagramIcons(flow);
  const icon = icons?.nodes[node.id] ?? LANE_ICON[node.lane];
  const edgeIcon = (link: FlowLink) => icons?.edges[flow.links.indexOf(link)] ?? linkFallback(flow, link);
  const incoming = flow.links.filter((link) => link.to === node.id && link.label);
  const outgoing = flow.links.find((link) => link.from === node.id && link.label);
  return {
    icon,
    ...(incoming.length > 0 ? { receives: incoming.map((link) => ({ icon: edgeIcon(link), label: link.label! })) } : {}),
    process: node.detail,
    ...(outgoing ? { produces: { icon: edgeIcon(outgoing), label: outgoing.label! } } : {}),
  };
}

export function nodeIcon(flow: FlowView, index: number): FlowIcon {
  const node = flow.nodes[index];
  if (!node) return "result";
  return journeyFor(flow, index)?.icon ?? LANE_ICON[node.lane];
}

function linkFallback(flow: FlowView, link: FlowLink): FlowIcon {
  const node = flow.nodes.find((item) => item.id === link.from);
  return node ? LANE_ICON[node.lane] : "result";
}

/** 연결선 위를 지나는 데이터의 아이콘 */
export function linkIcon(flow: FlowView, link: FlowLink): FlowIcon {
  const detailed = DETAILED[flow.key]?.links[`${link.from}>${link.to}`];
  if (detailed) return detailed;
  const icons = diagramIcons(flow);
  const index = flow.links.indexOf(link);
  return icons?.edges[index] ?? linkFallback(flow, link);
}

/** 시험용: 모든 단계와 연결선에 직접 정한 아이콘·여정이 있는지 (레인 기본 아이콘으로 대신하지 않았는지) */
export function hasExplicitJourney(flow: FlowView): boolean {
  const detailed = DETAILED[flow.key];
  if (detailed) {
    return flow.nodes.every((node) => detailed.steps[node.id] !== undefined) && flow.links.every((link) => detailed.links[`${link.from}>${link.to}`] !== undefined);
  }
  const icons = diagramIcons(flow);
  if (!icons) return false;
  return flow.nodes.every((node) => icons.nodes[node.id] !== undefined) && icons.edges.length === flow.links.length;
}

/** 시험용: 여정에 들어 있는 모든 사람이 읽는 문장 */
export function journeyText(journey: StepJourney): Localized[] {
  const out: Localized[] = [journey.process];
  const payload = (value?: JourneyPayload) => {
    if (!value) return;
    out.push(value.label);
    value.items?.forEach((item) => {
      out.push(item.label);
      if (item.value && typeof item.value !== "string") out.push(item.value);
      if (typeof item.value === "string") out.push({ ko: item.value, en: item.value });
    });
    if (value.code) out.push({ ko: value.code, en: value.code });
  };
  journey.summary?.forEach((line) => out.push(line));
  if (journey.origin) out.push(journey.origin.name);
  journey.receives?.forEach(payload);
  if (journey.method) out.push(journey.method);
  payload(journey.produces);
  if (journey.destination) out.push(journey.destination.name);
  journey.via?.forEach((line) => out.push(line));
  return out;
}
