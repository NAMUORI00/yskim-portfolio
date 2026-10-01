// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioContent } from "@/content";
import { LIGHT } from "@/content/theme";
import { KnowledgeMapRail } from "./KnowledgeMapRail";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const originalMatchMedia = window.matchMedia;

beforeEach(() => {
  // 움직임 줄이기: 판이 처음부터 펼쳐진 상태로 그려지고 각도 전환도 바로 바뀝니다.
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.matchMedia = originalMatchMedia;
  vi.useRealTimers();
});

function renderRail() {
  act(() => {
    root.render(<KnowledgeMapRail content={portfolioContent} T={LIGHT} locale="ko" active="about" focusNodeId={null} />);
  });
}

const node = (id: string) => container.querySelector<HTMLButtonElement>(`[data-node-id="${id}"]`)!;
const key = (target: Element, value: string) => target.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }));

describe("KnowledgeMapRail interaction", () => {
  it("pins a research question with a click, explains its evidence, and clears with Escape", () => {
    renderRail();
    const rag = node("research:rag");
    act(() => rag.click());

    expect(rag.getAttribute("aria-pressed")).toBe("true");
    const detail = container.querySelector(".km-detail")!;
    expect(detail.textContent).toContain("질문에 맞는 문서 검색과 근거 있는 답변");
    expect(detail.textContent).toContain("스마트팜 RAG");
    expect(detail.textContent).toContain("관련 KCI 논문 1편 게재");
    expect(detail.textContent).toContain("고정됨");
    expect(container.querySelectorAll(".km-thread").length).toBeGreaterThan(2);
    expect(node("project:mv-evirag").dataset.state).toBe("dim");

    act(() => key(rag, "Escape"));
    expect(rag.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll(".km-thread")).toHaveLength(0);
  });

  it("moves keyboard focus down to a connected project and pins a chip from the detail panel", () => {
    renderRail();
    const rag = node("research:rag");
    act(() => rag.focus());
    act(() => key(rag, "ArrowDown"));

    const focused = document.activeElement as HTMLElement;
    expect(["project:smartfarm-rag", "project:aerospace-rag"]).toContain(focused.dataset.nodeId);
    expect(focused.getAttribute("tabindex")).toBe("0");

    const chip = Array.from(container.querySelectorAll<HTMLButtonElement>(".km-detail .km-chip")).find((item) => item.textContent?.includes("Python"));
    expect(chip).toBeDefined();
    act(() => chip!.click());
    expect(node("tech:python").getAttribute("aria-pressed")).toBe("true");
  });

  it("opens the wide view, offers a list view, and returns focus to the button when closed", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderRail();
    const expand = container.querySelector<HTMLButtonElement>(".km-expand")!;
    act(() => {
      expand.focus();
      expand.click();
    });

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain("지식 지도 — 연구 질문에서 기술까지");
    expect(dialog.querySelector('.km-canvas[data-variant="explorer"]')).not.toBeNull();
    expect((document.activeElement as HTMLElement).classList.contains("km-node")).toBe(true);

    const list = Array.from(dialog.querySelectorAll<HTMLButtonElement>(".km-segment button")).find((button) => button.textContent === "목록")!;
    act(() => list.click());
    expect(list.getAttribute("aria-pressed")).toBe("true");
    expect(dialog.querySelector(".km-outline")?.textContent).toContain("연구 질문과 직접 이어지지 않은 프로젝트");

    act(() => dialog.querySelector<HTMLButtonElement>(".km-dialog-close")!.click());
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(expand);
  });

  it("switches the wide view to a front view and keeps it there when the stage is only clicked", () => {
    renderRail();
    act(() => container.querySelector<HTMLButtonElement>(".km-expand")!.click());
    const dialog = document.querySelector('[role="dialog"]')!;
    const views = () => Array.from(dialog.querySelectorAll<HTMLButtonElement>(".km-segment button"));
    const topEdge = () => {
      const points = dialog.querySelector('.km-plane[data-layer="research"] .km-plane-face')!.getAttribute("points")!.split(" ");
      const [left, right] = points.slice(0, 2).map((point) => Number(point.split(",")[1]));
      return right - left;
    };
    expect(Math.abs(topEdge())).toBeGreaterThan(5);

    act(() => views().find((button) => button.textContent === "정면 보기")!.click());
    expect(views().find((button) => button.textContent === "정면 보기")!.getAttribute("aria-pressed")).toBe("true");
    expect(Math.abs(topEdge())).toBeLessThan(0.5);

    const stage = dialog.querySelector<HTMLElement>(".km-dialog-stage")!;
    act(() => {
      stage.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1, clientX: 10, clientY: 10 }));
      stage.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1, clientX: 10, clientY: 10 }));
    });
    expect(views().find((button) => button.textContent === "정면 보기")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("lets Escape clear a pinned node before it closes the wide view", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderRail();
    act(() => container.querySelector<HTMLButtonElement>(".km-expand")!.click());
    const dialog = document.querySelector('[role="dialog"]')!;
    const python = dialog.querySelector<HTMLButtonElement>('[data-node-id="tech:python"]')!;
    act(() => python.click());
    expect(python.getAttribute("aria-pressed")).toBe("true");
    expect(dialog.querySelector(".km-dialog-inspector")?.textContent).toContain("이 포트폴리오의 프로젝트 8개에서 사용");

    act(() => key(document.activeElement ?? document.body, "Escape"));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(python.getAttribute("aria-pressed")).toBe("false");

    act(() => key(document.activeElement ?? document.body, "Escape"));
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
