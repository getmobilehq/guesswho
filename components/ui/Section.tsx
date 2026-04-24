import * as React from "react";
import { cn } from "@/lib/cn";

export function Section({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7", className)}>
      <div className="text-[11px] tracking-[0.25em] text-muted uppercase font-semibold mb-[10px]">
        {label}
      </div>
      {children}
    </div>
  );
}

export default Section;
