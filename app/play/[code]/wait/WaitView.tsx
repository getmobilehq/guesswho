"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Page } from "@/components/brand/Page";
import { BackBar } from "@/components/brand/BackBar";

import { supabase } from "@/lib/supabase/client";
import { localToken } from "@/lib/hooks/useLocalToken";
import { usePlayers } from "@/lib/hooks/usePlayers";
import type { SessionStatus } from "@/lib/supabase/types";

export default function WaitView({
  code,
  status: initialStatus,
}: {
  code: string;
  status: SessionStatus;
}) {
  const router = useRouter();
  const { players, status } = usePlayers(code);
  const effective = status ?? initialStatus;
  const [myName, setMyName] = useState<string | null>(null);

  // Look up my own name to greet me, without trusting localStorage.
  useEffect(() => {
    let cancelled = false;
    const playerId = localToken.get("player-id", code);
    if (!playerId) return;
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("name")
        .eq("id", playerId)
        .maybeSingle();
      if (!cancelled && data?.name) setMyName(data.name);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (effective === "live") router.replace(`/play/${code}/game`);
    else if (effective === "final") router.replace(`/play/${code}/final`);
  }, [effective, code, router]);

  const exit = () => {
    localToken.clear("player", code);
    localToken.clear("player-id", code);
    router.replace("/");
  };

  return (
    <Page>
      <BackBar onBack={exit} />
      <div className="text-center pt-14">
        <div
          className="text-[64px] mb-4 leading-none"
          style={{ animation: "gw-pulse 2s ease-in-out infinite" }}
          aria-hidden
        >
          ✓
        </div>
        <h2 className="font-[var(--font-head)] text-[28px] mb-3 text-gold">
          You&apos;re in{myName ? `, ${myName.split(" ")[0]}` : ", friend"}.
        </h2>
        <p className="text-muted text-[15px] leading-relaxed max-w-[320px] mx-auto mb-8">
          Your answers are locked in. Waiting for the host to start the game.
        </p>
        <div className="px-5 py-5 bg-surface border border-border rounded-[var(--radius)] text-sm text-muted">
          <div className="text-[11px] tracking-[0.2em] text-muted mb-1.5 uppercase">
            Session
          </div>
          <div className="font-[var(--font-head)] text-[28px] text-ivory font-bold tracking-[0.1em]">
            {code}
          </div>
          <div className="mt-4 text-[13px]">
            {players.length} {players.length === 1 ? "player" : "players"} in the room
          </div>
        </div>
      </div>
    </Page>
  );
}
