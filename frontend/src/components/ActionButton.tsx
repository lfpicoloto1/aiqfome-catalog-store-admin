import type { ButtonHTMLAttributes } from "react";
import "./action-button.css";

export type ActionButtonVariant = "filled" | "outline" | "ghost";
export type ActionButtonColor = "primary" | "secondary" | "danger";
export type ActionButtonSize = "sm" | "md" | "lg";

export type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionButtonVariant;
  color?: ActionButtonColor;
  size?: ActionButtonSize;
  loading?: boolean;
};

export function ActionButton({
  variant = "filled",
  color = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ActionButtonProps) {
  const classes = [
    "g-action-btn",
    `g-action-btn--${variant}`,
    `g-action-btn--${color}`,
    size !== "md" ? `g-action-btn--${size}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="g-action-btn__spinner" aria-hidden /> : null}
      <span className="g-action-btn__label">{children}</span>
    </button>
  );
}
