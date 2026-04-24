import * as React from "react";
import { cn } from "@/lib/cn";

export function Hint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-[13px] text-muted mt-2 leading-relaxed", className)}>
      {children}
    </div>
  );
}

export default Hint;
