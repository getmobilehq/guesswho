"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";

import { submitGuess } from "@/lib/actions/submitGuess";

type Player = { id: string; name: string };

export function GuessButtons({
  code,
  cardId,
  playerId,
  playerToken,
  candidates,
  serverGuess,
}: {
  code: string;
  cardId: string;
  playerId: string;
  playerToken: string;
  candidates: Player[];
  serverGuess: string | null;
}) {
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset optimistic when the underlying card changes.
  useEffect(() => {
    setOptimistic(null);
  }, [cardId]);

  const myGuess = optimistic ?? serverGuess;

  const vote = (guessedId: string) => {
    if (pending) return;
    setOptimistic(guessedId);
    startTransition(async () => {
      const r = await submitGuess({
        code,
        playerId,
        playerToken,
        cardId,
        guessedPlayerId: guessedId,
      });
      if (!r.ok) {
        setOptimistic(null);
        toast.error(r.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 mb-20">
      {candidates.map((p) => {
        const selected = myGuess === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => vote(p.id)}
            className={
              "px-5 py-4 rounded-[var(--radius)] text-left text-base transition-colors min-h-[54px] border-[1.5px] " +
              (selected
                ? "bg-gold/15 border-gold text-ivory font-semibold"
                : "bg-surface border-border text-ivory hover:border-muted")
            }
          >
            {selected && <span className="text-gold mr-2.5">●</span>}
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

export default GuessButtons;
