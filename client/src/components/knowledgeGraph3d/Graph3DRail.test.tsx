// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { portfolioContent } from "@/content";
import { LIGHT } from "@/content/theme";
import { KnowledgeGraph3DRail } from "./Graph3DRail";
import { buildKnowledgeGraph } from "./graph3dModel";
import { activeFrameSubscribers, DRIFT_PX, PARALLAX_PX, setMotionChoice } from "./graph3dMotion";
import { RETURN_DELAY_MS, resetInputTracking } from "./useGraph3DAttention";
import { TRANSITION_MS } from "./useGraph3DExplore";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const originalMatchMedia = window.matchMedia;
const graph = buildKnowledgeGraph(portfolioContent, portfolioContent, "ko");
const NAME = portfolioContent.profile.name;

/** reduced: 움직임 줄이기 — 처음 돌아오는 움직임·숨쉬기 없이 처음 시점에서 시작하고, 보기 전환도 바로 바뀝니다. */
function mockMatchMedia(reduced: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

beforeEach(() => {
  mockMatchMedia(true);
  resetInputTracking();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.querySelectorAll("[data-outside]").forEach((element) => element.remove());
  window.matchMedia = originalMatchMedia;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setMotionChoice("on");
});

function renderRail(focusNodeId: string | null = null) {
  act(() => {
    root.render(<KnowledgeGraph3DRail content={portfolioContent} T={LIGHT} locale="ko" active="about" focusNodeId={focusNodeId} />);
  });
}

const rail = () => container.querySelector<HTMLElement>("#knowledge-rail")!;
const field = (id: string) => container.querySelector<HTMLButtonElement>(`.kg3-globe [data-target-id="domain:${id}"]`)!;
const chip = (id: string, scope: ParentNode = container) => scope.querySelector<HTMLButtonElement>(`.kg3-dv [data-node-id="${id}"]`)!;
const star = (id: string) => container.querySelector<HTMLElement>(`.kg3-star[data-node-id="${id}"]`)!;
/** 별의 기준 자리 (React 가 그린 left/top — 숨쉬기로 더한 이동은 빼고) */
const places = () => Array.from(container.querySelectorAll<HTMLElement>(".kg3-star"), (element) => `${element.style.left} ${element.style.top}`);
/** 레일의 설명 칸 — aria-label 은 보여 주는 대상의 제목, data-mode 는 미리 보기/고정됨/펼친 분야 */
const panel = () => container.querySelector<HTMLElement>(".kg3-rail .kg3-detail")!;
const mode = () => rail().dataset.mode;
const pending = () => rail().dataset.returnPending === "true";
const live = () => container.querySelector(".kg3-rail [aria-live]")?.textContent;
const key = (element: Element, value: string, init: KeyboardEventInit = {}) =>
  element.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true, ...init }));
/** React 의 onPointerEnter/Leave (지도 안의 대상 사이를 옮겨 다님) */
const hover = (element: Element, pointerType = "mouse") =>
  element.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, cancelable: true, pointerId: 1, pointerType, relatedTarget: null }));
const unhover = (element: Element) =>
  element.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", relatedTarget: null }));
/** 영역(지도 + 설명 칸 + 단추) 자체로 들어오고 나가는 포인터 — 브라우저는 영역의 바깥 경계를 넘을 때만 보냅니다 */
const enterRegion = (element: Element = rail(), pointerType = "mouse") => act(() => void element.dispatchEvent(new PointerEvent("pointerenter", { pointerId: 1, pointerType })));
const leaveRegion = (element: Element = rail(), pointerType = "mouse") => act(() => void element.dispatchEvent(new PointerEvent("pointerleave", { pointerId: 1, pointerType })));
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
/** 마지막 입력 방식 — 키를 누르면 키보드, 누르면(포인터) 포인터 */
const pressKey = () => act(() => void document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })));
const press = (target: Element = document.body, pointerType = "mouse") =>
  act(() => void target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 2, pointerType, clientX: 5, clientY: 5 })));
const release = () => act(() => void document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 2, pointerType: "mouse" })));
function outside(): HTMLElement {
  const element = document.createElement("a");
  element.href = "#elsewhere";
  element.textContent = "elsewhere";
  element.setAttribute("data-outside", "true");
  document.body.appendChild(element);
  return element;
}

function openField(id: string) {
  act(() => field(id).click());
}

