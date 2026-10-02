/*
 * 주의(attention)가 지도를 떠났을 때 처음 전체 보기로 돌아가는 규칙 — 지도 + 설명 칸 + 도구 줄을 하나의 영역으로 봅니다.
 * ─────────────────────────────────────────────────────────────
 *  - 포인터(마우스·펜)가 영역 전체를 떠나면 약 3초 뒤 돌아갑니다. 다시 들어오면 취소합니다.
 *    지도에서 설명 칸으로 옮기는 것은 영역 안의 이동이라 떠남이 아닙니다. 포인터가 멈춰 있는 것도 떠남이 아닙니다 (가만히 읽는 중).
 *  - 키보드로 옮긴 초점이 영역 안에 있는 동안은 돌아가지 않습니다 (읽는 중). 마우스로 눌러 생긴 초점은 이 보호를 받지 않아,
 *    눌렀던 단추에 초점이 남아 있어도 포인터가 떠나면 돌아갈 수 있습니다. 키를 누르면 다시 키보드 초점으로 칩니다.
 *  - 영역 안에서 누르고 있는 동안(끌어 돌리기·스크롤 막대·글자 고르기)은 기다리고, 영역 안에서 스크롤이 일어나면 시간을 다시 잽니다.
 *  - 터치는 가리킴이 없으므로 시간으로 돌아가지 않습니다. "전체 보기"를 누르거나, 영역 밖을 실제로 톡 누를(tap) 때만 돌아갑니다.
 *    영역 안의 누르기·스크롤은 돌아가게 하지 않습니다. 문서의 누르기는 엿듣기만 하고 막거나 바꾸지 않습니다 (기본 동작 그대로).
 *  - 시계는 영역이 사라지거나(언마운트·대화상자 닫기) 다시 들어오면 지우고, 시간이 다 됐을 때 조건을 한 번 더 확인해 낡은 되돌리기를 막습니다.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** 영역을 떠난 뒤 전체 보기로 돌아가기까지 (ms) */
export const RETURN_DELAY_MS = 3000;

export type InputModality = "keyboard" | "pointer";

type TrackerEvent = { type: "modality" } | { type: "release" } | { type: "tap"; target: EventTarget | null };

/* ── 입력 방식 추적 (모든 영역이 하나를 함께 씀) ─────────── */

const tracker = {
  modality: "pointer" as InputModality,
  pointerType: "mouse",
  x: 0,
  y: 0,
  /** 마우스·펜 위치를 한 번이라도 알았는지 */
  known: false,
};
const trackerListeners = new Set<(event: TrackerEvent) => void>();

function emit(event: TrackerEvent) {
  for (const listener of Array.from(trackerListeners)) listener(event);
}

function onKeyDown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (tracker.modality === "keyboard") return;
  tracker.modality = "keyboard";
  emit({ type: "modality" });
}

function onPointerDown(event: PointerEvent) {
  tracker.pointerType = event.pointerType || "mouse";
  if (tracker.pointerType !== "touch") {
    tracker.x = event.clientX;
    tracker.y = event.clientY;
    tracker.known = true;
  }
  if (tracker.modality === "pointer") return;
  tracker.modality = "pointer";
  emit({ type: "modality" });
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType === "touch") return;
  tracker.x = event.clientX;
  tracker.y = event.clientY;
  tracker.known = true;
  // 마우스·펜이 움직이면 다시 가리킬 수 있는 입력으로 봅니다 (터치 겸용 기기).
  if (tracker.pointerType === "touch" && event.pointerType) {
    tracker.pointerType = event.pointerType;
    emit({ type: "modality" });
  }
}

function onRelease() {
  emit({ type: "release" });
}

function onClick(event: MouseEvent) {
  if (tracker.pointerType === "touch") emit({ type: "tap", target: event.target });
}

function installTracker(): () => void {
  if (typeof document === "undefined") return () => {};
  if (trackerListeners.size === 0) {
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    document.addEventListener("pointerup", onRelease, true);
    document.addEventListener("pointercancel", onRelease, true);
    document.addEventListener("click", onClick, true);
  }
  return () => {
    if (trackerListeners.size > 0) return;
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("pointermove", onPointerMove, { capture: true } as EventListenerOptions);
    document.removeEventListener("pointerup", onRelease, true);
    document.removeEventListener("pointercancel", onRelease, true);
    document.removeEventListener("click", onClick, true);
  };
}

/** 테스트 사이에 입력 방식 기억을 비웁니다. */
export function resetInputTracking() {
  tracker.modality = "pointer";
  tracker.pointerType = "mouse";
  tracker.known = false;
}

/* ── 영역 하나의 되돌리기 시계 ─────────────── */

export interface AttentionOptions {
  /** 처음 보기와 달라 돌아갈 것이 있는지 (펼친 분야 · 고정 · 사용자가 돌린 시점) */
  away: boolean;
  /** 다른 영역이 이 영역을 가리는 동안 (예: 레일 위에 넓게 보기가 열림) — 시계를 멈춥니다 */
  suspended?: boolean;
  /** 시간이 다 되었거나, 터치로 영역 밖을 눌렀을 때 */
  onReturn: () => void;
  delay?: number;
}

