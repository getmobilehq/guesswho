"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { HostActionInput, friendlyZodError } from "@/lib/game/validation";

type Result =
  | { ok: true; finished: false; index: number }
  | { ok: true; finished: true }
  | { ok: false; error: string };

export async function nextCard(raw: unknown): Promise<Result> {
  const parsed = HostActionInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, hostToken } = parsed.data;

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("host_token, status, current_card_index")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("nextCard lookup failed", error);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (!session) return { ok: false, error: "Session not found." };
  if (session.host_token !== hostToken) {
    return { ok: false, error: "Not authorised." };
  }
  if (session.status !== "live") {
    return { ok: false, error: "The game isn't running." };
  }

  const { count, error: cardsError } = await supabaseAdmin
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("session_code", code);

  if (cardsError || count == null) {
    console.error("nextCard cards count failed", cardsError);
    return { ok: false, error: "Couldn't read the deck. Try again." };
  }

  const nextIndex = session.current_card_index + 1;

  if (nextIndex >= count) {
    const { error: finalError } = await supabaseAdmin
      .from("sessions")
      .update({ status: "final", card_revealed: false })
      .eq("code", code);
    if (finalError) {
      console.error("nextCard finalise failed", finalError);
      return { ok: false, error: "Couldn't end the game. Try again." };
    }
    return { ok: true, finished: true };
  }

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({
      current_card_index: nextIndex,
      card_revealed: false,
    })
    .eq("code", code);

  if (updateError) {
    console.error("nextCard update failed", updateError);
    return { ok: false, error: "Couldn't advance. Try again." };
  }

  return { ok: true, finished: false, index: nextIndex };
}
