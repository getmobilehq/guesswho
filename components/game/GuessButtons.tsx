"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { submitGuess } from "@/lib/actions/submitGuess";

type Player = { id: string; name: string };

export function GuessButtons({
  code,
  cardId,
  playerId,
  playerToken,
  candidates,
  selectedId,
  onSelectedChange,
}: {
  code: string;
  cardId: string;
  playerId: string;
  playerToken: string;
  candidates: Player[];
  selectedId: string | null;
  onSelectedChange: (id: string | null, source: "optimistic" | "rollback") => void;
}) {
  const [pending, startTransition] = useTransition();

  const vote = (guessedId: string) => {
    if (pending) return;
    onSelectedChange(guessedId, "optimistic");
    startTransition(async () => {
      const r = await submitGuess({
        code,
        playerId,
        playerToken,
        cardId,
        guessedPlayerId: guessedId,
      });
      if (!r.ok) {
        onSelectedChange(null, "rollback");
        toast.error(r.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 mb-20">
      {candidates.map((p) => {
        const selected = selectedId === p.id;
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
