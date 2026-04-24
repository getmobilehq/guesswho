"use client";

import { useEffect, useState } from "react";

type Kind = "host" | "player";
const key = (kind: Kind, code: string) => `gw:${kind}:${code}`;

export const localToken = {
  get(kind: Kind, code: string): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key(kind, code));
  },
  set(kind: Kind, code: string, token: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key(kind, code), token);
  },
  clear(kind: Kind, code: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key(kind, code));
  },
};

// Hook form for the few callers that want to react to a token's presence.
// Returns `undefined` while we haven't read localStorage yet (SSR-safe).
export function useLocalToken(kind: Kind, code: string) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setToken(localToken.get(kind, code));
  }, [kind, code]);
  return token;
}
