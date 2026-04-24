import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { ActionButton } from "./ActionButton.tsx";

type Tone = "success" | "danger" | "info";

type Props = {
  tone: Tone;
  children: ReactNode;
  onDismiss?: () => void;
  /**
   * Fecha automaticamente após N ms.
   * Se omitido: sucesso usa 8s (quando há onDismiss); erro/info não fecham sozinhos.
   */
  autoDismissMs?: number;
  /** Se false, não faz scroll até ao aviso (ex.: mensagens já no topo). Predefinição: true. */
  scrollIntoViewOnShow?: boolean;
};

export function FeedbackStrip({
  tone,
  children,
  onDismiss,
  autoDismissMs,
  scrollIntoViewOnShow = true,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const effectiveAutoDismiss =
    autoDismissMs !== undefined ? autoDismissMs : tone === "success" && onDismiss ? 8000 : undefined;

  useLayoutEffect(() => {
    if (!scrollIntoViewOnShow) return;
    const el = rootRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
    return () => window.cancelAnimationFrame(id);
  }, [tone, children, scrollIntoViewOnShow]);

  useEffect(() => {
    if (!effectiveAutoDismiss || !onDismiss) return;
    const t = window.setTimeout(onDismiss, effectiveAutoDismiss);
    return () => window.clearTimeout(t);
  }, [effectiveAutoDismiss, onDismiss, children, tone]);

  return (
    <div
      ref={rootRef}
      className={`feedback-strip feedback-strip--${tone}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="feedback-strip__message">{children}</p>
      {onDismiss ? (
        <ActionButton variant="ghost" color="primary" size="sm" onClick={onDismiss}>
          Fechar
        </ActionButton>
      ) : null}
    </div>
  );
}
