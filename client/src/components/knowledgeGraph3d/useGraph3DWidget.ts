/*
 * 레일과 넓게 보기가 함께 쓰는 지도 한 벌의 조작 — 공유 상태(보기 · 펼친 분야 · 고정)와 이 화면의 카메라·전환,
 * 가리킴·키보드 초점·고정(useGraph3DInteraction), 끌어 돌리기(useOrbit), 주의가 떠나면 돌아가기(useAttentionReturn)를 묶습니다.
 *  - 분야 열기: 지도에서 분야·별을 누르거나 Enter, 설명 칸의 분야 칩. 별을 눌렀으면 그 지식을 고정한 채 펼칩니다.
 *  - 돌아가기: "전체 보기" 단추, Esc(고정이 있으면 고정부터 풂), 주의가 영역을 떠나고 약 3초, 터치로 영역 밖을 누름.
 *    돌아갈 때는 접고 처음 시점(카메라)으로 돌아가며 고정도 풉니다.
 */
import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CameraKey } from "./Graph3DCanvas";
import { useOrbit } from "./Graph3DCanvas";
import { clampCamera, zoomAt, type Layout3D, type View3D } from "./graph3dLayout";
import type { DomainId, KnowledgeGraph } from "./graph3dModel";
import { useAttentionReturn } from "./useGraph3DAttention";
import { INITIAL_EXPLORE, openDomain, useExploreView, type ExploreState } from "./useGraph3DExplore";
import { useGraph3DInteraction } from "./useGraph3DInteraction";

const KEY_YAW = 0.14;
const KEY_PITCH = 0.05;
export const ZOOM_STEP = 1.25;

export interface Graph3DWidgetOptions {
  graph: KnowledgeGraph;
  layout: Layout3D;
  view: View3D;
  explore: ExploreState;
  setExplore: Dispatch<SetStateAction<ExploreState>>;
  /** 홈 목록에서 가리킨 프로젝트 (전체 보기에서만 미리 봄) */
  externalId: string | null;
  reduced: boolean;
  /** 이 화면이 보이는지 (넓게 보기에 가려진 레일은 false) */
  active: boolean;
  /** 주의 시계를 멈출지 (레일 위에 넓게 보기가 열린 동안) */
  suspended?: boolean;
  intro?: boolean;
  allowZoom: boolean;
}

export function useGraph3DWidget({ graph, layout, view, explore, setExplore, externalId, reduced, active, suspended = false, intro = false, allowZoom }: Graph3DWidgetOptions) {
  const target = explore.mode === "detail" ? explore.domain : null;
  const view3d = useExploreView({ layout, target, reduced, active, intro });
  const setPinned = useCallback((id: string | null) => setExplore((state) => ({ ...state, pinnedId: state.mode === "detail" ? id : null })), [setExplore]);
  const interaction = useGraph3DInteraction(graph, explore.mode === "overview" ? externalId : null, { pinnedId: explore.pinnedId, setPinned });
  const { resetPreview, setRovingId } = interaction;
  const { resetCamera, moveCamera, animateCamera } = view3d;

  const open = useCallback(
    (domain: DomainId, pinnedId: string | null = null) => {
      resetPreview();
      setExplore(openDomain(domain, pinnedId));
      if (pinnedId) setRovingId(pinnedId);
    },
    [resetPreview, setExplore, setRovingId],
  );

  const back = useCallback(() => {
    resetPreview();
    setExplore(INITIAL_EXPLORE);
    resetCamera();
  }, [resetPreview, setExplore, resetCamera]);

  /** 주의가 떠났을 때 — 접고 처음 시점으로, 고정도 풉니다 */
  const returnHome = back;

  const away = explore.mode === "detail" || explore.pinnedId !== null || view3d.moved;
  const attention = useAttentionReturn({ away, suspended, onReturn: returnHome });

  /** 설명 칸의 지식 칩 — 펼친 분야의 지식이면 고정, 다른 분야면 그 분야를 펼치며 고정 */
  const pick = useCallback(
    (id: string) => {
      const node = graph.byId.get(id);
      if (node) {
        if (explore.mode === "detail" && explore.domain === node.domain) setPinned(id);
        else open(node.domain, id);
        setRovingId(id);
        return;
      }
      if (explore.mode === "detail" && graph.evidence.has(id)) {
        setPinned(id);
        setRovingId(id);
      }
    },
    [graph, explore.mode, explore.domain, open, setPinned, setRovingId],
  );

  const unpin = useCallback(() => setPinned(null), [setPinned]);

  /** Esc — 고정이 있으면 고정만 풀고, 펼친 분야면 전체 보기로. 처리했으면 true */
  const escape = useCallback((): boolean => {
    if (explore.pinnedId) {
      setPinned(null);
      return true;
    }
    if (explore.mode === "detail") {
      back();
      return true;
    }
    return false;
  }, [explore.pinnedId, explore.mode, setPinned, back]);

  const orbit = useOrbit({ camera: view3d.camera, view, allowZoom, glide: !reduced, onChange: moveCamera });

  const cameraKey = useCallback(
    (key: CameraKey) => {
      const camera = view3d.camera;
      if (key === "ArrowLeft") moveCamera(clampCamera({ ...camera, yaw: camera.yaw - KEY_YAW }, view));
      if (key === "ArrowRight") moveCamera(clampCamera({ ...camera, yaw: camera.yaw + KEY_YAW }, view));
      if (key === "ArrowUp") moveCamera(clampCamera({ ...camera, pitch: camera.pitch + KEY_PITCH }, view));
      if (key === "ArrowDown") moveCamera(clampCamera({ ...camera, pitch: camera.pitch - KEY_PITCH }, view));
    },
    [view3d.camera, moveCamera, view],
  );

  const zoomBy = useCallback((factor: number) => animateCamera(zoomAt(view3d.camera, view, factor, view.width / 2, view.height / 2), 240), [animateCamera, view3d.camera, view]);
  /** +/− 키 (넓게 보기) */
  const zoomKey = useCallback((direction: 1 | -1) => zoomBy(direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP), [zoomBy]);
  const rotate = useCallback((delta: number) => animateCamera(clampCamera({ ...view3d.camera, yaw: view3d.camera.yaw + delta }, view)), [animateCamera, view3d.camera, view]);

  return {
    view3d,
    interaction,
    attention,
    orbit,
    away,
    moving: orbit.dragging || orbit.gliding || view3d.animating,
    open,
    back,
    returnHome,
    pick,
    escape,
    setPinned,
    unpin,
    cameraKey,
    zoomBy,
    zoomKey,
    rotate,
  };
}
