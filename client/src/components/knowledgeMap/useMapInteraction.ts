/*
 * 지식 지도에서 "지금 보여 줄 노드"를 정합니다.
 * 우선순위: 포인터로 가리킨 노드 → 키보드 초점 → 홈 목록에서 가리킨 프로젝트 → 고정한 노드
 * 노드 사이를 옮겨 다닐 때 잠깐 비는 순간에 경로가 깜박이지 않도록, 비우는 것만 짧게 늦춥니다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18nContent";
import { mapCopy } from "./knowledgeMapCopy";
import type { KnowledgeMap } from "./knowledgeMapModel";

const CLEAR_DELAY_MS = 90;

export interface PinControl {
  pinnedId: string | null;
  setPinned: (id: string | null) => void;
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
  return [value, set] as const;
}

export function useMapInteraction(map: KnowledgeMap, externalId: string | null, control?: PinControl) {
  const [hoverId, setHover] = useDelayedClear();
  const [keyboardId, setKeyboard] = useDelayedClear();
  const [ownPinned, setOwnPinned] = useState<string | null>(null);
  const [rovingId, setRovingId] = useState<string | null>(null);
  const pinnedId = control ? control.pinnedId : ownPinned;
  const setPinned = control ? control.setPinned : setOwnPinned;
  const valid = (id: string | null) => (id && map.byId.has(id) ? id : null);
  const focusId = valid(hoverId) ?? valid(keyboardId) ?? valid(externalId) ?? valid(pinnedId);
  const togglePin = useCallback((id: string) => setPinned(pinnedId === id ? null : id), [pinnedId, setPinned]);
  return { focusId, hoverId, keyboardId, pinnedId, rovingId, setHover, setKeyboard, setPinned, setRovingId, togglePin };
}

/** 고정하거나 풀었을 때 화면 낭독기에 한 번 알립니다 (처음 그릴 때와 언어만 바뀔 때는 알리지 않음). */
export function usePinAnnouncement(map: KnowledgeMap, pinnedId: string | null, locale: Locale): string {
  const previous = useRef(pinnedId);
  const [message, setMessage] = useState("");
  const text = useMemo(() => {
    const copy = mapCopy(locale);
    const node = pinnedId ? map.byId.get(pinnedId) : null;
    if (!node) return copy.unpinAnnounce;
    return copy.pinAnnounce(node, map.above.get(node.id)?.length ?? 0, map.below.get(node.id)?.length ?? 0);
  }, [map, pinnedId, locale]);
  useEffect(() => {
    if (previous.current === pinnedId) return;
    previous.current = pinnedId;
    setMessage(text);
  }, [pinnedId, text]);
  return message;
}
