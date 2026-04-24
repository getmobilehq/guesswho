import * as React from "react";
import { cn } from "@/lib/cn";

type Width = "narrow" | "wide" | "full";

const widths: Record<Width, string> = {
  narrow: "max-w-[480px]",
  wide: "max-w-[880px]",
  full: "max-w-[1100px]",
};

export function Page({
  children,
  width = "narrow",
  className,
}: {
  children: React.ReactNode;
  width?: Width;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full px-5 pt-8 pb-16 min-h-screen box-border", widths[width], className)}>
      {children}
    </div>
  );
}

export default Page;
