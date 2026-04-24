"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Page } from "@/components/brand/Page";
import { BackBar } from "@/components/brand/BackBar";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

import type { Score } from "@/lib/game/scoring";
import { localToken } from "@/lib/hooks/useLocalToken";

export default function FinalView({
  code,
  scores,
}: {
  code: string;
  scores: Score[];
}) {
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    setMyId(localToken.get("player-id", code));
  }, [code]);

  const myRank = myId
    ? scores.findIndex((s) => s.player.id === myId) + 1
    : 0;
  const myScore = myId ? scores.find((s) => s.player.id === myId)?.correct ?? 0 : 0;

  const exit = () => {
    localToken.clear("player", code);
    localToken.clear("player-id", code);
    router.replace("/");
  };

  return (
    <Page>
      <BackBar onBack={exit} />

      <div className="text-center pt-6 mb-10">
        <div className="text-[11px] tracking-[0.3em] text-gold uppercase">
          {myRank > 0 ? "Your final position" : "Final results"}
        </div>
        {myRank > 0 ? (
          <>
            <div className="font-[var(--font-head)] text-[96px] font-bold text-gold leading-none my-2">
              #{myRank}
            </div>
            <div className="text-muted text-[15px]">
              {myScore} correct {myScore === 1 ? "guess" : "guesses"}
            </div>
          </>
        ) : (
          <div className="font-[var(--font-head)] text-[40px] font-bold text-ivory mt-3">
            Leaderboard
          </div>
        )}
      </div>

      <Section label="Full leaderboard">
        {scores.map((s, i) => {
          const isMe = s.player.id === myId;
          return (
            <div
              key={s.player.id}
              className={
                "flex items-center gap-4 px-4 py-3 rounded-[var(--radius)] mb-1.5 border " +
                (isMe
                  ? "bg-gold/15 border-gold/55"
                  : "bg-surface border-border")
              }
            >
              <div
                className={
                  "font-[var(--font-head)] text-[18px] font-bold min-w-[28px] " +
                  (i < 3 ? "text-gold" : "text-muted")
                }
              >
                {i + 1}
              </div>
              <div className="flex-1 text-[15px] text-ivory">
                {s.player.name}
                {isMe && (
                  <span className="text-[11px] text-gold tracking-[0.15em] ml-2">
                    · YOU
                  </span>
                )}
              </div>
              <div className="font-[var(--font-head)] text-[20px] text-gold font-bold">
                {s.correct}
              </div>
            </div>
          );
        })}
      </Section>

      <div className="text-center mt-10">
        <Button onClick={exit}>Leave game</Button>
      </div>
    </Page>
  );
}
