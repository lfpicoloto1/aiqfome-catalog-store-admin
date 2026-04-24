import type { DOMAttributes, Key, ReactNode, Ref } from "react";

type GeraldoBase = {
  children?: ReactNode;
  key?: Key | null;
  ref?: Ref<unknown>;
  id?: string;
  className?: string;
  slot?: string;
};

type GeraldoAttrs<T> = T & GeraldoBase & DOMAttributes<T>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "geraldo-text": GeraldoAttrs<{
        variant?: string;
        weight?: string;
        as?: string;
      }>;
      "geraldo-card": GeraldoAttrs<{
        radius?: string;
        elevation?: string;
      }>;
      "geraldo-badge": GeraldoAttrs<{
        tone?: string;
      }>;
      "geraldo-radio-group": GeraldoAttrs<{
        name?: string;
        legend?: string;
        value?: string;
      }>;
      "geraldo-radio": GeraldoAttrs<{
        name?: string;
        value?: string;
        checked?: boolean;
        disabled?: boolean;
      }>;
      "geraldo-switch": GeraldoAttrs<{
        checked?: boolean;
        disabled?: boolean;
      }>;
      "geraldo-text-field": GeraldoAttrs<{
        label?: string;
        description?: string;
        error?: string;
        value?: string;
        placeholder?: string;
        disabled?: boolean;
        type?: string;
      }>;
    }
  }
}

export {};
