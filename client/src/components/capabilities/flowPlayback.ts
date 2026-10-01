/*
 * 흐름 재생 로직 (홈 프로젝트 자세히 보기의 작은 도식과 넓게 보기가 함께 씀) — React 없이 시험할 수 있는 순수 함수만 둡니다.
 *
 * step 은 "지금까지 켜진 마지막 단계"입니다.
 *   -1     : 아직 아무 단계도 켜지지 않음 (재생 직전)
 *   0…n-1  : 0번부터 그 단계까지 켜짐. step === n-1 이면 끝까지 본 상태(done)
 * overview 는 "모든 단계를 한꺼번에 보여 주는 상태"입니다 (움직임 줄이기 설정의 첫 화면).
 *   이때는 데이터 이동 표시를 하지 않습니다.
 * 연결선은 도착 단계가 켜질 때 함께 켜집니다 (참고한 대시보드 흐름 재생과 같은 규칙).
 */

/** 기본 단계 사이 간격 */
export const STEP_MS = 3200;
/** 자세히 보기 도식의 단계 사이 간격 (고른 단계 설명이 한두 문장이라 짧게 둡니다) */
export const INLINE_STEP_MS = 2400;
/** 재생을 누른 뒤 첫 단계가 켜지기까지의 짧은 간격 */
export const START_DELAY_MS = 300;

export interface PlayerState {
  step: number;
  playing: boolean;
  overview: boolean;
}

export type PlayerAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "replay"; animate: boolean }
  | { type: "next" }
  | { type: "prev" }
  | { type: "jump"; step: number }
  | { type: "tick" }
  | { type: "showAll" };

const IDLE: PlayerState = { step: -1, playing: false, overview: false };

export function lastStep(count: number): number {
  return Math.max(0, count) - 1;
}

/** 처음 상태: 자동 재생이면 처음부터 재생, 아니면(움직임 줄이기) 모든 단계를 한 번에 보여 줍니다. */
export function initialPlayerState(count: number, autoplay: boolean): PlayerState {
  if (count <= 0) return IDLE;
  return autoplay ? { step: -1, playing: true, overview: false } : { step: lastStep(count), playing: false, overview: true };
}

export function isDone(state: PlayerState, count: number): boolean {
  return count > 0 && state.step >= lastStep(count);
}

function clamp(step: number, count: number): number {
  if (count <= 0) return -1;
  return Math.min(lastStep(count), Math.max(0, Math.round(step)));
}

export function playerReducer(state: PlayerState, action: PlayerAction, count: number): PlayerState {
  if (count <= 0) return IDLE;
  const last = lastStep(count);
  switch (action.type) {
    case "play":
      // 끝까지 본 뒤(또는 한눈에 보기에서) 재생을 누르면 처음부터 다시 봅니다.
      return state.step >= last ? { step: -1, playing: true, overview: false } : { step: state.step, playing: true, overview: false };
    case "pause":
      return state.playing ? { ...state, playing: false } : state;
    case "toggle":
      if (state.playing) return { ...state, playing: false };
      return playerReducer(state, { type: "play" }, count);
    case "replay":
      // 움직임을 줄인 경우에는 첫 단계에 멈춰 두고 사용자가 직접 넘기게 합니다.
      return action.animate ? { step: -1, playing: true, overview: false } : { step: 0, playing: false, overview: false };
    case "next":
      return { step: Math.min(last, state.step + 1), playing: false, overview: false };
    case "prev":
      return { step: Math.max(0, state.step - 1), playing: false, overview: false };
    case "jump":
      return { step: clamp(action.step, count), playing: false, overview: false };
    case "tick": {
      if (!state.playing) return state;
      const step = Math.min(last, state.step + 1);
      return { step, playing: step < last, overview: false };
    }
    case "showAll":
      return { step: last, playing: false, overview: true };
    default:
      return state;
  }
}

/** 다음 tick 까지 기다릴 시간 (stepMs: 단계 사이 간격) */
export function delayBeforeNextStep(step: number, stepMs: number = STEP_MS): number {
  return step < 0 ? START_DELAY_MS : stepMs;
}

/** 단계(상자)의 상태: 아직 / 켜짐 / 지금(설명 중) */
export type StepPhase = "off" | "on" | "now";

/* ────────────────────────────────────────────
   자세히 보기 도식의 재생과 단계 선택
   - 재생 중에는 새로 켜지는 단계가 곧 설명을 보여 줄 단계입니다.
   - 재생 도중에 단계를 고르면 재생을 멈추고 그 단계까지 켭니다.
   - 끝까지 본 뒤(또는 움직임 줄이기의 한눈에 보기)에는 단계를 골라도 다른 단계를 끄지 않고 설명만 바꿉니다.
──────────────────────────────────────────── */

export interface JourneyState {
  player: PlayerState;
  /** 끝까지 본 뒤 사람이 고른 단계 */
  pick: number | null;
}

export type JourneyAction = PlayerAction | { type: "pick"; index: number } | { type: "reset"; autoplay: boolean };

export function initialJourney(count: number, autoplay: boolean): JourneyState {
  return { player: initialPlayerState(count, autoplay), pick: null };
}

/** 설명을 보여 줄 단계 (한눈에 보기에서는 첫 단계) */
export function journeyStep(state: JourneyState, count: number): number {
  if (count <= 0) return -1;
  if (state.pick !== null) return clamp(state.pick, count);
  if (state.player.overview) return 0;
  return clamp(Math.max(0, state.player.step), count);
}

export function journeyReducer(state: JourneyState, action: JourneyAction, count: number): JourneyState {
  if (count <= 0) return { player: IDLE, pick: null };
  switch (action.type) {
    case "reset":
      return initialJourney(count, action.autoplay);
    case "pick": {
      const index = clamp(action.index, count);
      if (isDone(state.player, count)) return { player: state.player.playing ? { ...state.player, playing: false } : state.player, pick: index };
      return { player: playerReducer(state.player, { type: "jump", step: index }, count), pick: null };
    }
    case "next":
    case "prev":
      return journeyReducer(state, { type: "pick", index: journeyStep(state, count) + (action.type === "next" ? 1 : -1) }, count);
    case "play":
    case "toggle":
    case "replay":
      return { player: playerReducer(state.player, action, count), pick: null };
    default: {
      const player = playerReducer(state.player, action, count);
      return player === state.player ? state : { ...state, player };
    }
  }
}

/** 단계 상자의 상태: 아직 / 켜짐 / 설명 중 (켜진 단계만 "설명 중"이 됩니다) */
export function journeyPhase(index: number, state: JourneyState, count: number): StepPhase {
  const lit = state.player.overview || index <= state.player.step;
  if (!lit) return "off";
  return index === journeyStep(state, count) ? "now" : "on";
}
