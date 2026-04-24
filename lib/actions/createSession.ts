"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  CreateSessionInput,
  friendlyZodError,
} from "@/lib/game/validation";
import { generateToken } from "@/lib/random";

type Result =
  | { ok: true; code: string; hostToken: string }
  | { ok: false; error: string };

export async function createSession(raw: unknown): Promise<Result> {
  const parsed = CreateSessionInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: friendlyZodError(parsed.error) };
  }
  const { code, hostName, questions } = parsed.data;

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("sessions")
    .select("code, status")
    .eq("code", code)
    .maybeSingle();

  if (lookupError) {
    console.error("createSession lookup failed", lookupError);
    return { ok: false, error: "Could not reach the database. Try again." };
  }

  if (existing && existing.status !== "final") {
    return {
      ok: false,
      error: `Code "${code}" is already in use. Try another.`,
    };
  }

  const hostToken = generateToken();

  // If a previous final session squatted on this code, replace it cleanly.
  if (existing) {
    const { error: deleteError } = await supabaseAdmin
      .from("sessions")
      .delete()
      .eq("code", code);
    if (deleteError) {
      console.error("createSession cleanup failed", deleteError);
      return { ok: false, error: "Could not reuse this code. Try another." };
    }
  }

  const { error: insertError } = await supabaseAdmin
    .from("sessions")
    .insert({
      code,
      host_token: hostToken,
      host_name: hostName.trim() || "Host",
      questions,
      status: "lobby",
      current_card_index: 0,
      card_revealed: false,
    });

  if (insertError) {
    console.error("createSession insert failed", insertError);
    return { ok: false, error: "Could not create the session. Try again." };
  }

  return { ok: true, code, hostToken };
}
