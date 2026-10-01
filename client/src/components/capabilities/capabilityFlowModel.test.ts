import { describe, expect, it } from "vitest";
import type { Localized } from "./capabilityModel";
import { AREA_PROJECTS, ARCHITECTURES } from "./capabilityArchitectures";
import {
  estimateLabelWidth,
  flowProvenance,
  flowViewsFor,
  labelFits,
  nodeLabel,
  routeKind,
  routePath,
  type FlowView,
  type GridCell,
} from "./capabilityFlowModel";
import { CODE_FLOWS } from "./capabilityCodeFlows";
import { hasExplicitJourney, journeyFor, journeyText } from "./capabilityJourneys";
import { RECORDED_FLOWS, SENSOR_TRACE_FACTS, SMARTFARM_SENSOR_TRACE } from "./capabilityRecordedTraces";

const ALL_SLUGS = Object.keys(ARCHITECTURES);
/** 저장소 코드에서 확인한 흐름이 있는 프로젝트 */
const CODE_SLUGS = ["mv-evirag", "music-splitter-web"];

/** 흐름 안의 모든 사람이 읽는 문장 (넓게 보기의 단계 여정 포함) */
function allText(flow: FlowView): string[] {
  const out: Localized[] = [];
  const push = (value?: Localized) => value && out.push(value);
  flow.nodes.forEach((_, index) => {
    const journey = journeyFor(flow, index);
    if (journey) journeyText(journey).forEach(push);
  });
  push(flow.title);
  push(flow.caption);
  push(flow.provenance);
  push(flow.source.summary);
  flow.source.items.forEach((item) => {
    push(item.term);
    push(item.text);
  });
  flow.source.limits.forEach(push);
  flow.links.forEach((link) => push(link.label));
  flow.nodes.forEach((node) => {
    push(node.title);
    push(node.short);
    push(node.label);
    push(node.detail);
    push(node.tag);
    const body = node.body;
    if (!body) return;
    if (body.kind === "readings") body.readings.forEach((reading) => push(reading.label));
    if (body.kind === "count") {
      push(body.label);
      push(body.note);
    }
    if (body.kind === "quality") push(body.excludedTag);
    if (body.kind === "range") push(body.reading.label);
    if (body.kind === "count") push(body.stamp?.label);
    if (body.kind === "note") {
      push(body.text);
      push(body.muted);
    }
    if (body.kind === "cross") [body.neq, body.verdict, body.chip].forEach(push);
    if (body.kind === "marker") {
      push(body.place);
      push(body.note);
    }
  });
  return out.flatMap((value) => [value.ko, value.en]);
}

