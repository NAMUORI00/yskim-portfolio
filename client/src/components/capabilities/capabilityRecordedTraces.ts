/*
 * 기록된 예시 재생 (홈 프로젝트 자세히 보기의 작은 도식과 넓게 보기)
 * ─────────────────────────────────────────────────────────────
 * 이 파일의 값은 2026-10-01 로컬 검토 환경에서 스마트팜 운영 지원 시스템 대시보드
 * 첫 화면의 "센서 값이 서로 맞지 않을 때" 흐름에 실제로 표시된 값과 문구만 옮겼습니다.
 * 시뮬레이터 기록이며 실제 농장 측정이 아닙니다.
 * 이 페이지는 대시보드·모델·백엔드를 호출하지 않습니다.
 *
 * 값의 근거 (사람이 읽는 출처는 아래 source 에 있습니다)
 *   - 화면 확인(2026-10-01 화면 기록 사본): A구역 근권 온도 16.0°C, 재배실 온도 65.0°C, 상대 습도 72%,
 *     배지 수분지수 59%, 외 16개 · 2초 주기 수신 13:37:45 · 정상 19, 의심 1, 재배실 온도 65.0 판단 제외 ·
 *     기준 범위 비교: 상대 습도 72% 기준 55–78, 기준 안 3, 벗어남 0, 기준 없음 16 ·
 *     근권 16.0 · 상대 습도 72 와 교차 확인 → 재배실 온도 센서 이상 의심, 이 값으로는 설비를 조작하지 않음 ·
 *     배치도 A구역 번호 1 · 연결선 이름표 20개, 의심 1, 벗어남 0, 알림 1
 *   - 대시보드 코드: 단계 이름, 연결선 이름표 형식, 판단 문구 형식, 2초 주기 요청
 *   - 시뮬레이터 코드: 센서 고장 상황에서 재배실 온도 65 °C·품질 bad, 상대 습도 72%·배지 수분지수 59% 기본값, 2초 주기
 */
import type { Localized } from "./capabilityModel";
import type { FlowReading, FlowView } from "./capabilityFlowModel";

const t = (ko: string, en: string): Localized => ({ ko, en });

const ROOT_ZONE: FlowReading = { label: t("근권 온도", "Root-zone temperature"), value: "16.0", unit: "°C" };
const ROOM: FlowReading = { label: t("재배실 온도", "Room temperature"), value: "65.0", unit: "°C", doubtful: true };
const HUMIDITY: FlowReading = { label: t("상대 습도", "Relative humidity"), value: "72", unit: "%" };
const MOISTURE: FlowReading = { label: t("배지 수분지수", "Substrate moisture index"), value: "59", unit: "%" };

/** 화면에서 옮긴 수치 — 시험과 요약에서 같은 값을 씁니다. */
export const SENSOR_TRACE_FACTS = {
  recordedOn: "2026-10-01",
  zone: t("A구역", "Zone A"),
  readings: [ROOT_ZONE, ROOM, HUMIDITY, MOISTURE],
  received: 20,
  good: 19,
  doubtful: 1,
  /** 2초 주기 수신 상자에 표시된 가장 최근 관측 시각 (한국 시간) */
  lastObservedAt: "13:37:45",
  range: { reading: HUMIDITY, lower: 55, upper: 78, inRange: 3, outside: 0, noRange: 16 },
  alerts: 1,
} as const;

