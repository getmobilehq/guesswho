import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-[var(--font-ui)] border-[1.5px] transition-colors duration-150 select-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-bg border-gold font-bold uppercase tracking-[0.1em] shadow-[0_4px_20px_rgba(244,199,83,0.2)] hover:bg-gold-deep hover:border-gold-deep disabled:bg-elevated disabled:text-muted disabled:border-border disabled:shadow-none",
  secondary:
    "bg-elevated text-ivory border-border hover:border-muted hover:bg-elevated/80",
  ghost:
    "bg-transparent text-muted border-transparent hover:text-ivory",
  danger:
    "bg-transparent text-red border-red hover:bg-red/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm min-h-[36px]",
  md: "px-6 py-3 text-base min-h-[44px]",
  lg: "px-8 py-4 text-lg min-h-[52px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  full,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], sizes[size], full && "w-full", className)}
      {...rest}
    />
  );
}

export default Button;