describe("whole view → opened field", () => {
  it("opens on the whole view: the person at the centre, eight fields around, and the identity summary in the panel", () => {
    renderRail();
    expect(mode()).toBe("overview");
    expect(container.querySelector(".kg3-core-label")?.textContent).toBe("Me");
    expect(container.querySelectorAll(".kg3-globe button.kg3-domain")).toHaveLength(8);
    expect(container.querySelectorAll(".kg3-spoke")).toHaveLength(8);
    expect(container.querySelector(".kg3-dv")).toBeNull();
    expect(panel().getAttribute("aria-label")).toBe("나의 지식");
    expect(panel().textContent).toContain(NAME);
    expect(panel().textContent).not.toContain("숙련도나 성과를 뜻하지 않습니다");
    expect(pending()).toBe(false);
  });

  it("opens a clicked field into layers by kind, keeping its title and a whole-view control, without moving the person's name", () => {
    renderRail();
    const coreBefore = container.querySelector<HTMLElement>(".kg3-core-label")!.getAttribute("style");
    openField("retrieval");

    expect(mode()).toBe("detail");
    expect(container.querySelector(".kg3-dv-title")?.textContent).toBe("검색·RAG");
    expect(container.querySelector(".kg3-back")?.textContent).toBe("전체 보기");
    expect(container.querySelectorAll(".kg3-dv .km-plane")).toHaveLength(3);
    for (const id of graph.domainById.get("retrieval")!.members) expect(chip(id), id).not.toBeNull();
    // 다른 분야의 지식은 층에 그리지 않습니다 (설명 칸에 분야 이름과 함께).
    expect(chip("python")).toBeNull();
    expect(container.querySelector(".kg3-globe")?.getAttribute("aria-hidden")).toBe("true");
    expect(panel().dataset.mode).toBe("open");
    expect(panel().getAttribute("aria-label")).toBe("문서 검색과 RAG");
    expect(panel().textContent).not.toContain("위아래가 의존이나 포함을 뜻하지 않습니다");
    expect(live()).toBe("문서 검색과 RAG 펼침 — 개념, 구현한 방법, 기술, 근거 층");
    expect(container.querySelector<HTMLElement>(".kg3-core-label")!.getAttribute("style")).toBe(coreBefore);
    // 움직임 줄이기: 프레임 없이 바로 펼칩니다.
    expect(activeFrameSubscribers()).toBe(0);
    expect(container.querySelector(".kg3-dv")?.getAttribute("data-unfolding")).toBeNull();
  });

  it("opens a field with Enter, moves focus into the layers, walks them with the arrows, and lets Escape unpin, then return to the field name", () => {
    renderRail();
    pressKey();
    const ml = field("ml");
    act(() => ml.focus());
    expect(ml.getAttribute("tabindex")).toBe("0");
    act(() => ml.click());
    expect(mode()).toBe("detail");
    const first = document.activeElement as HTMLElement;
    expect(first.closest(".kg3-dv")).not.toBeNull();
    expect(first.getAttribute("tabindex")).toBe("0");

    act(() => key(first, "ArrowRight"));
    const second = document.activeElement as HTMLElement;
    expect(second).not.toBe(first);
    expect(second.dataset.nodeId).toBeDefined();
    // 키보드로 옮기면 미리 보기, Enter(누르기)로 고정
    expect(panel().dataset.mode).toBe("preview");
    act(() => second.click());
    expect(second.getAttribute("aria-pressed")).toBe("true");
    expect(panel().dataset.mode).toBe("pinned");

    act(() => key(second, "Escape"));
    expect(second.getAttribute("aria-pressed")).toBe("false");
    expect(mode()).toBe("detail");
    expect(live()).toBe("고정 해제됨");

    act(() => key(document.activeElement!, "Escape"));
    expect(mode()).toBe("overview");
    expect((document.activeElement as HTMLElement).dataset.targetId).toBe("domain:ml");
    expect(live()).toBe("전체 보기");
  });

  it("pins an item's plain-language explanation and keeps it while other items are pointed at; crossing gaps keeps the field open", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderRail();
    openField("retrieval");
    const control = chip("channel-control");
    act(() => control.click());
    expect(control.getAttribute("aria-pressed")).toBe("true");
    expect(panel().getAttribute("aria-label")).toBe("질의 적응형 검색 채널 제어");
    const text = panel().textContent ?? "";
    for (const part of ["무엇인가요", "직접 한 일", "한국정보기술학회논문지 · KCI 게재 · 제1저자"]) expect(text).toContain(part);
    expect(text).not.toMatch(/content\/|\.mdx|\.json/);
    expect(container.querySelectorAll(".kg3-dv .km-plane")).toHaveLength(3);
    // 다른 분야로 이어진 지식은 설명 칸에 분야 이름과 함께 나옵니다.
    expect(panel().querySelector(".kg3-chip-field")?.textContent).toBe("AI·ML");

    const hybrid = chip("hybrid");
    act(() => hover(hybrid));
    expect(panel().getAttribute("aria-label")).toBe("질의 적응형 검색 채널 제어");
    expect(control.getAttribute("aria-pressed")).toBe("true");
    act(() => unhover(hybrid));
    wait(300);
    expect(mode()).toBe("detail");
    expect(panel().getAttribute("aria-label")).toBe("질의 적응형 검색 채널 제어");

    act(() => hybrid.click());
    expect(hybrid.getAttribute("aria-pressed")).toBe("true");
    expect(control.getAttribute("aria-pressed")).toBe("false");
    // 빈 곳을 누르면 고정만 풀고, 펼친 분야는 그대로입니다.
    act(() => container.querySelector<HTMLElement>(".kg3-dv .km-overlay")!.click());
    expect(hybrid.getAttribute("aria-pressed")).toBe("false");
    expect(mode()).toBe("detail");
  });

  it("returns with the whole-view control, folding and restoring the opening camera", () => {
    renderRail();
    const before = places();
    openField("media");
    act(() => chip("abstention").click());
    act(() => container.querySelector<HTMLButtonElement>(".kg3-back")!.click());
    expect(mode()).toBe("overview");
    expect(container.querySelector(".kg3-dv")).toBeNull();
    expect(rail().dataset.domain).toBeUndefined();
    expect(places()).toEqual(before);
  });

  it("previews a field from a star with its name, and opens it with that item pinned on click", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderRail();
    act(() => hover(star("hybrid")));
    expect(panel().getAttribute("aria-label")).toBe("문서 검색과 RAG");
    expect(panel().dataset.mode).toBe("preview");
    expect(panel().textContent).toContain("누르거나 Enter로 펼치기");
    expect(container.querySelector('.kg3-label[data-node-id="hybrid"]')?.textContent).toBe(graph.byId.get("hybrid")!.label);
    act(() => star("hybrid").click());
    expect(mode()).toBe("detail");
    expect(chip("hybrid").getAttribute("aria-pressed")).toBe("true");
    expect(panel().getAttribute("aria-label")).toBe(graph.byId.get("hybrid")!.title);
    // 터치는 가리킴을 만들지 않습니다.
    act(() => container.querySelector<HTMLButtonElement>(".kg3-back")!.click());
    act(() => hover(star("python"), "touch"));
    expect(panel().getAttribute("aria-label")).toBe("나의 지식");
  });

  it("opens fields from the panel too, and follows a link into another field with the pin", () => {
    renderRail();
    act(() => Array.from(panel().querySelectorAll<HTMLButtonElement>(".kg3-field-chip")).find((button) => button.textContent?.startsWith("검색·RAG"))!.click());
    expect(rail().dataset.domain).toBe("retrieval");
    act(() => chip("channel-control").click());
    const python = Array.from(panel().querySelectorAll<HTMLButtonElement>(".kg3-chip")).find((button) => button.textContent?.startsWith("Python"))!;
    act(() => python.click());
    expect(rail().dataset.domain).toBe("ml");
    expect(chip("python").getAttribute("aria-pressed")).toBe("true");
  });

  it("previews a project hovered in the home list only in the whole view", () => {
    renderRail("project:music-splitter-web");
    expect(panel().getAttribute("aria-label")).toBe("AI 음원 분리 웹 서비스");
    expect(panel().textContent).toContain("홈 목록에서 가리킨 작업");
    openField("backend");
    expect(panel().getAttribute("aria-label")).toBe(graph.domainById.get("backend")!.title);
    expect(rail().dataset.focusId).toBe("");
  });
});