export const SMARTFARM_SENSOR_TRACE: FlowView = {
  key: "smartfarm-rag:recorded:sensor-mismatch",
  slug: "smartfarm-rag",
  evidence: "recorded",
  recordedOn: SENSOR_TRACE_FACTS.recordedOn,
  scope: "detailed",
  title: t("센서 값이 서로 맞지 않을 때", "When sensors disagree"),
  caption: t(
    "운영 지원 시스템 대시보드가 시뮬레이터의 A구역 값을 받아, 품질이 의심되는 재배실 온도 65.0°C를 판단에서 빼고 같은 구역의 다른 센서와 교차 확인한 기록입니다.",
    "The operations-support dashboard takes Zone A readings from the simulator, leaves the doubtful 65.0°C room temperature out of the judgement, and cross-checks it against the zone's other sensors.",
  ),
  provenance: t(
    "2026-10-01 화면 기록 · 시뮬레이터 값 · 정해진 규칙으로 판단 · 실제 농장 아님",
    "Screen record, 2026-10-01 · simulator values · judged by fixed rules · not a real farm",
  ),
  lanes: ["user", "ai", "server", "sim"],
  nodes: [
    {
      id: "sense",
      lane: "sim",
      title: t("센서 측정 · A구역", "Sensors · Zone A"),
      short: t("A구역 센서 값", "Zone A readings"),
      label: t("A구역 센서", "Zone A sensors"),
      detail: t(
        "시뮬레이터가 보낸 A구역 관측 20개 중 주요 4개입니다. 근권 온도 16.0°C, 재배실 온도 65.0°C, 상대 습도 72%, 배지 수분지수 59%가 먼저 표시됐습니다.",
        "Four key readings of the 20 Zone A values sent by the simulator: root-zone temperature 16.0°C, room temperature 65.0°C, relative humidity 72% and substrate moisture index 59%.",
      ),
      body: { kind: "readings", readings: [ROOT_ZONE, ROOM, HUMIDITY, MOISTURE], note: t("외 16개", "+16 more") },
    },
    {
      id: "intake",
      lane: "server",
      title: t("2초 주기 수신", "Received every 2 s"),
      short: t("수신 20개", "20 received"),
      detail: t(
        "대시보드가 2초마다 현재 상태를 받아 옵니다. 이 기록에서 A구역 값은 20개였고, 가장 최근 관측 시각은 13:37:45였습니다.",
        "The dashboard fetches the current state every 2 seconds. In this record Zone A had 20 values, the latest observed at 13:37:45.",
      ),
      body: {
        kind: "count",
        value: "20",
        label: t("개 값 수신", "values received"),
        note: t("A구역", "Zone A"),
        stamp: { label: t("최근 관측", "Latest reading"), value: SENSOR_TRACE_FACTS.lastObservedAt },
      },
    },
    {
      id: "quality",
      lane: "server",
      title: t("품질 검사", "Quality check"),
      short: t("정상 19 · 의심 1", "19 good · 1 doubtful"),
      detail: t(
        "값마다 붙은 품질 표시를 확인합니다. 20개 중 19개는 정상, 1개는 의심이었고, 의심 값인 재배실 온도 65.0°C는 판단 근거에서 뺐습니다.",
        "Checks the quality flag on each value: 19 of 20 passed and 1 was doubtful. The doubtful room temperature of 65.0°C was left out of the judgement.",
      ),
      body: { kind: "quality", good: 19, doubtful: 1, excluded: ROOM, excludedTag: t("판단 제외", "Left out") },
    },
    {
      id: "range",
      lane: "server",
      title: t("기준 범위 비교", "Range check"),
      short: t("기준 범위 비교", "Range check"),
      detail: t(
        "품질 검사를 통과한 19개 값을 농장에 등록된 운영 기준과 비교했습니다. 기준 안 3개, 벗어남 0개, 기준이 등록되지 않은 값 16개였고, 상대 습도 72%는 기준 55–78 안이었습니다.",
        "The 19 values that passed the quality check were compared with the farm's registered ranges: 3 in range, 0 out of range, 16 without a registered range. Relative humidity at 72% sat inside its 55–78 range.",
      ),
      body: { kind: "range", ...SENSOR_TRACE_FACTS.range },
    },
    {
      id: "judge",
      lane: "ai",
      title: t("센서 교차 확인", "Cross-checking sensors"),
      short: t("센서 이상 의심", "Sensor suspect"),
      label: t("센서 교차 확인", "Sensor cross-check"),
      tag: t("규칙", "Rules"),
      detail: t(
        "의심 값을 같은 구역에서 정상인 근권 온도 16.0°C, 상대 습도 72%와 비교합니다. 다른 센서가 정상이어서 '재배실 온도 센서 이상 의심'으로 판단하고, 이 값으로는 설비를 조작하지 않는다고 표시했습니다.",
        "Compares the doubtful value with the zone's sound readings: root-zone temperature 16.0°C and relative humidity 72%. With those normal, it concluded 'room temperature sensor suspect' and marked that no equipment is operated on this value.",
      ),
      body: {
        kind: "cross",
        doubt: ROOM,
        partners: [ROOT_ZONE, HUMIDITY],
        neq: t("같은 구역 다른 센서", "Other sensors, same zone"),
        verdict: t("재배실 온도 센서 이상 의심", "Room temperature sensor suspect"),
        chip: t("이 값으로는 설비를 조작하지 않음", "No equipment is operated on this value"),
      },
    },
    {
      id: "plan",
      lane: "user",
      title: t("배치도 표시", "Shown on the plan"),
      short: t("A구역 표시", "Zone A marked"),
      detail: t(
        "판단한 곳을 대시보드 배치도의 A구역에 번호 1로 표시합니다.",
        "The place the judgement concerns is pinned with number 1 on Zone A of the dashboard's farm plan.",
      ),
      body: { kind: "marker", place: t("A구역", "Zone A"), pin: "1", note: t("배치도는 단순화해 표시만 남김", "Plan simplified to the mark") },
    },
  ],
  links: [
    { from: "sense", to: "intake", label: t("20개", "20 values") },
    { from: "intake", to: "quality" },
    { from: "quality", to: "range", label: t("정상 19", "19 good") },
    { from: "quality", to: "judge", label: t("의심 1", "1 doubtful") },
    { from: "range", to: "judge", label: t("벗어남 0", "0 out") },
    { from: "judge", to: "plan", label: t("알림 1", "Alert 1") },
  ],
  source: {
    summary: t("2026-10-01 화면 기록 · 시뮬레이터", "Screen record, 2026-10-01 · simulator"),
    items: [
      {
        term: t("기록한 곳", "Where"),
        text: t(
          "스마트팜 운영 지원 시스템 대시보드 첫 화면의 '센서 값이 서로 맞지 않을 때' 흐름 (로컬 검토 환경)",
          "The 'When sensors disagree' flow on the first page of the smart-farm operations-support dashboard (local review environment)",
        ),
      },
      {
        term: t("기록한 날", "Recorded"),
        text: t("2026-10-01 — 화면에 표시된 값과 문구를 그대로 옮겼습니다.", "2026-10-01, with values and wording copied from the screen."),
      },
      {
        term: t("옮긴 값", "Values copied"),
        text: t(
          "A구역 근권 온도 16.0°C, 재배실 온도 65.0°C, 상대 습도 72%, 배지 수분지수 59%, 외 16개 · 최근 관측 13:37:45 · 정상 19, 의심 1 · 기준 안 3, 벗어남 0, 기준 없음 16 (상대 습도 기준 55–78) · '재배실 온도 센서 이상 의심' · '이 값으로는 설비를 조작하지 않음' · 배치도의 A구역 번호 1 · 연결선의 20개, 의심 1, 벗어남 0, 알림 1",
          "Zone A root-zone temperature 16.0°C, room temperature 65.0°C, relative humidity 72%, substrate moisture index 59%, +16 more · latest reading 13:37:45 · 19 good, 1 doubtful · 3 in range, 0 out, 16 without a range (humidity range 55–78) · 'room temperature sensor suspect' · 'no equipment is operated on this value' · pin 1 on Zone A · wire labels 20 values, 1 doubtful, 0 out, alert 1",
        ),
      },
      {
        term: t("값이 나온 곳", "Where the values come from"),
        text: t(
          "시뮬레이터가 만든 합성 관측입니다. 시뮬레이터의 센서 고장 상황은 재배실 온도를 65 °C, 품질 bad로 내보내고, 상대 습도 72%와 배지 수분지수 59%는 시뮬레이터의 기본값입니다.",
          "Synthetic readings made by the simulator. Its sensor-fault event sends a room temperature of 65 °C flagged as bad quality; 72% relative humidity and a 59% substrate moisture index are the simulator's defaults.",
        ),
      },
      {
        term: t("전달 경로 (코드)", "Route (code)"),
        text: t(
          "운영 API가 텔레메트리 서비스에서 GET /v1/telemetry/snapshot 으로 상태를 가져오고, 대시보드는 2초마다 GET /v1/dashboard/snapshot 으로 그 상태를 받습니다. 운영 기준은 GET /v1/cultivation-strategies 로 받습니다.",
          "The operations API reads the state from the telemetry service with GET /v1/telemetry/snapshot, and the dashboard fetches it every 2 seconds with GET /v1/dashboard/snapshot. Operating ranges come from GET /v1/cultivation-strategies.",
        ),
      },
      {
        term: t("판단 방식", "How it is judged"),
        text: t(
          "품질 검사, 기준 범위 비교, 교차 확인은 모두 정해진 규칙으로 계산합니다. 교차 확인의 판단 문구도 언어 모델이 아니라 규칙으로 만듭니다.",
          "The quality check, range check and cross-check are all computed with fixed rules; the cross-check wording also comes from rules, not a language model.",
        ),
      },
    ],
    limits: [
      t("실제 농장의 측정값이나 설비 제어 결과가 아닙니다.", "Not real farm measurements or equipment-control results."),
      t("단계 사이 재생 간격은 보기 쉽게 정한 속도이며 실제 처리 시간이 아닙니다.", "The pace between steps is for viewing, not processing time."),
      t("대시보드 화면도 20개 중 주요 4개만 값으로 보여 주고, 나머지는 '외 16개'로 묶어 표시했습니다.", "The dashboard itself showed values for 4 key readings and grouped the rest as '+16 more'."),
      t("배치도는 단순화해 A구역 표시만 남겼습니다.", "The farm plan is simplified to the Zone A mark."),
      t("이 페이지는 대시보드나 모델을 호출하지 않고, 옮겨 둔 기록만 재생합니다.", "This page calls no dashboard or model; it only replays the copied record."),
    ],
  },
};

/** 기록된 흐름 — 출처가 확인된 기록만 둡니다. */
export const RECORDED_FLOWS: FlowView[] = [SMARTFARM_SENSOR_TRACE];
