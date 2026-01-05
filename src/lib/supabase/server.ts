import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase_server__: SupabaseClient | undefined;
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseServer: SupabaseClient =
  globalThis.__supabase_server__ ?? createClient(url, service);

if (!globalThis.__supabase_server__) {
  globalThis.__supabase_server__ = supabaseServer;
}
