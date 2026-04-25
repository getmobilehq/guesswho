import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { buildRulesDeck } from "@/lib/server/rulesDeck";

// pptxgenjs needs the Node runtime — it relies on Buffer and zip libs that
// aren't available in the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("code, host_name, questions")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("deck route session fetch failed", error);
    return new NextResponse("Could not reach the database.", { status: 500 });
  }
  if (!session) {
    return new NextResponse("Session not found.", { status: 404 });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.guesswho.online";

  const buffer = await buildRulesDeck({
    code: session.code,
    questions: session.questions as [string, string, string],
    appUrl,
  });

  // Use a Uint8Array view so the response body is a valid web BodyInit.
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="guess-who-rules-${code}.pptx"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
