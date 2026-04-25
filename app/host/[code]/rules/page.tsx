import { notFound } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/server";
import RulesView from "./RulesView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `How to Play · ${code.toUpperCase()}` };
}

export default async function HostRulesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("code, questions")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("rules page fetch failed", error);
    throw new Error("Failed to load session");
  }
  if (!data) notFound();

  return (
    <RulesView
      code={data.code}
      questions={data.questions as [string, string, string]}
    />
  );
}
