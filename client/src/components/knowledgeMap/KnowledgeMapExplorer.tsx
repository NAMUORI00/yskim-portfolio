/*
 * 지식 지도 넓게 보기 — 같은 지도를 큰 대화상자에서 보며 각도를 바꾸고(끌기·Shift+화살표·단추), 정면 보기나 목록으로 바꿉니다.
 * - 레일·서랍과 고정한 노드를 함께 씁니다. 닫으면 연 단추로 초점이 돌아갑니다 (Radix Dialog).
 * - Esc 는 고정한 노드가 있으면 먼저 고정만 풀고, 없으면 창을 닫습니다.
 * - 움직임 줄이기에서는 각도 전환을 애니메이션 없이 바로 바꿉니다.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { RotateCcw, RotateCw, X } from "lucide-react";
import { usePrefersReducedMotion } from "@/components/capabilities/useFlowPlayer";
import type { PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { canvasViewport, KnowledgeMapCanvas, mapThemeVars, useElementSize } from "./KnowledgeMapCanvas";
import { KnowledgeMapDetail, KnowledgeMapOutline } from "./KnowledgeMapDetail";
import { mapCopy } from "./knowledgeMapCopy";
import { layerCounts, type KnowledgeMap, type MapNode } from "./knowledgeMapModel";
import { clampCamera, EXPLORER_CAMERA, FRONT_CAMERA, type FloorPlan, type MapCamera, type MapKey } from "./knowledgeMapLayout";
import { useMapInteraction, usePinAnnouncement } from "./useMapInteraction";

type ViewMode = "tilt" | "front" | "list";

const CAMERA_TWEEN_MS = 360;
const ROTATE_STEP = 0.18;

/** 각도 바꾸기 — 단추는 부드럽게, 끌기·키는 바로 (움직임 줄이기면 늘 바로) */
function useCamera(initial: MapCamera, reduced: boolean) {
  const [camera, setCamera] = useState(initial);
  const [moving, setMoving] = useState(false);
  const frame = useRef(0);
  const current = useRef(initial);
  current.current = camera;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const setNow = useCallback((next: MapCamera) => {
    cancelAnimationFrame(frame.current);
    setCamera(clampCamera(next));
  }, []);

  const animateTo = useCallback(
    (next: MapCamera) => {
      const target = clampCamera(next);
      cancelAnimationFrame(frame.current);
      if (reduced || typeof requestAnimationFrame !== "function") {
        setCamera(target);
        return;
      }
      const from = current.current;
      const start = performance.now();
      setMoving(true);
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / CAMERA_TWEEN_MS);
        const eased = 1 - (1 - progress) ** 3;
        setCamera({ yaw: from.yaw + (target.yaw - from.yaw) * eased, tilt: from.tilt + (target.tilt - from.tilt) * eased });
        if (progress < 1) frame.current = requestAnimationFrame(tick);
        else setMoving(false);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [reduced],
  );

  return { camera, moving, setMoving, setNow, animateTo };
}

export interface KnowledgeMapExplorerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  map: KnowledgeMap;
  plan: FloorPlan;
  T: PortfolioTheme;
  locale: Locale;
  pinnedId: string | null;
  onPin: (id: string | null) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  onLocate?: (node: MapNode) => void;
}

