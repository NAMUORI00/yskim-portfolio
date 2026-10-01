import { describe, expect, it } from "vitest";
import {
  INLINE_STEP_MS,
  START_DELAY_MS,
  STEP_MS,
  delayBeforeNextStep,
  initialJourney,
  initialPlayerState,
  isDone,
  journeyPhase,
  journeyReducer,
  journeyStep,
  playerReducer,
  type JourneyAction,
  type JourneyState,
  type PlayerAction,
  type PlayerState,
} from "./flowPlayback";

const COUNT = 6;
const run = (state: PlayerState, ...actions: PlayerAction[]) => actions.reduce((current, action) => playerReducer(current, action, COUNT), state);

describe("flow playback", () => {
  it("starts playing from before the first step when motion is allowed", () => {
    expect(initialPlayerState(COUNT, true)).toEqual({ step: -1, playing: true, overview: false });
  });

  it("shows every step at once when motion is reduced", () => {
    const state = initialPlayerState(COUNT, false);
    expect(state).toEqual({ step: 5, playing: false, overview: true });
    expect(isDone(state, COUNT)).toBe(true);
  });

  it("plays once to the end and stops there (no loop)", () => {
    let state = initialPlayerState(COUNT, true);
    const seen: number[] = [];
    for (let i = 0; i < 20 && state.playing; i += 1) {
      state = playerReducer(state, { type: "tick" }, COUNT);
      seen.push(state.step);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
    expect(state.playing).toBe(false);
    expect(isDone(state, COUNT)).toBe(true);
    // 끝에서는 더 진행하지 않습니다.
    expect(playerReducer(state, { type: "tick" }, COUNT)).toBe(state);
  });

  it("pauses and resumes from the same step", () => {
    const paused = run({ step: 2, playing: true, overview: false }, { type: "pause" });
    expect(paused).toEqual({ step: 2, playing: false, overview: false });
    expect(run(paused, { type: "toggle" })).toEqual({ step: 2, playing: true, overview: false });
    expect(run(paused, { type: "play" })).toEqual({ step: 2, playing: true, overview: false });
  });

  it("replays from the start when play is pressed at the end or in the overview", () => {
    expect(run({ step: 5, playing: false, overview: false }, { type: "toggle" })).toEqual({ step: -1, playing: true, overview: false });
    expect(run(initialPlayerState(COUNT, false), { type: "play" })).toEqual({ step: -1, playing: true, overview: false });
  });

  it("replay without motion parks on the first step instead of animating", () => {
    expect(run({ step: 4, playing: false, overview: false }, { type: "replay", animate: true })).toEqual({ step: -1, playing: true, overview: false });
    expect(run({ step: 4, playing: true, overview: false }, { type: "replay", animate: false })).toEqual({ step: 0, playing: false, overview: false });
  });

  it("steps manually, pausing playback and staying inside the flow", () => {
    expect(run({ step: 1, playing: true, overview: false }, { type: "next" })).toEqual({ step: 2, playing: false, overview: false });
    expect(run({ step: 5, playing: false, overview: false }, { type: "next" })).toEqual({ step: 5, playing: false, overview: false });
    expect(run({ step: 0, playing: false, overview: false }, { type: "prev" })).toEqual({ step: 0, playing: false, overview: false });
    expect(run({ step: -1, playing: true, overview: false }, { type: "prev" })).toEqual({ step: 0, playing: false, overview: false });
    // 한눈에 보기에서 이전을 누르면 마지막 앞 단계부터 하나씩 봅니다.
    expect(run(initialPlayerState(COUNT, false), { type: "prev" })).toEqual({ step: 4, playing: false, overview: false });
    expect(run({ step: 0, playing: true, overview: false }, { type: "jump", step: 9 })).toEqual({ step: 5, playing: false, overview: false });
    expect(run({ step: 3, playing: true, overview: false }, { type: "jump", step: -4 })).toEqual({ step: 0, playing: false, overview: false });
  });

  it("waits briefly before the first step, then the given pace between steps", () => {
    expect(STEP_MS).toBe(3200);
    expect(delayBeforeNextStep(-1)).toBe(START_DELAY_MS);
    expect(delayBeforeNextStep(0)).toBe(STEP_MS);
    expect(delayBeforeNextStep(4, INLINE_STEP_MS)).toBe(INLINE_STEP_MS);
  });

  it("stays idle for an empty flow", () => {
    expect(initialPlayerState(0, true)).toEqual({ step: -1, playing: false, overview: false });
    expect(playerReducer({ step: 3, playing: true, overview: false }, { type: "tick" }, 0)).toEqual({ step: -1, playing: false, overview: false });
  });
});

describe("flow diagram playback with step selection (자세히 보기)", () => {
  const go = (state: JourneyState, ...actions: JourneyAction[]) => actions.reduce((current, action) => journeyReducer(current, action, COUNT), state);
  const phases = (state: JourneyState) => [0, 1, 2, 3, 4, 5].map((index) => journeyPhase(index, state, COUNT));
  const played = () => go(initialJourney(COUNT, true), ...Array.from({ length: COUNT }, () => ({ type: "tick" }) as const));

  it("follows the newly lit step while playing and ends on the last step (the result)", () => {
    expect(INLINE_STEP_MS).toBe(2400);
    const start = initialJourney(COUNT, true);
    expect(phases(start)).toEqual(["off", "off", "off", "off", "off", "off"]);
    const second = go(start, { type: "tick" }, { type: "tick" });
    expect(journeyStep(second, COUNT)).toBe(1);
    expect(phases(second)).toEqual(["on", "now", "off", "off", "off", "off"]);
    const end = played();
    expect(end.player.playing).toBe(false);
    expect(journeyStep(end, COUNT)).toBe(5);
    expect(phases(end)).toEqual(["on", "on", "on", "on", "on", "now"]);
  });

  it("picking a step mid-play pauses there; picking after the end only moves the explanation", () => {
    const paused = go(initialJourney(COUNT, true), { type: "tick" }, { type: "pick", index: 3 });
    expect(paused.player).toEqual({ step: 3, playing: false, overview: false });
    expect(phases(paused)).toEqual(["on", "on", "on", "now", "off", "off"]);
    // 이어서 재생하면 고른 단계 다음부터 켭니다.
    expect(go(paused, { type: "toggle" }, { type: "tick" }).player.step).toBe(4);

    const explored = go(played(), { type: "pick", index: 1 });
    expect(phases(explored)).toEqual(["on", "now", "on", "on", "on", "on"]);
    expect(journeyStep(go(explored, { type: "next" }), COUNT)).toBe(2);
    expect(journeyStep(go(explored, { type: "prev" }, { type: "prev" }), COUNT)).toBe(0);
    expect(journeyStep(go(explored, { type: "pick", index: 99 }), COUNT)).toBe(5);
    // 끝까지 본 뒤 재생을 누르면 처음부터 다시 봅니다.
    expect(go(explored, { type: "toggle" })).toEqual({ player: { step: -1, playing: true, overview: false }, pick: null });
  });

  it("with reduced motion shows every step, explains the first, and moves only the explanation", () => {
    const still = initialJourney(COUNT, false);
    expect(still.player.playing).toBe(false);
    expect(phases(still)).toEqual(["now", "on", "on", "on", "on", "on"]);
    expect(phases(go(still, { type: "next" }))).toEqual(["on", "now", "on", "on", "on", "on"]);
    expect(go(still, { type: "reset", autoplay: false })).toEqual(still);
  });
});