export function useAttentionReturn({ away, suspended = false, onReturn, delay = RETURN_DELAY_MS }: AttentionOptions) {
  const [region, setRegion] = useState<HTMLElement | null>(null);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hold = useRef({ pointerInside: false, pressed: false, focusInside: false });
  const live = useRef({ away, suspended, onReturn, delay, region });
  live.current = { away, suspended, onReturn, delay, region };

  const keyboardInside = useCallback((focusTarget?: Element | null) => {
    const root = live.current.region;
    if (!root || tracker.modality !== "keyboard") return false;
    const target = focusTarget === undefined ? (typeof document === "undefined" ? null : document.activeElement) : focusTarget;
    return Boolean(target && root.contains(target));
  }, []);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setPending(false);
  }, []);

  const held = useCallback(
    (focusTarget?: Element | null) => {
      const { away: isAway, suspended: isSuspended } = live.current;
      // 터치로 쓰는 동안은 시간으로 돌아가지 않습니다 (가리킴이 없어 "떠남"을 알 수 없음) — 마우스·펜이 다시 움직이면 다시 셉니다.
      if (tracker.pointerType === "touch") return true;
      return !isAway || isSuspended || hold.current.pointerInside || hold.current.pressed || keyboardInside(focusTarget);
    },
    [keyboardInside],
  );

  const schedule = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setPending(false);
      // 시간이 다 된 순간 다시 확인합니다 — 그사이 들어왔거나 이미 돌아왔으면 아무것도 하지 않습니다.
      if (!held()) live.current.onReturn();
    }, live.current.delay);
    setPending(true);
  }, [held]);

  const evaluate = useCallback(
    (focusTarget?: Element | null) => {
      if (held(focusTarget)) cancel();
      else if (timer.current === null) schedule();
    },
    [cancel, held, schedule],
  );

  // 처음 보기로 돌아왔거나, 가려지거나, 돌아갈 것이 새로 생기면 다시 판단합니다.
  useEffect(() => {
    if (!suspended && region && tracker.known && tracker.pointerType !== "touch" && typeof document.elementFromPoint === "function") {
      // 가려져 있던 동안의 포인터 위치로 지금 영역 위에 있는지 다시 봅니다 (예: 넓게 보기를 닫은 단추가 레일 위에 있었음).
      const under = document.elementFromPoint(tracker.x, tracker.y);
      hold.current.pointerInside = Boolean(under && region.contains(under));
    }
    evaluate();
  }, [away, suspended, region, evaluate]);

  useEffect(() => {
    const uninstall = installTracker();
    const listener = (event: TrackerEvent) => {
      if (event.type === "release") {
        if (!hold.current.pressed) return;
        hold.current.pressed = false;
        evaluate();
        return;
      }
      if (event.type === "modality") {
        evaluate();
        return;
      }
      // 터치: 영역 밖을 실제로 톡 눌렀을 때만 바로 돌아갑니다 (스크롤 몸짓은 click 을 만들지 않음).
      const root = live.current.region;
      const target = event.target instanceof Node ? event.target : null;
      if (!root || !target || root.contains(target) || !target.isConnected) return;
      if (!live.current.away || live.current.suspended) return;
      cancel();
      live.current.onReturn();
    };
    trackerListeners.add(listener);
    return () => {
      trackerListeners.delete(listener);
      uninstall();
    };
  }, [cancel, evaluate]);

  useEffect(() => {
    if (!region) return;
    const enter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      hold.current.pointerInside = true;
      evaluate();
    };
    const leave = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      hold.current.pointerInside = false;
      evaluate();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || hold.current.pointerInside) return;
      hold.current.pointerInside = true;
      evaluate();
    };
    const down = (event: PointerEvent) => {
      hold.current.pressed = true;
      if (event.pointerType !== "touch") hold.current.pointerInside = true;
      evaluate();
    };
    const focusIn = () => {
      hold.current.focusInside = true;
      evaluate();
    };
    const focusOut = (event: FocusEvent) => {
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      hold.current.focusInside = Boolean(next && region.contains(next));
      evaluate(next);
    };
    const keyDown = () => evaluate();
    // 영역 안에서 스크롤이 일어나면 (관성 스크롤 포함) 읽는 중으로 보고 시간을 다시 잽니다.
    const scroll = () => {
      if (timer.current !== null) schedule();
    };
    region.addEventListener("pointerenter", enter);
    region.addEventListener("pointerleave", leave);
    region.addEventListener("pointermove", move, { passive: true });
    region.addEventListener("pointerdown", down);
    region.addEventListener("focusin", focusIn);
    region.addEventListener("focusout", focusOut);
    region.addEventListener("keydown", keyDown);
    region.addEventListener("scroll", scroll, { capture: true, passive: true });
    return () => {
      region.removeEventListener("pointerenter", enter);
      region.removeEventListener("pointerleave", leave);
      region.removeEventListener("pointermove", move);
      region.removeEventListener("pointerdown", down);
      region.removeEventListener("focusin", focusIn);
      region.removeEventListener("focusout", focusOut);
      region.removeEventListener("keydown", keyDown);
      region.removeEventListener("scroll", scroll, { capture: true } as EventListenerOptions);
    };
  }, [region, evaluate, schedule]);

  // 언마운트(대화상자 닫기 포함) 때 시계를 지웁니다.
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    },
    [],
  );

  /** 영역이 초점을 갖고 있었는지 — 초점을 가진 요소가 사라진 경우(문서 body 로 떨어짐)도 포함합니다 */
  const hadFocus = useCallback(() => {
    const root = live.current.region;
    if (!root || typeof document === "undefined") return false;
    const active = document.activeElement;
    if (active && active !== document.body && root.contains(active)) return true;
    return hold.current.focusInside && (!active || active === document.body);
  }, []);

  return { ref: setRegion, pending, hadFocus };
}