describe("returning when attention leaves the map and its panel", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  it("does not count moving from the map to its explanation as leaving", () => {
    renderRail();
    enterRegion();
    openField("retrieval");
    leaveRegion(container.querySelector(".kg3-frame")!);
    enterRegion(panel());
    wait(RETURN_DELAY_MS * 2);
    expect(mode()).toBe("detail");
    expect(pending()).toBe(false);
  });

  it("folds back to the opening view about three seconds after the pointer leaves the whole region", () => {
    renderRail();
    const before = places();
    enterRegion();
    openField("retrieval");
    act(() => chip("hybrid").click());
    leaveRegion();
    expect(pending()).toBe(true);
    wait(RETURN_DELAY_MS - 100);
    expect(mode()).toBe("detail");
    wait(200);
    expect(mode()).toBe("overview");
    expect(pending()).toBe(false);
    expect(container.querySelector(".kg3-dv")).toBeNull();
    expect(panel().getAttribute("aria-label")).toBe("나의 지식");
    expect(places()).toEqual(before);
  });

  it("cancels the return when the pointer comes back, and counts again from the next departure", () => {
    renderRail();
    enterRegion();
    openField("device");
    leaveRegion();
    wait(2000);
    enterRegion();
    expect(pending()).toBe(false);
    wait(RETURN_DELAY_MS * 2);
    expect(mode()).toBe("detail");
    leaveRegion();
    wait(RETURN_DELAY_MS - 100);
    expect(mode()).toBe("detail");
    wait(200);
    expect(mode()).toBe("overview");
  });

  it("never returns while the pointer simply rests inside", () => {
    renderRail();
    enterRegion();
    openField("frontend");
    wait(RETURN_DELAY_MS * 10);
    expect(mode()).toBe("detail");
  });

  it("protects reading with keyboard focus inside, but not focus left behind by a mouse click", () => {
    renderRail();
    enterRegion();
    press(field("data"));
    openField("data");
    // 마우스로 누른 칩에 초점이 남아 있어도 떠나면 돌아갑니다.
    const item = chip("preprocessing");
    press(item);
    act(() => item.focus());
    release();
    leaveRegion();
    expect(pending()).toBe(true);
    wait(RETURN_DELAY_MS);
    expect(mode()).toBe("overview");

    // 키보드로 읽는 중이면 포인터가 떠나도 돌아가지 않습니다.
    enterRegion();
    openField("data");
    const keyboardItem = chip("visualization");
    act(() => keyboardItem.focus());
    pressKey();
    act(() => key(keyboardItem, "ArrowLeft"));
    expect((document.activeElement as HTMLElement).closest(".kg3-dv")).not.toBeNull();
    leaveRegion();
    expect(pending()).toBe(false);
    wait(RETURN_DELAY_MS * 3);
    expect(mode()).toBe("detail");
    // 초점이 영역을 떠나면(다른 곳을 누름) 그때부터 셉니다.
    const elsewhere = outside();
    press(elsewhere);
    act(() => (document.activeElement as HTMLElement).blur());
    expect(pending()).toBe(true);
    wait(RETURN_DELAY_MS);
    expect(mode()).toBe("overview");
  });

  it("waits while a press inside is held (dragging, selecting), and counts from the release", () => {
    renderRail();
    enterRegion();
    openField("infra");
    press(panel());
    leaveRegion();
    expect(pending()).toBe(false);
    wait(RETURN_DELAY_MS * 2);
    expect(mode()).toBe("detail");
    release();
    expect(pending()).toBe(true);
    wait(RETURN_DELAY_MS);
    expect(mode()).toBe("overview");
  });

  it("restarts the countdown when the opened layers scroll (still reading)", () => {
    renderRail();
    enterRegion();
    openField("ml");
    leaveRegion();
    wait(2000);
    act(() => void container.querySelector(".kg3-dv-scroll")!.dispatchEvent(new Event("scroll")));
    wait(2000);
    expect(mode()).toBe("detail");
    wait(RETURN_DELAY_MS - 1900);
    expect(mode()).toBe("overview");
  });

  it("has no hover timeout on touch: inside taps and scrolls keep the field, a real tap outside returns without blocking the page", () => {
    renderRail();
    press(field("media"), "touch");
    openField("media");
    leaveRegion(rail(), "touch");
    expect(pending()).toBe(false);
    wait(RETURN_DELAY_MS * 3);
    expect(mode()).toBe("detail");
    // 영역 안을 톡 누르고 떼기 · 스크롤 — 시간이 지나도 그대로
    const item = chip("spleeter");
    press(item, "touch");
    act(() => item.click());
    release();
    act(() => void container.querySelector(".kg3-dv-scroll")!.dispatchEvent(new Event("scroll")));
    expect(pending()).toBe(false);
    wait(RETURN_DELAY_MS * 3);
    expect(mode()).toBe("detail");
    expect(chip("spleeter").getAttribute("aria-pressed")).toBe("true");
    // 영역 밖을 톡 누름 → 바로 돌아가고, 그 누름은 막지 않습니다.
    const elsewhere = outside();
    press(elsewhere, "touch");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => void elsewhere.dispatchEvent(click));
    expect(click.defaultPrevented).toBe(false);
    expect(mode()).toBe("overview");
  });

  it("does not start a countdown in the whole view unless the globe was turned, and then returns to the opening camera", () => {
    renderRail();
    const before = places();
    enterRegion();
    leaveRegion();
    expect(pending()).toBe(false);
    enterRegion();
    act(() => key(field("ml"), "ArrowRight", { shiftKey: true }));
    expect(places()).not.toEqual(before);
    leaveRegion();
    expect(pending()).toBe(true);
    wait(RETURN_DELAY_MS);
    expect(places()).toEqual(before);
    expect(pending()).toBe(false);
  });

  it("clears a pending return when the rail goes away", () => {
    renderRail();
    enterRegion();
    openField("retrieval");
    leaveRegion();
    expect(pending()).toBe(true);
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    root = createRoot(container);
  });
});

