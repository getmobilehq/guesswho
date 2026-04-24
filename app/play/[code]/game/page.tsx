import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/server";
import GameView from "./GameView";
import type { CardRow, PublicSession } from "@/lib/supabase/types";

type AnswerLite = { player_id: string; q_index: number; text: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Guess Who · ${code.toUpperCase()}` };
}

export default async function PlayerGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const [
    { data: session, error: sessionError },
    { data: cards, error: cardsError },
    { data: players, error: playersError },
    { data: answers, error: answersError },
  ] = await Promise.all([
    supabaseAdmin
      .from("sessions")
      .select(
        "code, host_name, questions, status, current_card_index, card_revealed, created_at, ended_at",
      )
      .eq("code", code)
      .maybeSingle(),
    supabaseAdmin
      .from("cards")
      .select("id, session_code, player_id, q_index, position")
      .eq("session_code", code)
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("players")
      .select("id, session_code, name, joined_at")
      .eq("session_code", code)
      .order("joined_at", { ascending: true }),
    supabaseAdmin
      .from("answers")
      .select("player_id, q_index, text, players!inner(session_code)")
      .eq("players.session_code", code),
  ]);

  if (sessionError) {
    console.error("game page session fetch failed", sessionError);
    throw new Error("Failed to load session");
  }
  if (!session) notFound();
  if (cardsError) {
    console.error("game page cards fetch failed", cardsError);
    throw new Error("Failed to load cards");
  }
  if (playersError) {
    console.error("game page players fetch failed", playersError);
    throw new Error("Failed to load players");
  }
  if (answersError) {
    console.error("game page answers fetch failed", answersError);
    throw new Error("Failed to load answers");
  }

  const answerText = new Map<string, string>();
  for (const a of (answers ?? []) as AnswerLite[]) {
    answerText.set(`${a.player_id}:${a.q_index}`, a.text);
  }
  const cardsWithText = ((cards ?? []) as CardRow[]).map((c) => ({
    ...c,
    text: answerText.get(`${c.player_id}:${c.q_index}`) ?? "",
  }));

  return (
    <GameView
      initialSession={session as PublicSession}
      cards={cardsWithText}
      players={(players ?? []).map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