export function KnowledgeMapExplorer({ open, onOpenChange, map, plan, T, locale, pinnedId, onPin, returnFocusRef, onLocate }: KnowledgeMapExplorerProps) {
  const copy = mapCopy(locale);
  const reduced = usePrefersReducedMotion();
  const counts = useMemo(() => layerCounts(map), [map]);
  const vars = useMemo(() => mapThemeVars(T, T.surface), [T]);
  const [mode, setMode] = useState<ViewMode>("tilt");
  const { camera, moving, setMoving, setNow, animateTo } = useCamera(EXPLORER_CAMERA, reduced);
  const interaction = useMapInteraction(map, null, { pinnedId, setPinned: onPin });
  const announcement = usePinAnnouncement(map, pinnedId, locale);
  const [stageRef, stage] = useElementSize<HTMLDivElement>({ width: 760, height: 560 });
  const contentRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; camera: MapCamera; pointer: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();
  const view = useMemo(
    () => canvasViewport("explorer", stage.width, camera, { locale, counts, maxHeight: stage.height }),
    [stage.width, stage.height, camera, locale, counts],
  );
  const focusNode = interaction.focusId ? (map.byId.get(interaction.focusId) ?? null) : null;

  const chooseMode = (next: ViewMode) => {
    setMode(next);
    if (next === "front") animateTo(FRONT_CAMERA);
    if (next === "tilt") animateTo(EXPLORER_CAMERA);
  };

  const rotate = (delta: number) => {
    setMode("tilt");
    animateTo({ ...camera, yaw: camera.yaw + delta });
  };

  const onCameraKey = (key: MapKey) => {
    setMode("tilt");
    if (key === "ArrowLeft") setNow({ ...camera, yaw: camera.yaw - 0.08 });
    if (key === "ArrowRight") setNow({ ...camera, yaw: camera.yaw + 0.08 });
    if (key === "ArrowUp") setNow({ ...camera, tilt: camera.tilt + 0.04 });
    if (key === "ArrowDown") setNow({ ...camera, tilt: camera.tilt - 0.04 });
  };

  const onStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".km-node") || event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, camera, pointer: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    setMoving(true);
  };
  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // 눌렀다 떼기만 하면 각도와 보기 방식을 그대로 둡니다.
    if (Math.hypot(dx, dy) < 3) return;
    setMode("tilt");
    setNow({ yaw: start.camera.yaw + dx * 0.0045, tilt: start.camera.tilt - dy * 0.0028 });
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointer !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setDragging(false);
    setMoving(false);
  };

  const pick = (id: string) => {
    onPin(id);
    interaction.setRovingId(id);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="km-dialog-overlay" style={vars} />
        <Dialog.Content
          ref={contentRef}
          className="km-root km-dialog"
          style={vars}
          onOpenAutoFocus={(event) => {
            const node = contentRef.current?.querySelector<HTMLElement>('.km-node[tabindex="0"]');
            if (node) {
              event.preventDefault();
              node.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            // 고정한 노드가 있으면 창을 닫지 않고 고정만 풉니다.
            if (pinnedId) {
              event.preventDefault();
              onPin(null);
            }
          }}
        >
          <header className="km-dialog-head">
            <div>
              <p className="km-kicker">{copy.kicker}</p>
              <Dialog.Title className="km-dialog-title">{copy.explorerTitle}</Dialog.Title>
              <Dialog.Description className="km-dialog-desc">{copy.explorerDesc}</Dialog.Description>
            </div>
            <Dialog.Close className="km-dialog-close" aria-label={copy.close} title={copy.close}>
              <X size={18} aria-hidden="true" />
            </Dialog.Close>
          </header>
          <div className="km-dialog-toolbar">
            <div className="km-segment" role="group" aria-label={copy.viewGroup}>
              {(["tilt", "front", "list"] as const).map((item) => (
                <button key={item} type="button" aria-pressed={mode === item} onClick={() => chooseMode(item)}>
                  {copy.views[item]}
                </button>
              ))}
            </div>
            {mode !== "list" && (
              <>
                <div className="km-tools">
                  <button type="button" className="km-tool" onClick={() => rotate(-ROTATE_STEP)} aria-label={copy.rotateLeft} title={copy.rotateLeft}>
                    <RotateCcw size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="km-tool" onClick={() => rotate(ROTATE_STEP)} aria-label={copy.rotateRight} title={copy.rotateRight}>
                    <RotateCw size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="km-tool km-tool-text" onClick={() => chooseMode("tilt")}>
                    {copy.resetAngle}
                  </button>
                </div>
                <p className="km-hint km-dialog-hint">{copy.explorerHint}</p>
              </>
            )}
          </div>
          <div className="km-dialog-body">
            {/* 목록 보기에서도 지도 자리는 남겨 두어(숨김) 크기 측정이 끊기지 않게 합니다. */}
            <div
              ref={stageRef}
              className="km-dialog-stage"
              hidden={mode === "list"}
              data-dragging={dragging ? "true" : undefined}
              onPointerDown={onStagePointerDown}
              onPointerMove={onStagePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div className="km-dialog-canvas" style={{ width: view.width }}>
                <KnowledgeMapCanvas
                  map={map}
                  plan={plan}
                  view={view}
                  variant="explorer"
                  locale={locale}
                  focusId={interaction.focusId}
                  pinnedId={pinnedId}
                  rovingId={interaction.rovingId ?? pinnedId}
                  moving={moving}
                  density="rich"
                  describedBy={hintId}
                  onHover={interaction.setHover}
                  onKeyboardFocus={interaction.setKeyboard}
                  onActivate={interaction.togglePin}
                  onRove={interaction.setRovingId}
                  onEscape={() => onPin(null)}
                  onCameraKey={onCameraKey}
                />
              </div>
              <p id={hintId} className="km-sr">
                {copy.hint} {copy.explorerHint}
              </p>
            </div>
            {mode === "list" && (
              <div className="km-dialog-list">
                <KnowledgeMapOutline map={map} locale={locale} selectedId={pinnedId} onPick={pick} />
              </div>
            )}
            <aside className="km-dialog-inspector">
              <KnowledgeMapDetail
                map={map}
                node={focusNode}
                pinnedId={pinnedId}
                locale={locale}
                counts={counts}
                onPick={pick}
                onUnpin={() => onPin(null)}
                onLocate={onLocate}
              />
            </aside>
          </div>
          <p className="km-sr" aria-live="polite">
            {announcement}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
