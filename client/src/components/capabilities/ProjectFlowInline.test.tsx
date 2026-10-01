// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioContent } from "@/content";
import { LIGHT } from "@/content/theme";
import { flowViewsFor } from "./capabilityFlowModel";
import { START_DELAY_MS } from "./flowPlayback";
import { inputsOf, outputsOf, stageLayout } from "./FlowJourneyView";
import { INLINE_STEP_MS, ProjectFlowInline } from "./ProjectFlowInline";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = (slug: string) => portfolioContent.projects.find((item) => item.slug === slug)!;

function Harness({ slug }: { slug: string }) {
  const flows = flowViewsFor(slug);
  const [key, setKey] = useState(flows[0].key);
  const flow = flows.find((item) => item.key === key) ?? flows[0];
  return <ProjectFlowInline project={project(slug)} flows={flows} flow={flow} onFlowChange={setKey} T={LIGHT} locale="ko" lead="한 문장" />;
}

let container: HTMLDivElement;
let root: Root;

function mount(slug: string) {
  act(() => root.render(<Harness slug={slug} />));
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const nodes = () => Array.from(container.querySelectorAll<HTMLButtonElement>(".fj-node"));
const current = () => container.querySelector('.fj-node[aria-current="step"]')?.textContent ?? "";
const note = () => container.querySelector(".fj-note")?.textContent ?? "";
const playButton = () => Array.from(container.querySelectorAll<HTMLButtonElement>(".fj-btn")).find((button) => !button.getAttribute("aria-label"));
const key = (target: Element, name: string) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
  });

function reduceMotion() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  // 대화상자 정리(초점 복귀)에 쓰인 0ms 타이머까지 흘려보낸 뒤 실제 타이머로 돌아갑니다.
  if (vi.isFakeTimers()) {
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
  container.remove();
  vi.useRealTimers();
});

describe("ProjectFlowInline — one flow, played once, then explored a step at a time", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  });

  it("plays the code-traced MusicSplitterWeb flow once, the note following each step's input and output", () => {
    mount("music-splitter-web");
    expect(current()).toBe("");
    expect(playButton()?.textContent).toBe("멈춤");

    advance(START_DELAY_MS);
    expect(current()).toContain("Spring 로그인·화면");
    for (const part of ["Spring Boot · 로그인과 업로드 화면", "받음", "사용자 브라우저", "보냄", "업로드 화면"]) expect(note()).toContain(part);

    advance(INLINE_STEP_MS);
    expect(current()).toContain("브라우저 업로드");
    // 브라우저가 FormData 로 FastAPI /audio 에 직접 보냅니다 (Spring 서버를 거치지 않음).
    for (const part of ["브라우저가 음원을 직접 전송", "POST /audio", "FastAPI /audio", "FormData"]) expect(note()).toContain(part);

    for (let step = 3; step <= 6; step += 1) advance(INLINE_STEP_MS);
    expect(current()).toContain("재생·내려받기");
    expect(note()).toContain("사용자 · 듣기와 내려받기");
    expect(playButton()?.textContent).toBe("다시 재생");
    expect(vi.getTimerCount()).toBe(0);
    // 한 번 끝까지 재생하면 모든 단계가 켜진 채로 남습니다.
    expect(container.querySelectorAll(".fj-node.is-off")).toHaveLength(0);
  });

  it("after playback, picks a step by click or arrow keys without switching other steps off", () => {
    mount("mv-evirag");
    advance(START_DELAY_MS);
    for (let step = 2; step <= 6; step += 1) advance(INLINE_STEP_MS);

    act(() => nodes()[4].click());
    expect(current()).toContain("응답 검사·확신도");
    expect(note()).toContain("JSON + 토큰 확률");
    // 코드의 항목 이름만 보여 주고 실행 값은 넣지 않습니다.
    for (const field of ["decision", "abstained", "confidence"]) expect(note()).toContain(field);
    expect(note()).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(container.querySelectorAll(".fj-node.is-off")).toHaveLength(0);

    // 단계 단추는 Tab 한 번으로 들어가고(지금 단계만 tabindex=0) 화살표·Home·End 로 옮깁니다.
    expect(nodes().filter((button) => button.tabIndex === 0)).toEqual([nodes()[4]]);
    act(() => nodes()[4].focus());
    key(nodes()[4], "ArrowLeft");
    expect(current()).toContain("VLM 답변·보류");
    expect(document.activeElement).toBe(nodes()[3]);
    key(nodes()[3], "Home");
    expect(current()).toContain("질문 + 화면");
    expect(document.activeElement).toBe(nodes()[0]);
    key(nodes()[0], "End");
    expect(current()).toContain("제공·보류");
    expect(document.activeElement).toBe(nodes()[5]);
    expect(nodes()[5].getAttribute("aria-describedby")).toBe(container.querySelector(".fj-note")?.id);
  });

  it("picking a step during playback pauses there; play continues from it", () => {
    mount("food-scan");
    advance(START_DELAY_MS);
    advance(INLINE_STEP_MS);
    act(() => nodes()[3].click());
    expect(current()).toContain("음식 선택");
    expect(playButton()?.textContent).toBe("재생");
    expect(vi.getTimerCount()).toBe(0);
    expect(nodes()[4].className).toContain("is-off");
    act(() => playButton()!.click());
    advance(INLINE_STEP_MS);
    expect(current()).toContain("영양정보 DB");
  });

  it("switches between the Smartfarm flows with the keyboard; the recorded flow carries the screen values", () => {
    mount("smartfarm-rag");
    const tabs = () => Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs()).toHaveLength(3);
    advance(START_DELAY_MS);
    advance(INLINE_STEP_MS);
    advance(INLINE_STEP_MS);
    expect(current()).toContain("품질 검사");
    for (const part of ["65.0", "판단 제외", "정상 19", "의심 1", "센서 교차 확인"]) expect(note()).toContain(part);
    expect(container.querySelector(".fj-cap")?.textContent).toContain("실제 농장 아님");

    act(() => {
      tabs()[0].focus();
      tabs()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(tabs()[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs()[1]);
    expect(container.querySelector('[role="tabpanel"]')?.getAttribute("aria-labelledby")).toBe(tabs()[1].id);
    expect(container.querySelector(".fj-cap")?.textContent).toContain("설명용 흐름");
    // 새 흐름은 처음부터 다시 재생하고, 기록 값은 그리지 않습니다.
    expect(current()).toBe("");
    advance(START_DELAY_MS);
    expect(current()).toContain("질문");
    expect(container.textContent).not.toContain("65.0");
  });

  it("with reduced motion shows every step at once: no autoplay, no play button, step 1 explained", () => {
    const restore = reduceMotion();
    try {
      mount("food-scan");
      expect(container.querySelectorAll(".fj-node.is-off")).toHaveLength(0);
      expect(current()).toContain("앱에서 촬영");
      expect(playButton()).toBeUndefined();
      expect(vi.getTimerCount()).toBe(0);
      key(nodes()[0], "ArrowRight");
      expect(current()).toContain("Python 서버");
    } finally {
      restore();
    }
  });
});

