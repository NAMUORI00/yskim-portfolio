/*
 * 두 가지 보기와 그 사이의 전환 — 전체 보기(사람을 가운데 둔 지식의 구) ↔ 분야를 펼친 2.5D 층 그림.
 * ─────────────────────────────────────────────────────────────
 *  - 레일과 넓게 보기는 같은 상태(ExploreState: 보기 · 펼친 분야 · 고정한 대상)를 함께 쓰고, 화면마다 자기 카메라와
 *    펼친 정도(unfold 0–1)를 따로 움직입니다. 가려진 화면은 움직이지 않고 바로 같은 상태가 됩니다.
 *  - 펼치기: 고른 분야를 앞으로 돌려 오고(0.48초) → 종류별 층으로 펼칩니다(0.64초, 층마다 조금씩 늦게).
 *    접기: 층을 접어 지식의 구로 돌려보내고(0.52초) → 처음 시점으로 돌아갑니다(0.76초). 다른 분야로 바로 옮길 때는 접고 → 돌리고 → 펼칩니다.
 *  - 움직임 줄이기면 공간 이동 없이 바로 바꿉니다. 전환 중에 다시 고르면 지금 자리에서 이어서 바꿉니다 (튀지 않음).
 *  - 공유 프레임 시계 하나만 씁니다. 전환하는 동안만 이 지도(레일·대화상자)만 다시 그리고, 홈 전체는 다시 그리지 않습니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lerpCamera, useCamera3D } from "./Graph3DCanvas";
import { defaultCamera, forwardCamera, INTRO_MS, INTRO_SWEEP, type Camera3D, type Layout3D } from "./graph3dLayout";
import type { DomainId } from "./graph3dModel";
import { subscribeFrames } from "./graph3dMotion";

export type ExploreMode = "overview" | "detail";

export interface ExploreState {
  mode: ExploreMode;
  /** 펼친 분야 (전체 보기에서는 null) */
  domain: DomainId | null;
  /** 펼친 분야에서 고정한 지식·근거 */
  pinnedId: string | null;
}

export const INITIAL_EXPLORE: ExploreState = { mode: "overview", domain: null, pinnedId: null };

export function openDomain(domain: DomainId, pinnedId: string | null = null): ExploreState {
  return { mode: "detail", domain, pinnedId };
}

/** 전환 시간 (ms) */
export const TRANSITION_MS = { forward: 480, unfold: 640, fold: 520, home: 760, switchFold: 380, switchForward: 520 } as const;

type Step =
  | { kind: "camera"; to: Camera3D; ms: number; /** 가까운 쪽으로 돌도록 옮기기 전의 목표 — 끝나면 이 값 그대로 둡니다 */ exact?: Camera3D }
  | { kind: "unfold"; to: number; ms: number }
  | { kind: "show"; domain: DomainId | null };

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** 여러 바퀴 돌린 뒤에도 가까운 쪽으로만 돌도록 목표 각도를 지금 각도 둘레로 옮깁니다. */
function nearestYaw(from: Camera3D, to: Camera3D): Camera3D {
  const turn = to.yaw - from.yaw;
  return { ...to, yaw: from.yaw + turn - 2 * Math.PI * Math.round(turn / (2 * Math.PI)) };
}