describe("wide view", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const openWide = () => act(() => container.querySelector<HTMLButtonElement>(".km-expand")!.click());
  const closeWide = () => {
    act(() => dialog()!.querySelector<HTMLButtonElement>(".km-dialog-close")!.click());
    wait(1);
  };

  it("opens on the same opened field and pin, and lets Escape unpin, return to the whole view, then close and give focus back", () => {
    renderRail();
    openField("retrieval");
    act(() => chip("fusion").click());
    const expand = container.querySelector<HTMLButtonElement>(".km-expand")!;
    act(() => expand.focus());
    openWide();
    const box = dialog()!;
    expect(box.dataset.mode).toBe("detail");
    expect(box.querySelector('.kg3-dv[data-variant="explorer"]')).not.toBeNull();
    expect(chip("fusion", box).getAttribute("aria-pressed")).toBe("true");
    expect(box.querySelector(".km-dialog-inspector")?.textContent).toContain("검색 결과를 통합하는 구조를 구현했습니다.");
    // 레일은 넓게 보기에 가려진 동안 시계를 멈춥니다.
    leaveRegion();
    expect(pending()).toBe(false);

    act(() => key(document.activeElement ?? box, "Escape"));
    expect(dialog()).not.toBeNull();
    expect(chip("fusion", box).getAttribute("aria-pressed")).toBe("false");
    act(() => key(document.activeElement ?? box, "Escape"));
    expect(dialog()).not.toBeNull();
    expect(box.dataset.mode).toBe("overview");
    // 전체 보기의 도구 줄 (돌리기 · 확대 · 처음 시점)
    expect(box.querySelector('button[aria-label="확대"]')).not.toBeNull();
    act(() => key(document.activeElement ?? box, "Escape"));
    wait(1);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(expand);
    expect(mode()).toBe("overview");
  });

  it("returns to the whole view three seconds after the pointer leaves the dialog, and clears that timer when the dialog closes", () => {
    renderRail();
    openWide();
    let box = dialog()!;
    act(() => box.querySelector<HTMLButtonElement>('.kg3-globe [data-target-id="domain:media"]')!.click());
    expect(box.dataset.mode).toBe("detail");
    enterRegion(box);
    leaveRegion(box);
    expect(box.dataset.returnPending).toBe("true");
    wait(RETURN_DELAY_MS);
    expect(box.dataset.mode).toBe("overview");

    act(() => box.querySelector<HTMLButtonElement>('.kg3-globe [data-target-id="domain:device"]')!.click());
    leaveRegion(box);
    expect(box.dataset.returnPending).toBe("true");
    closeWide();
    // 닫힌 대화상자의 시계는 남지 않습니다 — 레일로 돌아와 머무는 동안 펼친 분야가 그대로입니다.
    enterRegion();
    wait(RETURN_DELAY_MS * 2);
    expect(mode()).toBe("detail");
    expect(rail().dataset.domain).toBe("device");
    openWide();
    box = dialog()!;
    expect(box.dataset.mode).toBe("detail");
  });

  it("keeps a field-grouped list as a text alternative that opens fields and pins items", () => {
    renderRail();
    openWide();
    const box = dialog()!;
    const views = () => Array.from(box.querySelectorAll<HTMLButtonElement>(".km-segment button"));
    act(() => views().find((button) => button.textContent === "목록")!.click());
    const outline = box.querySelector(".kg3-outline")!;
    expect(outline.textContent).toContain("문서 검색과 RAG");
    expect(outline.textContent).toContain("관심·스택 목록 (작업 기록 없음)");
    act(() => Array.from(outline.querySelectorAll<HTMLButtonElement>(".km-outline-item")).find((button) => button.textContent === graph.byId.get("baseline-comparison")!.title)!.click());
    expect(box.dataset.mode).toBe("detail");
    expect(box.querySelector(".km-dialog-inspector .kg3-detail")?.getAttribute("aria-label")).toBe(graph.byId.get("baseline-comparison")!.title);
    act(() => views().find((button) => button.textContent === "공간")!.click());
    expect(chip("baseline-comparison", box).getAttribute("aria-pressed")).toBe("true");
  });
});

