import { useEffect, useRef } from "react";

type Props = {
  checked: boolean;
  disabled: boolean;
  onChecked: (v: boolean) => void;
};

/** Interruptor Geraldo (Lit) com estado controlado a partir do React. */
export function OpenSwitch({ checked, disabled, onChecked }: Props) {
  const ref = useRef<HTMLElement & { checked?: boolean }>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.checked = checked;
  }, [checked]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fn = (e: Event) => {
      const d = (e as CustomEvent<{ checked?: boolean }>).detail;
      if (typeof d?.checked === "boolean") onChecked(d.checked);
    };
    el.addEventListener("geraldo-change", fn);
    return () => el.removeEventListener("geraldo-change", fn);
  }, [onChecked]);

  return <geraldo-switch ref={ref} disabled={disabled} />;
}
