"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { SubmitGuessInput, friendlyZodError } from "@/lib/game/validation";

type Result = { ok: true } | { ok: false; error: string };

export async function submitGuess(raw: unknown): Promise<Result> {
  const parsed = SubmitGuessInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, playerId, playerToken, cardId, guessedPlayerId } = parsed.data;

  // Verify the guesser belongs to this session and the token matches.
  const { data: player, error: playerError } = await supabaseAdmin
    .from("players")
    .select("id, player_token, session_code")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) {
    console.error("submitGuess player lookup failed", playerError);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (!player || player.session_code !== code) {
    return { ok: false, error: "Wrong session." };
  }
  if (player.player_token !== playerToken) {
    return { ok: false, error: "Not authorised." };
  }

  // The session must be live, the card must belong to the session, and it
  // must be the current card (so late guesses on past cards are rejected).
  const { data: session, error: sessionError } = await supabaseAdmin
    .from("sessions")
    .select("status, current_card_index, card_revealed")
    .eq("code", code)
    .maybeSingle();

  if (sessionError || !session) {
    console.error("submitGuess session lookup failed", sessionError);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (session.status !== "live") {
    return { ok: false, error: "The game isn't accepting guesses right now." };
  }
  if (session.card_revealed) {
    return { ok: false, error: "Too late — the card has been revealed." };
  }

  const { data: card, error: cardError } = await supabaseAdmin
    .from("cards")
    .select("id, player_id, position, session_code")
    .eq("id", cardId)
    .maybeSingle();

  if (cardError || !card) {
    console.error("submitGuess card lookup failed", cardError);
    return { ok: false, error: "Couldn't find that card." };
  }
  if (card.session_code !== code) {
    return { ok: false, error: "Wrong session." };
  }
  if (card.position !== session.current_card_index) {
    return { ok: false, error: "That card isn't current." };
  }
  if (card.player_id === playerId) {
    return { ok: false, error: "You can't guess your own card." };
  }

  // Verify the guessed player is in the same session (defends against id
  // smuggling from another room).
  const { data: target, error: targetError } = await supabaseAdmin
    .from("players")
    .select("id, session_code")
    .eq("id", guessedPlayerId)
    .maybeSingle();
  if (targetError) {
    console.error("submitGuess target lookup failed", targetError);
    return { ok: false, error: "Couldn't verify that guess." };
  }
  if (!target || target.session_code !== code) {
    return { ok: false, error: "That player isn't in this session." };
  }

  const { error: upsertError } = await supabaseAdmin
    .from("guesses")
    .upsert(
      {
        card_id: cardId,
        guesser_id: playerId,
        guessed_player_id: guessedPlayerId,
      },
      { onConflict: "card_id,guesser_id" },
    );

  if (upsertError) {
    console.error("submitGuess upsert failed", upsertError);
    return { ok: false, error: "Couldn't lock in your guess. Try again." };
  }

  return { ok: true };
}
