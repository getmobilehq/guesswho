"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { PublicPlayer, SessionStatus } from "@/lib/supabase/types";

export type RosterPlayer = PublicPlayer & {
  submittedCount: number;
  submitted: boolean;
};

type Hook = {
  players: RosterPlayer[];
  submittedCount: number;
  status: SessionStatus | null;
  loading: boolean;
  error: string | null;
};

// Subscribes to the players + answers + sessions for one session code.
// Computes per-player submitted state (answers count === 3) and the overall
// "fully submitted" count used by the lobby's Start gate.
export function usePlayers(code: string): Hook {
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const channels: RealtimeChannel[] = [];

    async function init() {
      try {
        const [playersRes, answersRes, sessionRes] = await Promise.all([
          supabase
            .from("players")
            .select("id, session_code, name, joined_at")
            .eq("session_code", code)
            .order("joined_at", { ascending: true }),
          supabase
            .from("answers")
            .select("player_id, q_index, players!inner(session_code)")
            .eq("players.session_code", code),
          supabase.from("sessions").select("status").eq("code", code).maybeSingle(),
        ]);

        if (cancelled) return;

        if (playersRes.error) throw playersRes.error;
        if (answersRes.error) throw answersRes.error;
        if (sessionRes.error) throw sessionRes.error;

        setPlayers(playersRes.data as PublicPlayer[]);

        const initialCounts: Record<string, number> = {};
        for (const row of (answersRes.data ?? []) as { player_id: string }[]) {
          initialCounts[row.player_id] = (initialCounts[row.player_id] ?? 0) + 1;
        }
        setCounts(initialCounts);
        setStatus(sessionRes.data?.status ?? null);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        console.error("usePlayers init failed", e);
        setError("Couldn't load players.");
        setLoading(false);
        return;
      }

      const playersChannel = supabase
        .channel(`players:${code}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "players",
            filter: `session_code=eq.${code}`,
          },
          (payload) => {
            if (cancelled) return;
            if (payload.eventType === "INSERT") {
              const row = payload.new as PublicPlayer;
              setPlayers((prev) =>
                prev.some((p) => p.id === row.id) ? prev : [...prev, row],
              );
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as { id: string };
              setPlayers((prev) => prev.filter((p) => p.id !== row.id));
              setCounts((prev) => {
                if (!(row.id in prev)) return prev;
                const next = { ...prev };
                delete next[row.id];
                return next;
              });
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as PublicPlayer;
              setPlayers((prev) =>
                prev.map((p) => (p.id === row.id ? row : p)),
              );
            }
          },
        )
        .subscribe();
      channels.push(playersChannel);

      const answersChannel = supabase
        .channel(`answers:${code}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "answers" },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as { player_id: string };
            setCounts((prev) => ({
              ...prev,
              [row.player_id]: (prev[row.player_id] ?? 0) + 1,
            }));
          },
        )
        .subscribe();
      channels.push(answersChannel);

      const sessionChannel = supabase
        .channel(`session-status:${code}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sessions",
            filter: `code=eq.${code}`,
          },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as { status: SessionStatus };
            setStatus(row.status);
          },
        )
        .subscribe();
      channels.push(sessionChannel);
    }

    init();

    return () => {
      cancelled = true;
      for (const ch of channels) supabase.removeChannel(ch);
    };
  }, [code]);

  const enriched: RosterPlayer[] = players.map((p) => {
    const submittedCount = counts[p.id] ?? 0;
    return { ...p, submittedCount, submitted: submittedCount >= 3 };
  });

  const submittedCount = enriched.filter((p) => p.submitted).length;

  return { players: enriched, submittedCount, status, loading, error };
}