/** requestAnimationFrame 을 손으로 돌립니다 (16ms 씩). */
function installFrames() {
  const queue = new Map<number, FrameRequestCallback>();
  let handle = 0;
  let now = 1000;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    handle += 1;
    queue.set(handle, callback);
    return handle;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    queue.delete(id);
  });
  return {
    run(ms: number) {
      for (let elapsed = 0; elapsed < ms; elapsed += 16) {
        now += 16;
        const callbacks = Array.from(queue.values());
        queue.clear();
        act(() => callbacks.forEach((callback) => callback(now)));
      }
    },
    get pending() {
      return queue.size;
    },
  };
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

const translateOf = (value: string) => {
  const match = value.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*$/);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
};

describe("motion", () => {
  let frames: ReturnType<typeof installFrames>;

  beforeEach(() => {
    mockMatchMedia(false);
    frames = installFrames();
  });

  afterEach(() => {
    delete (document as unknown as { visibilityState?: string }).visibilityState;
  });

  it("breathes on one shared frame clock, keeping dots, pointer targets, links and spokes on the same projected points", () => {
    renderRail();
    const canvas = container.querySelector<HTMLElement>(".kg3-rail .kg3-canvas")!;
    expect(canvas.dataset.motion).toBe("on");
    frames.run(2600);
    expect(activeFrameSubscribers()).toBe(1);
    expect(frames.pending).toBe(1);
    const baseline = Array.from(container.querySelectorAll<SVGGElement>(".kg3-rail g.kg3-node"), (g) => g.getAttribute("transform"));
    frames.run(800);

    let moved = 0;
    for (const g of Array.from(container.querySelectorAll<SVGGElement>(".kg3-rail g.kg3-node"))) {
      const id = g.dataset.id!;
      const drawn = translateOf(g.style.transform);
      expect(drawn, id).not.toBeNull();
      const [, bx, by] = g.getAttribute("transform")!.match(/translate\((-?[\d.]+) (-?[\d.]+)\)/)!;
      const shift = Math.hypot(drawn!.x - Number(bx), drawn!.y - Number(by));
      expect(shift, id).toBeLessThanOrEqual((DRIFT_PX.rail + PARALLAX_PX.rail) * 1.5);
      if (shift > 0.2) moved += 1;
      // 별을 가리키는 자리는 점과 같은 자리에 있습니다.
      const hit = star(id);
      const offset = translateOf(hit.style.transform);
      expect(hit.style.transform.startsWith("translate(-50%, -50%)"), id).toBe(true);
      expect(Math.abs(parseFloat(hit.style.left) + offset!.x - drawn!.x), id).toBeLessThan(0.11);
      expect(Math.abs(parseFloat(hit.style.top) + offset!.y - drawn!.y), id).toBeLessThan(0.11);
    }
    expect(moved).toBeGreaterThan(graph.nodes.length / 2);
    const lines = Array.from(container.querySelectorAll<SVGLineElement>(".kg3-rail line.kg3-link"));
    expect(lines).toHaveLength(graph.links.length);
    for (const line of lines) {
      const a = translateOf(container.querySelector<SVGGElement>(`.kg3-rail g.kg3-node[data-id="${line.dataset.source}"]`)!.style.transform)!;
      const b = translateOf(container.querySelector<SVGGElement>(`.kg3-rail g.kg3-node[data-id="${line.dataset.target}"]`)!.style.transform)!;
      expect([Number(line.getAttribute("x1")), Number(line.getAttribute("y1")), Number(line.getAttribute("x2")), Number(line.getAttribute("y2"))]).toEqual([a.x, a.y, b.x, b.y]);
    }
    // 정리 선의 가운데 끝은 움직이지 않습니다 (사람 자리).
    const spokes = Array.from(container.querySelectorAll<SVGLineElement>(".kg3-rail line.kg3-spoke"));
    expect(new Set(spokes.map((line) => `${line.getAttribute("x1")} ${line.getAttribute("y1")}`)).size).toBe(1);
    expect(Array.from(container.querySelectorAll<SVGGElement>(".kg3-rail g.kg3-node"), (g) => g.getAttribute("transform"))).toEqual(baseline);
  });

  it("turns the globe gently toward an empty spot only as a drawing offset, and eases back on leave without touching the camera", () => {
    renderRail();
    frames.run(2000);
    const canvas = container.querySelector<HTMLElement>(".kg3-rail .kg3-canvas")!;
    const baseline = Array.from(container.querySelectorAll<SVGGElement>(".kg3-rail g.kg3-node"), (g) => g.getAttribute("transform"));
    const width = parseFloat(canvas.style.width);
    act(() => {
      canvas.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, pointerType: "mouse", clientX: width - 1, clientY: 2 }));
    });
    frames.run(1200);
    const at = (id: string) => translateOf(container.querySelector<SVGGElement>(`.kg3-rail g.kg3-node[data-id="${id}"]`)!.style.transform)!;
    const base = (id: string) => {
      const [, bx, by] = baseline[Array.from(container.querySelectorAll<SVGGElement>(".kg3-rail g.kg3-node")).findIndex((g) => g.dataset.id === id)]!.match(/translate\((-?[\d.]+) (-?[\d.]+)\)/)!;
      return { x: Number(bx), y: Number(by) };
    };
    const tilted = Math.max(...graph.nodes.map((node) => Math.hypot(at(node.id).x - base(node.id).x, at(node.id).y - base(node.id).y)));
    expect(tilted).toBeGreaterThan(PARALLAX_PX.rail * 0.5);
    expect(tilted).toBeLessThanOrEqual((DRIFT_PX.rail + PARALLAX_PX.rail) * 1.5);
    act(() => unhover(canvas));
    frames.run(5000);
    for (const node of graph.nodes) expect(Math.hypot(at(node.id).x - base(node.id).x, at(node.id).y - base(node.id).y), node.id).toBeLessThanOrEqual(DRIFT_PX.rail * 1.5);
    expect(Array.from(container.querySelectorAll<SVGGElement>(".kg3-rail g.kg3-node"), (g) => g.getAttribute("transform"))).toEqual(baseline);
  });

  it("brings a field forward, then unfolds its stars into the layers over the shared clock, and folds back to the opening camera", () => {
    renderRail();
    frames.run(2000);
    const before = places();
    openField("retrieval");
    expect(mode()).toBe("detail");
    // 앞으로 데려오는 동안에는 층 그림이 아직 없습니다.
    frames.run(TRANSITION_MS.forward / 2);
    expect(container.querySelector(".kg3-dv")).toBeNull();
    frames.run(TRANSITION_MS.forward / 2 + 120);
    const view = container.querySelector<HTMLElement>(".kg3-dv")!;
    expect(view).not.toBeNull();
    expect(view.dataset.unfolding).toBe("true");
    expect(container.querySelector(".kg3-dv .km-canvas")).not.toBeNull();
    frames.run(TRANSITION_MS.unfold + 64);
    expect(view.dataset.unfolding).toBeUndefined();
    expect(chip("hybrid").style.transform).toBe("");
    // 펼친 동안 구는 숨고 움직임을 멈춥니다 (프레임 시계는 쉬고 있음).
    expect(container.querySelector<HTMLElement>(".kg3-globe")!.style.visibility).toBe("hidden");
    expect(container.querySelector<HTMLElement>(".kg3-rail .kg3-canvas")!.dataset.motion).toBe("paused");
    expect(activeFrameSubscribers()).toBe(0);

    act(() => container.querySelector<HTMLButtonElement>(".kg3-back")!.click());
    frames.run(TRANSITION_MS.fold + TRANSITION_MS.home + 200);
    expect(container.querySelector(".kg3-dv")).toBeNull();
    expect(places()).toEqual(before);
    expect(activeFrameSubscribers()).toBe(1);
  });

  it("pauses behind the wide view and while the tab is hidden, and keeps both motion toggles in sync", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderRail();
    frames.run(2000);
    const railCanvas = () => container.querySelector<HTMLElement>(".kg3-rail .kg3-canvas")!;
    const railToggle = () => container.querySelector<HTMLButtonElement>(".kg3-rail .kg3-motion")!;
    expect(railToggle().getAttribute("aria-pressed")).toBe("true");
    expect(railToggle().textContent).toBe("움직임켬");

    act(() => container.querySelector<HTMLButtonElement>(".km-expand")!.click());
    const box = document.querySelector('[role="dialog"]')!;
    const dialogCanvas = () => box.querySelector<HTMLElement>(".kg3-canvas")!;
    expect(railCanvas().dataset.motion).toBe("paused");
    expect(railCanvas().querySelector<SVGGElement>("g.kg3-node")!.style.transform).toBe("");
    expect(dialogCanvas().dataset.motion).toBe("on");
    frames.run(200);
    expect(activeFrameSubscribers()).toBe(1);
    expect(frames.pending).toBe(1);

    const dialogToggle = box.querySelector<HTMLButtonElement>(".kg3-motion")!;
    act(() => dialogToggle.click());
    expect(railToggle().getAttribute("aria-pressed")).toBe("false");
    expect(dialogCanvas().dataset.motion).toBe("off");
    expect(activeFrameSubscribers()).toBe(0);
    expect(frames.pending).toBe(0);
    act(() => dialogToggle.click());
    expect(activeFrameSubscribers()).toBe(1);
    const views = () => Array.from(box.querySelectorAll<HTMLButtonElement>(".km-segment button"));
    act(() => views().find((button) => button.textContent === "목록")!.click());
    expect(activeFrameSubscribers()).toBe(0);
    act(() => views().find((button) => button.textContent === "공간")!.click());
    expect(activeFrameSubscribers()).toBe(1);

    act(() => box.querySelector<HTMLButtonElement>(".km-dialog-close")!.click());
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(railCanvas().dataset.motion).toBe("on");

    setVisibility("hidden");
    expect(railCanvas().dataset.motion).toBe("paused");
    expect(activeFrameSubscribers()).toBe(0);
    setVisibility("visible");
    expect(railCanvas().dataset.motion).toBe("on");
    expect(activeFrameSubscribers()).toBe(1);
  });

  it("passes light once along the previewed field's own links, and pulses once on a star", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    renderRail();
    frames.run(1500);
    act(() => hover(field("retrieval")));
    const members = new Set(graph.domainById.get("retrieval")!.members);
    const sparks = Array.from(container.querySelectorAll<SVGLineElement>(".kg3-rail line.kg3-spark"));
    expect(sparks.length).toBe(graph.links.filter((link) => members.has(link.source) && members.has(link.target)).length);
    for (const spark of sparks) expect(members.has(spark.dataset.source!) && members.has(spark.dataset.target!)).toBe(true);
    act(() => unhover(field("retrieval")));
    wait(200);
    act(() => hover(star("lora")));
    expect(container.querySelectorAll('.kg3-rail g.kg3-node[data-id="lora"] .kg3-pulse')).toHaveLength(1);
  });
});

