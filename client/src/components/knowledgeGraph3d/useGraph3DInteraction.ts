/*
 * 3D 지식 지도에서 "지금 보여 줄 대상"을 정합니다 — 지식 노드, 분야(domain:<id>), 근거·홈 목록에서 가리킨 프로젝트(project:<slug>).
 * 가리킴(포인터) · 키보드 초점 · 고정을 따로 들고, 아래 규칙으로만 합칩니다 (resolveFocus3D).
 *  - 고정이 없으면: 가리킨 것 → 키보드 초점 → 홈 목록에서 가리킨 프로젝트 순서로 "미리 보기" 합니다 (설명 칸·이웃 강조).
 *  - 고정하면(펼친 분야 안에서): 설명 칸·강조가 고정한 대상에 머뭅니다. 다른 대상을 가리키거나 초점을 옮겨도 가벼운 표시(cue)만 생기고,
 *    다른 대상을 누르거나 Enter 를 누를 때, 고정을 풀 때, Esc 를 누를 때만 바뀝니다. 홈 목록에서 가리킨 프로젝트도 무시합니다.
 * 대상 사이를 옮겨 다닐 때(빈틈을 지날 때) 잠깐 비는 순간에 설명이 깜박이지 않도록, 비우는 것만 짧게 늦춥니다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18nContent";
import { graph3dCopy } from "./graph3dCopy";
import { focusKind, type KnowledgeGraph } from "./graph3dModel";
import type { ExploreState } from "./useGraph3DExplore";

const CLEAR_DELAY_MS = 90;

export interface PinControl3D {
  pinnedId: string | null;
  setPinned: (id: string | null) => void;
}

export type FocusMode3D = "idle" | "preview" | "pinned";

export interface FocusSources3D {
  hoverId: string | null;
  keyboardId: string | null;
  /** 홈 목록에서 가리킨 프로젝트 (project:<slug>) */
  externalId: string | null;
  pinnedId: string | null;
}

export interface Focus3D {
  /** 설명 칸과 이웃 강조의 기준 — 고정한 대상, 없으면 미리 보는 대상 */
  focusId: string | null;
  /** 지도에서 지금 가리키거나 키보드 초점이 있는 대상 (고정 여부와 관계없이) */
  activeId: string | null;
  /** 고정한 동안 다른 대상을 가리키거나 초점을 옮겼을 때 그 대상 — 가벼운 표시만 하고 설명은 바꾸지 않습니다 */
  cueId: string | null;
  mode: FocusMode3D;
}

export function resolveFocus3D(graph: KnowledgeGraph, { hoverId, keyboardId, externalId, pinnedId }: FocusSources3D): Focus3D {
  const valid = (id: string | null) => (focusKind(graph, id) ? id : null);
  const pinned = valid(pinnedId);
  const activeId = valid(hoverId) ?? valid(keyboardId);
  if (pinned) return { focusId: pinned, activeId, cueId: activeId && activeId !== pinned ? activeId : null, mode: "pinned" };
  const preview = activeId ?? valid(externalId);
  return { focusId: preview, activeId, cueId: null, mode: preview ? "preview" : "idle" };
}

function useDelayedClear() {
  const [value, setValue] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const set = useCallback((next: string | null) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (next) setValue(next);
    else timer.current = setTimeout(() => setValue(null), CLEAR_DELAY_MS);
  }, []);
  /** 바로 비웁니다 (보기가 바뀔 때) */
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setValue(null);
  }, []);
  return [value, set, clear] as const;
}

export function useGraph3DInteraction(graph: KnowledgeGraph, externalId: string | null, control?: PinControl3D) {
  const [hoverId, setHover, clearHover] = useDelayedClear();
  const [keyboardId, setKeyboard, clearKeyboard] = useDelayedClear();
  const [ownPinned, setOwnPinned] = useState<string | null>(null);
  const [rovingId, setRovingId] = useState<string | null>(null);
  const pinnedId = control ? control.pinnedId : ownPinned;
  const setPinned = control ? control.setPinned : setOwnPinned;
  const focus = resolveFocus3D(graph, { hoverId, keyboardId, externalId, pinnedId });
  // 누르기·Enter: 다른 대상이면 그쪽으로 고정을 옮기고, 고정한 대상을 다시 누르면 풉니다.
  const togglePin = useCallback((id: string) => setPinned(pinnedId === id ? null : id), [pinnedId, setPinned]);
  /** 보기가 바뀌면 지난 보기의 가리킴·초점 미리 보기를 지웁니다 (고정은 공유 상태가 맡음). */
  const resetPreview = useCallback(() => {
    clearHover();
    clearKeyboard();
  }, [clearHover, clearKeyboard]);
  return { ...focus, hoverId, keyboardId, pinnedId, rovingId, setHover, setKeyboard, setPinned, setRovingId, togglePin, resetPreview };
}

/**
 * 분야를 펼치거나 전체 보기로 돌아올 때, 고정하거나 풀었을 때 화면 낭독기에 한 번 알립니다
 * (처음 그릴 때와 언어만 바뀔 때는 알리지 않음).
 */
export function useExploreAnnouncement(graph: KnowledgeGraph, explore: ExploreState, locale: Locale): string {
  const previous = useRef(explore);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const before = previous.current;
    previous.current = explore;
    const copy = graph3dCopy(locale);
    const parts: string[] = [];
    if (before.mode !== explore.mode || before.domain !== explore.domain) {
      const domain = explore.domain ? graph.domainById.get(explore.domain) : undefined;
      parts.push(explore.mode === "detail" && domain ? copy.openAnnounce(domain.title) : copy.backAnnounce);
    }
    if (before.pinnedId !== explore.pinnedId) {
      const id = explore.pinnedId;
      const title = id ? (graph.byId.get(id)?.title ?? graph.evidence.get(id)?.title) : undefined;
      if (title) parts.push(copy.pinAnnounce(title));
      else if (before.pinnedId && explore.mode === before.mode && explore.domain === before.domain) parts.push(copy.unpinAnnounce);
    }
    if (parts.length) setMessage(parts.join(" · "));
  }, [explore, graph, locale]);
  return message;
}
