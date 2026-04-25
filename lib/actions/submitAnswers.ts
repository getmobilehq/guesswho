"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  SubmitAnswersInput,
  friendlyZodError,
} from "@/lib/game/validation";

type Result = { ok: true } | { ok: false; error: string };

export async function submitAnswers(raw: unknown): Promise<Result> {
  const parsed = SubmitAnswersInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, playerId, playerToken, answers } = parsed.data;

  const { data: player, error: playerError } = await supabaseAdmin
    .from("players")
    .select("id, player_token, session_code")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) {
    console.error("submitAnswers player lookup failed", playerError);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (!player) return { ok: false, error: "We don't recognise this player." };
  if (player.session_code !== code) {
    return { ok: false, error: "Wrong session." };
  }
  if (player.player_token !== playerToken) {
    return { ok: false, error: "Not authorised." };
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("status")
    .eq("code", code)
    .maybeSingle();

  if (sessionError || !session) {
    console.error("submitAnswers session lookup failed", sessionError);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (session.status !== "lobby") {
    return { ok: false, error: "Submissions are closed — the game has started." };
  }

  // Idempotency: if any answer rows exist, refuse re-submit. The client routes
  // already-submitted players to /wait so this is defensive.
  const { data: existing } = await supabaseAdmin
    .from("answers")
    .select("q_index")
    .eq("player_id", playerId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { ok: false, error: "You've already submitted your answers." };
  }

  const rows = answers
    .map((text, q_index) => ({
      player_id: playerId,
      q_index,
      text,
    }))
    .filter((r) => r.text.length > 0);

  if (rows.length === 0) {
    return { ok: false, error: "Answer at least one question." };
  }

  const { error: insertError } = await supabaseAdmin
    .from("answers")
    .insert(rows);

  if (insertError) {
    console.error("submitAnswers insert failed", insertError);
    return { ok: false, error: "Couldn't lock in your answers. Try again." };
  }

  return { ok: true };
}
