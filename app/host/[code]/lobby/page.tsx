import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/server";
import LobbyView from "./LobbyView";
import type { PublicSession } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Guess Who · Lobby ${code.toUpperCase()}` };
}

export default async function HostLobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select(
      "code, host_name, questions, status, current_card_index, card_revealed, created_at, ended_at",
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("lobby fetch failed", error);
    throw new Error("Failed to load session");
  }
  if (!data) notFound();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // The layout already guards on host_token — it never leaves the server.
  const session: PublicSession = data as PublicSession;

  return <LobbyView session={session} appUrl={appUrl} />;
}