describe("reduced motion", () => {
  it("runs no frame loop, switches views instantly, and keeps every selection cue", () => {
    const frames = installFrames();
    renderRail();
    frames.run(500);
    expect(activeFrameSubscribers()).toBe(0);
    expect(frames.pending).toBe(0);
    expect(container.querySelector<HTMLElement>(".kg3-rail .kg3-canvas")!.dataset.motion).toBe("off");
    const toggle = container.querySelector<HTMLButtonElement>(".kg3-rail .kg3-motion")!;
    expect(toggle.disabled).toBe(true);
    expect(toggle.textContent).toContain("끔 · 기기 설정");
    expect(document.getElementById(toggle.getAttribute("aria-describedby")!)?.textContent).toContain("보기 전환은 움직임 없이 바로 바뀌고");

    openField("media");
    expect(frames.pending).toBe(0);
    expect(container.querySelector(".kg3-dv")?.getAttribute("data-unfolding")).toBeNull();
    act(() => chip("abstention").click());
    expect(chip("abstention").getAttribute("aria-pressed")).toBe("true");
    expect(panel().dataset.mode).toBe("pinned");
    expect(container.querySelectorAll(".kg3-rail .kg3-spark, .kg3-rail .kg3-pulse")).toHaveLength(0);
    act(() => container.querySelector<HTMLButtonElement>(".kg3-back")!.click());
    expect(mode()).toBe("overview");
    expect(frames.pending).toBe(0);
    expect(activeFrameSubscribers()).toBe(0);
  });
});
