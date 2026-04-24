import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service role bypasses RLS. Only ever import from Server Actions or Server
// Components — the `server-only` import will throw at build time if anything
// client-side reaches for this file.
//
// We resolve the client lazily so a missing env var fails the request, not
// the build. Next.js evaluates Server Components for static analysis at
// build time even when `dynamic = "force-dynamic"`, and a top-level throw
// breaks that pass.

let cached: SupabaseClient | null = null;

function build(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!cached) cached = build();
    return Reflect.get(cached, prop, receiver);
  },
});
