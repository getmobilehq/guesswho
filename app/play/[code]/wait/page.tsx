import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/server";
import WaitView from "./WaitView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Guess Who · ${code.toUpperCase()}` };
}

export default async function PlayerWaitPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("code, status")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("wait page fetch failed", error);
    throw new Error("Failed to load session");
  }
  if (!session) notFound();

  return <WaitView code={session.code} status={session.status} />;
}
