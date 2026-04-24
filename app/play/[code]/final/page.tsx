import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/server";
import { tallyScores, type Score } from "@/lib/game/scoring";
import FinalView from "./FinalView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Guess Who · Results · ${code.toUpperCase()}` };
}

export default async function PlayerFinalPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const [
    { data: session, error: sessionError },
    { data: players, error: playersError },
    { data: cards, error: cardsError },
    { data: guesses, error: guessesError },
  ] = await Promise.all([
    supabaseAdmin.from("sessions").select("code, status").eq("code", code).maybeSingle(),
    supabaseAdmin
      .from("players")
      .select("id, name, joined_at")
      .eq("session_code", code)
      .order("joined_at", { ascending: true }),
    supabaseAdmin
      .from("cards")
      .select("id, player_id")
      .eq("session_code", code),
    supabaseAdmin
      .from("guesses")
      .select("card_id, guesser_id, guessed_player_id, cards!inner(session_code)")
      .eq("cards.session_code", code),
  ]);

  if (sessionError) throw new Error("Failed to load session");
  if (!session) notFound();
  if (playersError) throw new Error("Failed to load players");
  if (cardsError) throw new Error("Failed to load cards");
  if (guessesError) throw new Error("Failed to load guesses");

  const scores: Score[] = tallyScores(
    (players ?? []).map((p) => ({ id: p.id, name: p.name })),
    (cards ?? []).map((c) => ({ id: c.id as string, player_id: c.player_id as string })),
    (guesses ?? []).map((g) => ({
      card_id: g.card_id as string,
      guesser_id: g.guesser_id as string,
      guessed_player_id: g.guessed_player_id as string,
    })),
  );

  return <FinalView code={code} scores={scores} />;
}
