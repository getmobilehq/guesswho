"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { HostActionInput, friendlyZodError } from "@/lib/game/validation";
import { buildDeck } from "@/lib/game/deck";

type Result = { ok: true; cards: number } | { ok: false; error: string };

export async function startGame(raw: unknown): Promise<Result> {
  const parsed = HostActionInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, hostToken } = parsed.data;

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("code, host_token, status")
    .eq("code", code)
    .maybeSingle();

  if (sessionError) {
    console.error("startGame session lookup failed", sessionError);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (!session) return { ok: false, error: "Session not found." };
  if (session.host_token !== hostToken) {
    return { ok: false, error: "Not authorised." };
  }
  if (session.status !== "lobby") {
    return { ok: false, error: "The game has already started." };
  }

  const { data: players, error: playersError } = await supabaseAdmin
    .from("players")
    .select("id, name, joined_at")
    .eq("session_code", code)
    .order("joined_at", { ascending: true });

  if (playersError || !players) {
    console.error("startGame players fetch failed", playersError);
    return { ok: false, error: "Couldn't read the roster. Try again." };
  }

  const { data: answers, error: answersError } = await supabaseAdmin
    .from("answers")
    .select("player_id, q_index, text, players!inner(session_code)")
    .eq("players.session_code", code);

  if (answersError || !answers) {
    console.error("startGame answers fetch failed", answersError);
    return { ok: false, error: "Couldn't read the answers. Try again." };
  }

  const deck = buildDeck(
    players.map((p) => ({ id: p.id, name: p.name })),
    answers.map((a) => ({
      player_id: a.player_id,
      q_index: a.q_index,
      text: a.text,
    })),
  );

  // Require ≥3 distinct players fully submitted. With fewer the guessing UI
  // is degenerate (only one candidate, every guess automatic).
  const distinctSubmitters = new Set(deck.map((c) => c.player_id));
  if (distinctSubmitters.size < 3) {
    return {
      ok: false,
      error: "Not enough players yet — wait for at least 3 to submit their answers.",
    };
  }

  const rows = deck.map((c) => ({
    session_code: code,
    player_id: c.player_id,
    q_index: c.q_index,
    position: c.position,
  }));

  // Fresh game — clear any lingering cards from a prior re-run on the same
  // code (defensive; createSession already deletes finalized sessions).
  const { error: clearError } = await supabaseAdmin
    .from("cards")
    .delete()
    .eq("session_code", code);
  if (clearError) {
    console.error("startGame clear cards failed", clearError);
    return { ok: false, error: "Couldn't reset the deck. Try again." };
  }

  const { error: insertError } = await supabaseAdmin
    .from("cards")
    .insert(rows);
  if (insertError) {
    console.error("startGame cards insert failed", insertError);
    return { ok: false, error: "Couldn't deal the deck. Try again." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({
      status: "live",
      current_card_index: 0,
      card_revealed: false,
    })
    .eq("code", code);

  if (updateError) {
    console.error("startGame status update failed", updateError);
    return { ok: false, error: "Couldn't start the game. Try again." };
  }

  return { ok: true, cards: deck.length };
}
