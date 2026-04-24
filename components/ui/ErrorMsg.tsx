import * as React from "react";

export function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="px-4 py-3 mb-4 text-sm rounded-[var(--radius)] text-red border border-red/40 bg-red/10"
    >
      {children}
    </div>
  );
}

export default ErrorMsg;
