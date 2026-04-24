"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { HostActionInput, friendlyZodError } from "@/lib/game/validation";

type Result = { ok: true } | { ok: false; error: string };

export async function revealCard(raw: unknown): Promise<Result> {
  const parsed = HostActionInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, hostToken } = parsed.data;

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("host_token, status, card_revealed")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("revealCard lookup failed", error);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (!session) return { ok: false, error: "Session not found." };
  if (session.host_token !== hostToken) {
    return { ok: false, error: "Not authorised." };
  }
  if (session.status !== "live") {
    return { ok: false, error: "The game isn't running." };
  }
  if (session.card_revealed) {
    return { ok: true };
  }

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ card_revealed: true })
    .eq("code", code);

  if (updateError) {
    console.error("revealCard update failed", updateError);
    return { ok: false, error: "Couldn't reveal. Try again." };
  }

  return { ok: true };
}
