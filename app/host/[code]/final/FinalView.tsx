"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Page } from "@/components/brand/Page";
import { Button } from "@/components/ui/Button";
import { Podium } from "@/components/game/Podium";

import type { Score } from "@/lib/game/scoring";
import { rankLabel } from "@/lib/game/scoring";
import { localToken } from "@/lib/hooks/useLocalToken";
import { endSession } from "@/lib/actions/endSession";

export default function FinalView({
  code,
  scores,
}: {
  code: string;
  scores: Score[];
}) {
  const router = useRouter();
  const [ending, startEnding] = useTransition();

  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);

  const end = () => {
    const hostToken = localToken.get("host", code);
    if (!hostToken) {
      router.replace("/");
      return;
    }
    startEnding(async () => {
      const r = await endSession({ code, hostToken });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      localToken.clear("host", code);
      router.replace("/");
    });
  };

  return (
    <Page width="wide">
      <div className="text-center mb-12 pt-6">
        <div className="text-[11px] tracking-[0.3em] text-gold mb-3">
          ✦ FINAL RESULTS ✦
        </div>
        <h1
          className="font-[var(--font-head)] text-ivory m-0 leading-none tracking-[-0.02em]"
          style={{ fontSize: "clamp(40px, 8vw, 72px)" }}
        >
          Leaderboard
        </h1>
      </div>

      {top3.length > 0 && (
        <div className="flex justify-center gap-4 items-end mb-12 flex-wrap">
          {top3[1] && (
            <Podium entry={top3[1]} height={140} medal="🥈" />
          )}
          {top3[0] && (
            <Podium entry={top3[0]} height={180} medal="🥇" gold />
          )}
          {top3[2] && (
            <Podium entry={top3[2]} height={110} medal="🥉" />
          )}
        </div>
      )}

      {rest.length > 0 && (
        <div className="max-w-[600px] mx-auto">
          <div className="text-[11px] text-muted tracking-[0.2em] mb-3 text-center">
            EVERYONE ELSE
          </div>
          {rest.map((entry) => (
            <div
              key={entry.player.id}
              className="flex items-center gap-4 px-5 py-3.5 bg-surface border border-border rounded-[var(--radius)] mb-2"
            >
              <div
                className={
                  "font-[var(--font-head)] text-[20px] min-w-[64px] " +
                  (entry.tied ? "text-gold" : "text-muted")
                }
              >
                {rankLabel(entry.rank, entry.tied)}
              </div>
              <div className="flex-1 text-base text-ivory">
                {entry.player.name}
              </div>
              <div className="font-[var(--font-head)] text-[22px] text-gold font-bold">
                {entry.correct}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center mt-12">
        <Button onClick={end} disabled={ending}>
          {ending ? "Ending…" : "End session"}
        </Button>
      </div>
    </Page>
  );
}
