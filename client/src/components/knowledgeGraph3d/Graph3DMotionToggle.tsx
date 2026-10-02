/*
 * 지도 움직임 켬/끔 — 레일과 넓게 보기에 같은 설정이 보입니다 (graph3dMotion 의 설정 하나를 함께 씀).
 * 기기에서 움직임 줄이기를 켜 두었으면 꺼진 채로 두고 까닭을 적습니다. 꺼도 고르기 표시(고리·이름표·설명)는 그대로입니다.
 */
import { useId } from "react";
import type { Locale } from "@/lib/i18nContent";
import { graph3dCopy } from "./graph3dCopy";
import type { MotionSetting } from "./useGraph3DMotion";

export function Graph3DMotionToggle({ setting, locale }: { setting: MotionSetting; locale: Locale }) {
  const copy = graph3dCopy(locale);
  const helpId = useId();
  const on = setting.enabled;
  const help = setting.reduced ? copy.motionReducedHelp : copy.motionHelp;
  return (
    <>
      <button
        type="button"
        className="kg3-motion"
        aria-pressed={on}
        aria-describedby={helpId}
        disabled={setting.reduced}
        title={help}
        onClick={() => setting.setChoice(on ? "off" : "on")}
      >
        <span className="kg3-motion-dot" aria-hidden="true" />
        {copy.motion}
        <span className="kg3-motion-state" aria-hidden="true">
          {setting.reduced ? copy.motionReduced : on ? copy.motionOn : copy.motionOff}
        </span>
      </button>
      <span id={helpId} className="km-sr">
        {help}
      </span>
    </>
  );
}
