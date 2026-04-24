import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = {
  checked: boolean;
  disabled: boolean;
  onChecked: (v: boolean) => void;
};

/**
 * Interruptor Geraldo (Lit) controlado pelo React.
 * Se o Web Component não tiver largura visível (prod sem shadow), usa checkbox nativo estilizado.
 */
export function OpenSwitch({ checked, disabled, onChecked }: Props) {
  const wcRef = useRef<HTMLElement & { checked?: boolean }>(null);
  const [useNative, setUseNative] = useState(false);

  useLayoutEffect(() => {
    if (useNative) return;
    const el = wcRef.current;
    if (!el) return;
    let cancelled = false;
    const considerFallback = () => {
      if (cancelled) return;
      const defined = !!customElements.get("geraldo-switch");
      const w = el.getBoundingClientRect().width;
      if (!defined || w < 12) setUseNative(true);
    };
    const t = window.setTimeout(considerFallback, 450);
    void customElements.whenDefined("geraldo-switch").then(() => {
      if (cancelled) return;
      window.clearTimeout(t);
      requestAnimationFrame(() => {
        requestAnimationFrame(considerFallback);
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [useNative]);

  useEffect(() => {
    if (useNative) return;
    const el = wcRef.current;
    if (el) el.checked = checked;
  }, [checked, useNative]);

  useEffect(() => {
    if (useNative) return;
    const el = wcRef.current;
    if (!el) return;
    const fn = (e: Event) => {
      const d = (e as CustomEvent<{ checked?: boolean }>).detail;
      if (typeof d?.checked === "boolean") onChecked(d.checked);
    };
    el.addEventListener("geraldo-change", fn);
    return () => el.removeEventListener("geraldo-change", fn);
  }, [onChecked, useNative]);

  if (useNative) {
    return (
      <label
        className={`open-switch-native${disabled ? " open-switch-native--disabled" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          role="switch"
          className="open-switch-native__input"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChecked(e.target.checked)}
        />
        <span className="open-switch-native__ui" aria-hidden />
      </label>
    );
  }

  return <geraldo-switch ref={wcRef} disabled={disabled} />;
}
