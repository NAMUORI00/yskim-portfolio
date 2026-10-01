import * as Dialog from "@radix-ui/react-dialog";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { FONT_SANS, type PortfolioTheme } from "@/content/theme";
import "./capabilities/capabilityFlowWide.css";

export function ProjectDialog({ title, T, locale, onClose, triggerRef, children }: {
  title: string; T: PortfolioTheme; locale: string; onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>; children: ReactNode;
}) {
  const style = { "--cf-sans": FONT_SANS, "--cf-text": T.text, "--cf-surface": T.surface,
    "--cf-border": T.border, "--cf-green": T.green, "--cf-scrim": "rgba(0,0,0,.5)" } as CSSProperties;
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="cfw-overlay" style={style} />
      <Dialog.Content className="cfw-dialog" style={style} aria-describedby={undefined}
        onCloseAutoFocus={(event) => { event.preventDefault(); triggerRef.current?.focus(); }}>
        <header className="cfw-head">
          <Dialog.Title className="cfw-title">{title}</Dialog.Title>
          <Dialog.Close className="cfw-close" aria-label={locale === "en" ? "Close" : "닫기"}>×</Dialog.Close>
        </header>
        <div className="cfw-body">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