describe("capability flow model", () => {
  it("keeps all 17 projects, each with at least one flow", () => {
    expect(ALL_SLUGS).toHaveLength(17);
    for (const slug of ALL_SLUGS) expect(flowViewsFor(slug).length).toBeGreaterThan(0);
    for (const slugs of Object.values(AREA_PROJECTS)) for (const slug of slugs) expect(ARCHITECTURES[slug]).toBeDefined();
  });

  it("puts the recorded Smartfarm replay first and keeps the documented flows after it", () => {
    const flows = flowViewsFor("smartfarm-rag");
    expect(flows.map((flow) => flow.evidence)).toEqual(["recorded", "explanatory", "explanatory"]);
    expect(flows[0].key).toBe(SMARTFARM_SENSOR_TRACE.key);
    // 기록된 예시는 스마트팜 하나뿐입니다.
    expect(RECORDED_FLOWS.map((flow) => flow.slug)).toEqual(["smartfarm-rag"]);
    // 코드로 확인한 흐름은 두 프로젝트에만 있고, 그 프로젝트의 소개 글 도식을 대신합니다.
    expect(CODE_FLOWS.map((flow) => flow.slug).sort()).toEqual([...CODE_SLUGS].sort());
    for (const slug of CODE_SLUGS) expect(flowViewsFor(slug).map((flow) => flow.evidence)).toEqual(["code"]);
    for (const slug of ALL_SLUGS.filter((item) => item !== "smartfarm-rag" && !CODE_SLUGS.includes(item))) {
      expect(flowViewsFor(slug).every((flow) => flow.evidence === "explanatory")).toBe(true);
    }
  });

  it("never draws example data inside explanatory or code-traced flows", () => {
    for (const slug of ALL_SLUGS) {
      for (const flow of flowViewsFor(slug).filter((item) => item.evidence !== "recorded")) {
        expect(flow.nodes.every((node) => node.body === undefined)).toBe(true);
        expect(flow.recordedOn).toBeUndefined();
        expect(flow.source.limits.some((limit) => limit.ko.includes("실행 기록이 아니"))).toBe(true);
      }
    }
  });

  it("gives every step of every flow an icon and a received → processed → sent journey", () => {
    for (const slug of ALL_SLUGS) {
      for (const flow of flowViewsFor(slug)) {
        // 아이콘과 여정을 레인 기본값으로 대신하지 않고 단계마다 직접 정했습니다.
        expect(hasExplicitJourney(flow)).toBe(true);
        flow.nodes.forEach((node, index) => {
          const journey = journeyFor(flow, index);
          expect(journey?.process.ko.length).toBeGreaterThan(0);
          expect(journey?.process.en.length).toBeGreaterThan(0);
          // 첫 단계 말고는 받은 것이, 마지막 단계 말고는 보낸 곳이 있습니다 (연결선 또는 출발·도착점).
          if (index > 0) expect(flow.links.some((link) => link.to === node.id)).toBe(true);
          if (index === flow.nodes.length - 1 && flow.evidence !== "explanatory") expect(journey?.destination).toBeDefined();
          if (index === 0 && flow.evidence !== "explanatory") expect(journey?.origin).toBeDefined();
        });
      }
    }
  });

  it("keeps the code-traced flows to names and formats from the code, with no run values", () => {
    for (const flow of CODE_FLOWS) {
      const text = allText(flow).join("\n");
      // 점수·정확도·처리 시간 같은 실행 결과 수치를 적지 않습니다.
      expect(text).not.toMatch(/\d+(\.\d+)?\s*%|\b0\.\d{2,}\b|\d+(\.\d+)?\s*ms\b|\d+(\.\d+)?\s*초/);
    }
    const splitter = CODE_FLOWS.find((flow) => flow.slug === "music-splitter-web")!;
    const splitterText = allText(splitter).join("\n");
    // 브라우저가 FastAPI 로 직접 보내는 코드상의 경로를 그립니다 (Spring 서버를 거치지 않음).
    expect(splitter.links.find((link) => link.from === "upload")?.to).toBe("receive");
    expect(splitterText).toContain("POST /audio");
    expect(splitterText).toContain("spleeter:5stems");
    for (const stem of ["vocals", "drums", "bass", "piano", "other"]) expect(splitterText).toContain(`${stem}.wav`);
    const mv = CODE_FLOWS.find((flow) => flow.slug === "mv-evirag")!;
    const mvText = allText(mv).join("\n");
    expect(mvText).toContain('{"decision": "answer | abstain", "answer": "…"}');
    expect(mvText).toContain("주어진 근거로는 판단 불가");
    expect(mvText).toContain("POST /chat/completions");
  });

  it("wires every flow consistently", () => {
    for (const slug of ALL_SLUGS) {
      for (const flow of flowViewsFor(slug)) {
        const ids = flow.nodes.map((node) => node.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const node of flow.nodes) expect(flow.lanes).toContain(node.lane);
        for (const link of flow.links) {
          expect(ids).toContain(link.from);
          expect(ids).toContain(link.to);
          // 재생 순서상 앞에서 뒤로만 흐릅니다.
          expect(ids.indexOf(link.from)).toBeLessThan(ids.indexOf(link.to));
        }
        // 첫 단계 말고는 모두 들어오는 연결선이 있습니다.
        for (const id of ids.slice(1)) expect(flow.links.some((link) => link.to === id)).toBe(true);
        if (flow.evidence === "explanatory") expect(flow.links).toHaveLength(flow.nodes.length - 1);
      }
    }
  });

  it("replays exactly the values captured from the dashboard screen", () => {
    expect(SENSOR_TRACE_FACTS.recordedOn).toBe("2026-10-01");
    expect(SENSOR_TRACE_FACTS.readings.map((reading) => [reading.label.ko, reading.value, reading.unit, reading.doubtful === true])).toEqual([
      ["근권 온도", "16.0", "°C", false],
      ["재배실 온도", "65.0", "°C", true],
      ["상대 습도", "72", "%", false],
      ["배지 수분지수", "59", "%", false],
    ]);
    expect([SENSOR_TRACE_FACTS.received, SENSOR_TRACE_FACTS.good, SENSOR_TRACE_FACTS.doubtful]).toEqual([20, 19, 1]);
    const quality = SMARTFARM_SENSOR_TRACE.nodes.find((node) => node.id === "quality")?.body;
    expect(quality).toMatchObject({ kind: "quality", good: 19, doubtful: 1 });
    const cross = SMARTFARM_SENSOR_TRACE.nodes.find((node) => node.id === "judge")?.body;
    expect(cross?.kind).toBe("cross");
    if (cross?.kind === "cross") {
      expect(cross.doubt.value).toBe("65.0");
      expect(cross.partners.map((reading) => reading.value)).toEqual(["16.0", "72"]);
      expect(cross.verdict.ko).toBe("재배실 온도 센서 이상 의심");
      expect(cross.chip.ko).toBe("이 값으로는 설비를 조작하지 않음");
    }
    // 연결선 이름표도 대시보드 화면에 나온 그대로입니다.
    expect(SMARTFARM_SENSOR_TRACE.links.map((link) => link.label?.ko ?? null)).toEqual(["20개", null, "정상 19", "의심 1", "벗어남 0", "알림 1"]);
    // 기준 범위 비교와 수신 시각도 화면 기록에서 옮겼습니다.
    expect(SENSOR_TRACE_FACTS.lastObservedAt).toBe("13:37:45");
    const range = SMARTFARM_SENSOR_TRACE.nodes.find((node) => node.id === "range")?.body;
    expect(range).toMatchObject({ kind: "range", lower: 55, upper: 78, inRange: 3, outside: 0, noRange: 16 });
    if (range?.kind === "range") expect([range.reading.label.ko, range.reading.value]).toEqual(["상대 습도", "72"]);
    expect(range?.kind === "range" && range.inRange + range.outside + range.noRange).toBe(SENSOR_TRACE_FACTS.good);
    const intake = SMARTFARM_SENSOR_TRACE.nodes.find((node) => node.id === "intake")?.body;
    expect(intake?.kind === "count" && intake.stamp?.value).toBe("13:37:45");
    // 기록된 흐름은 모든 단계에 화면에서 옮긴 실제 값이 있고, "옮기지 않음" 같은 빈 자리는 없습니다.
    expect(SMARTFARM_SENSOR_TRACE.nodes.every((node) => node.body !== undefined && node.body.kind !== "note")).toBe(true);
    expect(allText(SMARTFARM_SENSOR_TRACE).join("\n")).not.toContain("옮기지 않");
  });

  it("labels the replay as a simulator record with its limits", () => {
    const text = allText(SMARTFARM_SENSOR_TRACE).join("\n");
    expect(text).toContain("시뮬레이터");
    expect(text).toContain("simulator");
    expect(text).toContain("실제 농장");
    expect(SMARTFARM_SENSOR_TRACE.source.limits.length).toBeGreaterThanOrEqual(4);
  });

  it("gives every flow a one-line provenance under the diagram: simulator and rules, code (not a run), or write-up only", () => {
    expect(flowProvenance(SMARTFARM_SENSOR_TRACE, "ko")).toBe("2026-10-01 화면 기록 · 시뮬레이터 값 · 정해진 규칙으로 판단 · 실제 농장 아님");
    for (const flow of CODE_FLOWS) {
      expect(flowProvenance(flow, "ko")).toContain("실행 기록 아님");
      expect(flowProvenance(flow, "en")).toContain("not a run record");
    }
    for (const slug of ALL_SLUGS) {
      for (const flow of flowViewsFor(slug).filter((item) => item.evidence === "explanatory")) {
        expect(flowProvenance(flow, "ko")).toContain("실제 값 없음");
        if (flow.scope === "overview") expect(flowProvenance(flow, "ko")).toContain("개요 수준");
      }
    }
  });

  it("names each diagram box briefly enough for a narrow column, falling back to the step title", () => {
    for (const slug of ALL_SLUGS) {
      for (const flow of flowViewsFor(slug)) {
        for (const node of flow.nodes) {
          // 단계가 많은 흐름은 좁은 칸(약 78px)에 세 줄 안쪽으로 들어가도록 상자 이름의 글자 폭을 190px 이하로 둡니다.
          if (flow.nodes.length >= 5) {
            expect(estimateLabelWidth(nodeLabel(node, "ko"))).toBeLessThanOrEqual(190);
            expect(estimateLabelWidth(nodeLabel(node, "en"))).toBeLessThanOrEqual(190);
          }
          expect(nodeLabel(node, "ko")).toBe((node.label ?? node.title).ko);
        }
      }
    }
    // MusicSplitterWeb 의 상자는 실제 구성 요소 이름을 씁니다 (Spring 은 화면, 업로드는 브라우저 → FastAPI).
    const splitter = CODE_FLOWS.find((flow) => flow.slug === "music-splitter-web")!;
    expect(splitter.nodes.map((node) => nodeLabel(node, "ko"))).toEqual(["Spring 로그인·화면", "브라우저 업로드", "FastAPI /audio", "Spleeter 분리", "FastAPI 응답", "재생·내려받기"]);
  });

  it("shows no private paths, local addresses or URLs on the page", () => {
    for (const slug of ALL_SLUGS) {
      for (const flow of flowViewsFor(slug)) {
        for (const line of allText(flow)) {
          expect(line).not.toMatch(/[A-Za-z]:\\|\/Users\/|\\Users\\|127\.0\.0\.1|localhost|https?:\/\/|:\d{4}\b/);
        }
      }
    }
  });

  it("routes the recorded wires around the boxes, like the dashboard", () => {
    const flow = SMARTFARM_SENSOR_TRACE;
    const rows = new Map(flow.lanes.map((lane, row) => [lane, row]));
    const cells: GridCell[] = flow.nodes.map((node, col) => ({ id: node.id, row: rows.get(node.lane) ?? 0, col }));
    const cell = (id: string) => cells.find((item) => item.id === id)!;
    expect(routeKind(cell("sense"), cell("intake"), cells)).toBe("across");
    expect(routeKind(cell("intake"), cell("quality"), cells)).toBe("straight");
    expect(routeKind(cell("quality"), cell("range"), cells)).toBe("straight");
    // 의심 값은 기준 범위 상자를 건너뛰고, 품질 검사 위로 나와 판단 레인을 따라 갑니다.
    expect(routeKind(cell("quality"), cell("judge"), cells)).toBe("rise");
    expect(routeKind(cell("range"), cell("judge"), cells)).toBe("across");
    expect(routeKind(cell("judge"), cell("plan"), cells)).toBe("across");
  });

  it("turns routes into paths with room for a label on their long run", () => {
    const a = { x: 0, y: 300, w: 150, h: 80 };
    const across = routePath("across", a, { x: 180, y: 160, w: 150, h: 80 });
    expect(across.d).toBe("M150 340H247Q255 340 255 332V240");
    expect(across.label).toEqual({ x: 198.5, y: 340, room: 97 });
    const rise = routePath("rise", a, { x: 400, y: 60, w: 150, h: 80 });
    expect(rise.d).toBe("M75 300V108Q75 100 83 100H400");
    expect(rise.label?.room).toBe(317);
    const straight = routePath("straight", a, { x: 234, y: 300, w: 150, h: 80 });
    expect(straight.d).toBe("M150 340H234");
    expect(routePath("gap", a, { x: 180, y: 300, w: 150, h: 80 }).label).toBeNull();
  });

  it("only puts a label on a wire when it fits (two lines at most, at the 13px label size)", () => {
    expect(estimateLabelWidth("정상 19")).toBe(49);
    expect(labelFits("정상 19", 84)).toBe(true);
    expect(labelFits("", 200)).toBe(false);
    expect(labelFits("선택된 검색 조합", 30)).toBe(false);
    // 글자를 키운 만큼 긴 영어 이름표는 더 넓은 자리가 있어야 선 위에 놓입니다 (아니면 받는 상자 안에 적음).
    expect(labelFits("evidence · explanation", 97)).toBe(false);
    expect(labelFits("evidence · explanation", 120)).toBe(true);
  });
});
