import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/server";
import SubmitView from "./SubmitView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Guess Who · Answers · ${code.toUpperCase()}` };
}

export default async function PlayerSubmitPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("code, status, questions")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("submit page fetch failed", error);
    throw new Error("Failed to load session");
  }
  if (!session) notFound();

  return (
    <SubmitView
      code={session.code}
      status={session.status}
      questions={session.questions as [string, string, string]}
    />
  );
}
