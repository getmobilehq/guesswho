"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase/client";
import type { PublicSession } from "@/lib/supabase/types";

type Hook = {
  session: PublicSession | null;
  loading: boolean;
  error: string | null;
};

export function useSession(code: string, initial?: PublicSession): Hook {
  const [session, setSession] = useState<PublicSession | null>(initial ?? null);
  const [loading, setLoading] = useState(initial == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    async function run() {
      const { data, error: fetchError } = await supabase
        .from("sessions")
        .select(
          "code, host_name, questions, status, current_card_index, card_revealed, created_at, ended_at",
        )
        .eq("code", code)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        console.error("useSession fetch failed", fetchError);
        setError("Couldn't load session.");
        setLoading(false);
        return;
      }
      setSession((data as PublicSession | null) ?? null);
      setLoading(false);

      channel = supabase
        .channel(`session:${code}`)
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
            setSession(payload.new as PublicSession);
          },
        )
        .subscribe();
    }

    run();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [code]);

  return { session, loading, error };
}
