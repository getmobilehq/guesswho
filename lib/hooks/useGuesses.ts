"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";

export type Guess = {
  card_id: string;
  guesser_id: string;
  guessed_player_id: string;
};

type Hook = {
  guesses: Guess[];
  byGuesser: Map<string, string>;
  loading: boolean;
  error: string | null;
};

// Subscribes to guesses for one card. Component re-keys this hook (or its
// owner) when the card changes — that's how cleanup runs and a new channel
// gets created with the right filter.
export function useGuesses(cardId: string | null): Hook {
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) {
      setGuesses([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    async function run() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("guesses")
        .select("card_id, guesser_id, guessed_player_id")
        .eq("card_id", cardId);

      if (cancelled) return;

      if (fetchError) {
        console.error("useGuesses fetch failed", fetchError);
        setError("Couldn't load guesses.");
        setLoading(false);
        return;
      }
      setGuesses((data as Guess[]) ?? []);
      setLoading(false);

      channel = supabase
        .channel(`guesses:${cardId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "guesses",
            filter: `card_id=eq.${cardId}`,
          },
          (payload) => {
            if (cancelled) return;
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const row = payload.new as Guess;
              setGuesses((prev) => {
                const idx = prev.findIndex((g) => g.guesser_id === row.guesser_id);
                if (idx === -1) return [...prev, row];
                const next = [...prev];
                next[idx] = row;
                return next;
              });
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as Guess;
              setGuesses((prev) =>
                prev.filter((g) => g.guesser_id !== row.guesser_id),
              );
            }
          },
        )
        .subscribe();
    }

    run();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [cardId]);

  const byGuesser = new Map<string, string>();
  for (const g of guesses) byGuesser.set(g.guesser_id, g.guessed_player_id);

  return { guesses, byGuesser, loading, error };
}
