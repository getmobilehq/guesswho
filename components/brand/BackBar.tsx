"use client";

import * as React from "react";
import { Logo } from "./Logo";

export function BackBar({
  onBack,
  right,
}: {
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="bg-transparent border-0 p-0 text-muted text-sm hover:text-ivory transition-colors font-[var(--font-ui)]"
        >
          ← back
        </button>
      ) : (
        <span className="w-10" />
      )}
      <Logo small />
      <div className="min-w-[40px] text-right text-sm text-muted">{right}</div>
    </div>
  );
}

export default BackBar;
