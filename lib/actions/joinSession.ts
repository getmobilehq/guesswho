"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  JoinSessionInput,
  friendlyZodError,
} from "@/lib/game/validation";
import { generateToken } from "@/lib/random";
import type { SessionStatus } from "@/lib/supabase/types";

type Result =
  | { ok: true; playerId: string; playerToken: string; status: SessionStatus }
  | { ok: false; error: string; status?: SessionStatus };

export async function joinSession(raw: unknown): Promise<Result> {
  const parsed = JoinSessionInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, name } = parsed.data;

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("code, status")
    .eq("code", code)
    .maybeSingle();

  if (sessionError) {
    console.error("joinSession session lookup failed", sessionError);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (!session) {
    return { ok: false, error: `No session found for "${code}". Check the code.` };
  }
  if (session.status === "final") {
    return { ok: false, error: "That game has already ended.", status: "final" };
  }
  if (session.status === "live") {
    return {
      ok: false,
      error: "That game has already started — watch from the host's screen.",
      status: "live",
    };
  }

  const playerToken = generateToken();

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("players")
    .insert({
      session_code: code,
      name,
      player_token: playerToken,
    })
    .select("id")
    .single();

  if (insertError) {
    // Unique violation on (session_code, lower(name)).
    if (insertError.code === "23505") {
      return {
        ok: false,
        error: `Someone's already in the room as "${name}". Add an initial or try a variant.`,
      };
    }
    console.error("joinSession insert failed", insertError);
    return { ok: false, error: "Couldn't add you to the room. Try again." };
  }

  return {
    ok: true,
    playerId: inserted.id,
    playerToken,
    status: session.status as SessionStatus,
  };
}
