"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { HostActionInput, friendlyZodError } from "@/lib/game/validation";

type Result = { ok: true } | { ok: false; error: string };

export async function endSession(raw: unknown): Promise<Result> {
  const parsed = HostActionInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, hostToken } = parsed.data;

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("host_token")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("endSession lookup failed", error);
    return { ok: false, error: "Couldn't reach the session. Try again." };
  }
  if (!session) return { ok: false, error: "Session not found." };
  if (session.host_token !== hostToken) {
    return { ok: false, error: "Not authorised." };
  }

  const { error: updateError } = await supabaseAdmin
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("code", code);

  if (updateError) {
    console.error("endSession update failed", updateError);
    return { ok: false, error: "Couldn't end the session. Try again." };
  }

  return { ok: true };
}
