import * as React from "react";
import { cn } from "@/lib/cn";

type CommonProps = {
  className?: string;
  invalid?: boolean;
};

export type InputProps = CommonProps &
  React.InputHTMLAttributes<HTMLInputElement> & { multiline?: false };

export type TextAreaProps = CommonProps &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };

type AnyInputProps = InputProps | TextAreaProps;

const base =
  "w-full px-4 py-3 bg-surface border-[1.5px] rounded-[var(--radius)] text-ivory placeholder:text-muted outline-none transition-colors focus:border-gold caret-gold";

export function Input(props: AnyInputProps) {
  if (props.multiline) {
    const { className, multiline: _m, invalid, ...rest } = props;
    return (
      <textarea
        className={cn(
          base,
          "font-[var(--font-head)] text-[17px] leading-relaxed resize-y min-h-[110px]",
          invalid ? "border-red" : "border-border",
          className,
        )}
        rows={4}
        {...rest}
      />
    );
  }
  const { className, multiline: _m, invalid, ...rest } = props as InputProps;
  return (
    <input
      className={cn(
        base,
        "font-[var(--font-ui)] text-base",
        invalid ? "border-red" : "border-border",
        className,
      )}
      {...rest}
    />
  );
}

export default Input;
