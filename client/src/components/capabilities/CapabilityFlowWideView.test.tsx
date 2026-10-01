// @vitest-environment jsdom
import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioContent } from "@/content";
import { LIGHT } from "@/content/theme";
import CapabilityFlowWideView from "./CapabilityFlowWideView";
import { flowViewsFor } from "./capabilityFlowModel";
import { INLINE_STEP_MS, START_DELAY_MS } from "./flowPlayback";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = portfolioContent.projects.find((item) => item.slug === "smartfarm-rag")!;

/** 자세히 보기 밖에서 열 때처럼 재생 상태를 넘기지 않고 씁니다 (대화상자가 따로 재생). */
function Harness({ slug = "smartfarm-rag" }: { slug?: string }) {
  const target = portfolioContent.projects.find((item) => item.slug === slug)!;
  const flows = flowViewsFor(slug);
  const [open, setOpen] = useState(false);
  const [flowKey, setFlowKey] = useState(flows[0].key);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <button
        type="button"
        id="opener"
        onClick={(event) => {
          returnFocus.current = event.currentTarget;
          setOpen(true);
        }}
      >
        open
      </button>
      <CapabilityFlowWideView
        open={open}
        onOpenChange={setOpen}
        project={target}
        flows={flows}
        flowKey={flowKey}
        onFlowKeyChange={setFlowKey}
        T={LIGHT}
        locale="ko"
        returnFocusRef={returnFocus}
      />
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const current = () => document.querySelector('[role="dialog"] .fj-node[aria-current="step"]')?.textContent ?? "";
const note = () => document.querySelector('[role="dialog"] .fj-note')?.textContent ?? "";

function openDialog() {
  const opener = document.getElementById("opener") as HTMLButtonElement;
  act(() => {
    opener.focus();
    opener.click();
  });
  return opener;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});

afterEach(() => {
  act(() => root.unmount());
  // 대화상자 정리(초점 복귀)에 쓰인 0ms 타이머까지 흘려보낸 뒤 실제 타이머로 돌아갑니다.
  act(() => {
    vi.runOnlyPendingTimers();
  });
  container.remove();
  vi.useRealTimers();
});

describe("CapabilityFlowWideView", () => {
  it("opens as a dialog named by the project, focuses the step being explained, then plays the record once", () => {
    openDialog();
    const box = dialog();
    expect(box).not.toBeNull();
    const titleId = box!.getAttribute("aria-labelledby");
    expect(titleId && document.getElementById(titleId)?.textContent).toBe(project.name);
    expect((document.activeElement as HTMLElement | null)?.classList.contains("fj-node")).toBe(true);
    expect(box!.textContent).toContain("화면 기록 재생");
    expect(box!.textContent).toContain("2026-10-01 화면 기록 · 시뮬레이터 값 · 정해진 규칙으로 판단 · 실제 농장 아님");

    advance(START_DELAY_MS);
    expect(current()).toContain("A구역 센서");
    // 넓게 보기의 설명에는 시뮬레이터 코드에서 확인한 처리와 전달 경로까지 담습니다.
    expect(note()).toContain("시뮬레이터가 2초마다 상태를 한 칸 진행");
    expect(note()).toContain("GET /v1/telemetry/snapshot");
    for (let step = 2; step <= 6; step += 1) advance(INLINE_STEP_MS);
    expect(current()).toContain("배치도 표시");
    expect(note()).toContain("농부 화면");
    expect(Array.from(box!.querySelectorAll(".fj-btn")).some((button) => button.textContent === "다시 재생")).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows the rule-based cross-check with the values copied from the screen", () => {
    openDialog();
    advance(START_DELAY_MS);
    act(() => document.querySelectorAll<HTMLButtonElement>('[role="dialog"] .fj-node')[4].click());
    for (const part of ["센서 교차 확인", "정해진 규칙 · 언어 모델 아님", "65.0", "16.0", "72", "재배실 온도 센서 이상 의심", "이 값으로는 설비를 조작하지 않음"]) expect(note()).toContain(part);
    act(() => document.querySelectorAll<HTMLButtonElement>('[role="dialog"] .fj-node')[3].click());
    for (const part of ["정상 19", "GET /v1/cultivation-strategies", "기준 55–78", "벗어남"]) expect(note()).toContain(part);
    expect(document.querySelector('[role="dialog"] .fj-stats')?.textContent).toContain("16");
  });

  it("closes with Escape and returns focus to the button that opened it", () => {
    const opener = openDialog();
    advance(START_DELAY_MS);
    act(() => {
      (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    advance(1);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes with the close button and returns focus", () => {
    const opener = openDialog();
    const close = document.querySelector<HTMLButtonElement>(".cfw-close");
    expect(close?.getAttribute("aria-label")).toBe("닫기");
    act(() => close!.click());
    advance(1);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("switches between the recorded replay and the explanatory flows with tabs", () => {
    openDialog();
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] [role="tab"]'));
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].textContent).toContain("센서 값이 서로 맞지 않을 때");
    act(() => tabs[1].click());
    const selected = document.querySelector('[role="dialog"] [role="tab"][aria-selected="true"]');
    expect(selected?.textContent).toContain("질의응답 연구");
    const panel = document.querySelector('[role="dialog"] [role="tabpanel"]');
    expect(panel?.getAttribute("aria-labelledby")).toBe(selected?.id);
    expect(dialog()?.querySelector(".fj-cap")?.textContent).toContain("설명용 흐름");
    // 설명용 흐름에는 기록 값이 없습니다.
    expect(panel?.textContent).not.toContain("65.0");
  });
});

describe("CapabilityFlowWideView — code-traced flow", () => {
  it("shows the code-confirmed path of the audio file without run values or local addresses", () => {
    act(() => root.render(<Harness key="music-splitter-web" slug="music-splitter-web" />));
    openDialog();
    const box = dialog();
    expect(box!.textContent).toContain("코드로 확인한 흐름");
    expect(box!.textContent).toContain("공개 저장소 78ee472 커밋의 코드 · 실행 기록 아님");
    advance(START_DELAY_MS);
    advance(INLINE_STEP_MS);
    expect(current()).toContain("브라우저 업로드");
    // 브라우저가 FormData 로 FastAPI /audio 에 직접 보냅니다.
    for (const part of ["FormData", "POST /audio", "FastAPI /audio", "Spring 서버를 거치지 않음"]) expect(note()).toContain(part);
    expect(box!.textContent).not.toMatch(/localhost|https?:\/\/|:\d{4}\b/);
  });
});
