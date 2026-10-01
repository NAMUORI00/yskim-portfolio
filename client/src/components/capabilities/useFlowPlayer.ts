/*
 * 자세히 보기 흐름 도식의 재생기 — flowPlayback.ts 의 순수 로직에 타이머만 붙입니다.
 * - 처음에는 한 번만 끝까지 재생하고 멈춥니다 (반복 재생 없음). 그 뒤에는 단계를 골라 설명을 봅니다.
 * - 움직임 줄이기 설정이면 자동 재생하지 않고 모든 단계를 한 번에 보여 줍니다.
 * - active 가 false 인 동안(닫힌 대화상자 등)이나 컴포넌트가 사라지면 예약된 타이머를 모두 지웁니다.
 */
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  delayBeforeNextStep,
  initialJourney,
  isDone,
  journeyPhase,
  journeyReducer,
  journeyStep,
  STEP_MS,
  type JourneyAction,
  type JourneyState,
  type StepPhase,
} from "./flowPlayback";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function reducedMotionNow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(reducedMotionNow);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** 자세히 보기 도식의 재생·단계 선택 (작은 도식과 넓게 보기가 같은 상태를 함께 씁니다) */
export interface Journey {
  /** 지금 설명을 보여 주는 단계 */
  step: number;
  playing: boolean;
  /** 끝까지 켜졌는지 (움직임 줄이기의 한눈에 보기 포함) */
  done: boolean;
  reducedMotion: boolean;
  phase: (index: number) => StepPhase;
  pick: (index: number) => void;
  /** 재생 ↔ 멈춤, 끝까지 본 뒤에는 처음부터 다시 */
  toggle: () => void;
}

interface StoredJourney {
  key: string;
  journey: JourneyState;
}

type StoredAction = JourneyAction | { type: "rekey"; key: string; autoplay: boolean };

/**
 * @param count    단계 수
 * @param resetKey 흐름이 바뀌면 처음 상태(자동 재생 또는 한눈에 보기)로 돌아갑니다
 * @param active   false 인 동안(예: 닫힌 대화상자)은 타이머를 걸지 않고, 다시 true 가 되면 이어서 재생합니다
 * @param stepMs   단계 사이 간격
 */
export function useJourney(count: number, resetKey: string, active: boolean, stepMs: number = STEP_MS): Journey {
  const reducedMotion = usePrefersReducedMotion();
  const [stored, dispatch] = useReducer(
    (current: StoredJourney, action: StoredAction): StoredJourney => {
      if (action.type === "rekey") return { key: action.key, journey: initialJourney(count, action.autoplay) };
      const journey = journeyReducer(current.journey, action, count);
      return journey === current.journey ? current : { ...current, journey };
    },
    undefined,
    (): StoredJourney => ({ key: resetKey, journey: initialJourney(count, !reducedMotionNow()) }),
  );
  // 흐름이 바뀐 첫 화면부터 새 흐름의 처음 상태로 그립니다 (저장된 상태는 바로 뒤에 맞춥니다).
  const stale = stored.key !== resetKey;
  const fresh = useMemo(() => initialJourney(count, !reducedMotionNow()), [count, resetKey]);
  const state = stale ? fresh : stored.journey;
  const { player } = state;

  useEffect(() => {
    if (stale) dispatch({ type: "rekey", key: resetKey, autoplay: !reducedMotionNow() });
  }, [stale, resetKey]);

  // 단계마다 타이머 하나만 걸고, 상태가 바뀌거나 닫히면 바로 지웁니다.
  useEffect(() => {
    if (!active || stale || !player.playing) return;
    const id = window.setTimeout(() => dispatch({ type: "tick" }), delayBeforeNextStep(player.step, stepMs));
    return () => window.clearTimeout(id);
  }, [active, stale, player.playing, player.step, stepMs]);

  // 재생 중에 움직임 줄이기가 켜지면 멈춥니다.
  useEffect(() => {
    if (reducedMotion) dispatch({ type: "pause" });
  }, [reducedMotion]);

  const pick = useCallback((index: number) => dispatch({ type: "pick", index }), []);
  const toggle = useCallback(() => dispatch({ type: "toggle" }), []);

  return {
    step: journeyStep(state, count),
    playing: player.playing,
    done: isDone(player, count),
    reducedMotion,
    phase: (index: number) => journeyPhase(index, state, count),
    pick,
    toggle,
  };
}