describe("ProjectFlowInline — wide view", () => {
  it("opens the large view on the same step, quiets the small diagram and returns focus when closed", async () => {
    // 넓게 보기는 처음 누를 때 불러옵니다. 시험에서는 미리 불러 두어 기다림을 줄입니다.
    await import("./CapabilityFlowWideView");
    mount("music-splitter-web");
    act(() => nodes()[2].click());
    const wide = container.querySelector<HTMLButtonElement>('.fj-btn[aria-label^="넓게 보기"]')!;
    expect(wide.textContent).toBe("넓게 보기");
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      wide.focus();
      wide.click();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain("코드로 확인한 흐름");
    // 같은 단계를 이어서 보여 주고, 그 단계에 초점을 둡니다.
    expect(dialog!.querySelector('.fj-node[aria-current="step"]')?.textContent).toContain("FastAPI /audio");
    expect(document.activeElement).toBe(dialog!.querySelector('.fj-node[aria-current="step"]'));
    // 넓게 보기의 설명은 코드에서 확인한 처리와 저장 위치까지 담습니다.
    expect(dialog!.querySelector(".fj-note")?.textContent).toContain("output/{파일 이름}");
    expect(container.querySelector(".fj-stage")?.className).toContain("is-dormant");

    await act(async () => {
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(wide);
    expect(container.querySelector(".fj-stage")?.className).not.toContain("is-dormant");
  });
});

describe("flow diagram helpers", () => {
  it("derives what a step receives and sends from the flow links, with the start and end of code flows", () => {
    const food = flowViewsFor("food-scan")[0];
    expect(inputsOf(food, 0, "ko")).toEqual([]);
    expect(outputsOf(food, 0, "ko")[0]).toMatchObject({ data: "음식 사진", place: "Python 서버" });
    expect(inputsOf(food, 1, "en")[0]).toMatchObject({ data: "food photo", place: "Photo in the app" });
    expect(outputsOf(food, 5, "ko")).toEqual([]);
    const splitter = flowViewsFor("music-splitter-web")[0];
    expect(inputsOf(splitter, 0, "ko")).toEqual([{ key: "origin", icon: "user", place: "사용자 브라우저" }]);
    expect(outputsOf(splitter, 5, "ko")).toEqual([{ key: "destination", icon: "user", place: "사용자 · 듣기와 내려받기" }]);
    const sensor = flowViewsFor("smartfarm-rag")[0];
    expect(outputsOf(sensor, 2, "ko").map((item) => item.data)).toEqual(["정상 19", "의심 1"]);
  });

  it("chooses lanes or a stacked list by width, and puts the note beside the lanes only when both fit", () => {
    expect(stageLayout(null, 6, "compact")).toEqual({ layout: "lanes", note: null });
    expect(stageLayout(591, 6, "compact")).toEqual({ layout: "stack", note: null });
    expect(stageLayout(640, 6, "compact")).toEqual({ layout: "lanes", note: null });
    expect(stageLayout(1000, 6, "compact")).toEqual({ layout: "lanes", note: 340 });
    expect(stageLayout(700, 3, "compact")).toEqual({ layout: "lanes", note: 266 });
    expect(stageLayout(1400, 6, "wide")).toEqual({ layout: "lanes", note: 380 });
    expect(stageLayout(900, 6, "wide")).toEqual({ layout: "lanes", note: null });
    expect(stageLayout(800, 6, "wide")).toEqual({ layout: "stack", note: null });
  });
});