function canAnimate(): boolean {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return false;
  return !(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export interface ExploreViewOptions {
  layout: Layout3D;
  /** 펼칠 분야 (전체 보기면 null) — 공유 상태에서 옵니다 */
  target: DomainId | null;
  reduced: boolean;
  /** 이 화면이 보이고 있는지 (넓게 보기에 가려진 레일은 false) — 아니면 움직임 없이 바로 바꿉니다 */
  active: boolean;
  /** 처음 한 번 살짝 돌아오며 멈추는 움직임 (레일) */
  intro?: boolean;
}

export function useExploreView({ layout, target, reduced, active, intro = false }: ExploreViewOptions) {
  const home = useMemo(() => defaultCamera(layout), [layout]);
  const introPending = useRef(intro && canAnimate());
  const { camera, animating, setNow, animateTo } = useCamera3D(() => (introPending.current ? { ...home, yaw: home.yaw - INTRO_SWEEP } : home), reduced);
  const [shown, setShown] = useState<DomainId | null>(target);
  const [unfold, setUnfold] = useState(target ? 1 : 0);
  const [running, setRunning] = useState(false);
  /** 사용자가 전체 보기의 시점을 돌리거나 확대했는지 (돌아갈 것이 있는지) */
  const [moved, setMoved] = useState(false);
  const live = useRef({ camera, shown, unfold, moved });
  live.current = { camera, shown, unfold, moved };
  const stop = useRef<(() => void) | null>(null);
  const previousTarget = useRef(target);

  const halt = useCallback(() => {
    stop.current?.();
    stop.current = null;
  }, []);

  useEffect(() => halt, [halt]);

  // 처음 한 번만 살짝 돌아오며 멈춥니다 (계속 돌지 않음). 다음 프레임에 시작해 두 번 실행되는 개발 모드에서도 한 번만 돕니다.
  useEffect(() => {
    if (!introPending.current) return;
    const frameId = requestAnimationFrame(() => {
      if (!introPending.current) return;
      introPending.current = false;
      animateTo(home, INTRO_MS);
    });
    return () => cancelAnimationFrame(frameId);
  }, [animateTo, home]);

  /** 단계를 차례로 — 카메라 이동 · 펼침 정도 · 보이는 분야 바꾸기 */
  const run = useCallback(
    (steps: Step[]) => {
      halt();
      introPending.current = false;
      let index = 0;
      let start: number | null = null;
      let fromCamera = live.current.camera;
      let fromUnfold = live.current.unfold;
      const settle = () => {
        while (index < steps.length && steps[index].kind === "show") {
          const step = steps[index] as Extract<Step, { kind: "show" }>;
          live.current.shown = step.domain;
          setShown(step.domain);
          index += 1;
        }
        start = null;
        fromCamera = live.current.camera;
        fromUnfold = live.current.unfold;
      };
      settle();
      if (index >= steps.length) {
        setRunning(false);
        return;
      }
      setRunning(true);
      let unsubscribe: (() => void) | null = null;
      const finish = () => {
        unsubscribe?.();
        if (stop.current === cancel) stop.current = null;
        setRunning(false);
      };
      const cancel = () => {
        unsubscribe?.();
        unsubscribe = null;
        setRunning(false);
      };
      unsubscribe = subscribeFrames((now) => {
        const step = steps[index];
        if (!step || step.kind === "show") {
          finish();
          return;
        }
        if (start === null) {
          start = now;
          if (step.kind === "camera") {
            step.exact = step.to;
            step.to = nearestYaw(fromCamera, step.to);
          }
        }
        const t = step.ms <= 0 ? 1 : Math.min(1, (now - start) / step.ms);
        if (step.kind === "camera") {
          const next = t >= 1 && step.exact ? step.exact : lerpCamera(fromCamera, step.to, easeInOut(t));
          live.current.camera = next;
          setNow(next);
        } else if (step.kind === "unfold") {
          const next = fromUnfold + (step.to - fromUnfold) * t;
          live.current.unfold = next;
          setUnfold(next);
        }
        if (t >= 1) {
          index += 1;
          settle();
          if (index >= steps.length) finish();
        }
      });
      stop.current = cancel;
    },
    [halt, setNow],
  );

  // 공유 상태의 보기가 바뀌면 이 화면도 따라갑니다 (보이면 움직여서, 가려져 있거나 움직임 줄이기면 바로).
  useEffect(() => {
    if (previousTarget.current === target) return;
    previousTarget.current = target;
    const current = live.current;
    if (!active || reduced || !canAnimate()) {
      halt();
      setRunning(false);
      live.current.shown = target;
      live.current.unfold = target ? 1 : 0;
      setShown(target);
      setUnfold(target ? 1 : 0);
      if (!target) {
        live.current.moved = false;
        setMoved(false);
        setNow(home);
      }
      return;
    }
    if (target) {
      const forward = forwardCamera(layout, target);
      if (current.shown === target) run([{ kind: "camera", to: forward, ms: current.unfold > 0 ? 0 : TRANSITION_MS.forward }, { kind: "unfold", to: 1, ms: TRANSITION_MS.unfold * (1 - current.unfold) }]);
      else if (current.shown && current.unfold > 0)
        run([
          { kind: "unfold", to: 0, ms: TRANSITION_MS.switchFold * current.unfold },
          { kind: "show", domain: target },
          { kind: "camera", to: forward, ms: TRANSITION_MS.switchForward },
          { kind: "unfold", to: 1, ms: TRANSITION_MS.unfold },
        ]);
      else run([{ kind: "show", domain: target }, { kind: "camera", to: forward, ms: TRANSITION_MS.forward }, { kind: "unfold", to: 1, ms: TRANSITION_MS.unfold }]);
      return;
    }
    live.current.moved = false;
    setMoved(false);
    run([{ kind: "unfold", to: 0, ms: TRANSITION_MS.fold * current.unfold }, { kind: "show", domain: null }, { kind: "camera", to: home, ms: TRANSITION_MS.home }]);
  }, [target, active, reduced, layout, home, halt, run, setNow]);

  /** 사용자가 시점을 바꿈 (끌기·키·도구) — 돌아갈 것이 생깁니다 */
  const moveCamera = useCallback(
    (next: Camera3D) => {
      halt();
      introPending.current = false;
      live.current.moved = true;
      setMoved(true);
      setNow(next);
    },
    [halt, setNow],
  );

  const animateCamera = useCallback(
    (next: Camera3D, duration?: number) => {
      halt();
      introPending.current = false;
      live.current.moved = true;
      setMoved(true);
      animateTo(next, duration);
    },
    [animateTo, halt],
  );

  /** 처음 시점으로 (전체 보기에서 돌린 시점만 되돌릴 때) — 펼친 분야를 접는 것은 공유 상태가 맡습니다 */
  const resetCamera = useCallback(() => {
    const wasMoved = live.current.moved;
    live.current.moved = false;
    setMoved(false);
    if (live.current.shown || live.current.unfold > 0 || !wasMoved) return;
    if (!active || reduced || !canAnimate()) {
      halt();
      setNow(home);
      return;
    }
    run([{ kind: "camera", to: home, ms: TRANSITION_MS.home }]);
  }, [active, reduced, halt, home, run, setNow]);

  return {
    camera,
    home,
    /** 지금 보이는(펼치는 중이거나 접는 중인) 분야 */
    shown,
    unfold,
    /** 전환 중 */
    transitioning: running,
    /** 카메라가 움직이는 중 (처음 돌아오기·도구 전환·전환) — 가리킴을 무시합니다 */
    animating: animating || running,
    moved,
    moveCamera,
    animateCamera,
    resetCamera,
  };
}
