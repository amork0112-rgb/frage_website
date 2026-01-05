import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase_client__: SupabaseClient | undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseClient: SupabaseClient =
  globalThis.__supabase_client__ ??
  createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

if (!globalThis.__supabase_client__) {
  globalThis.__supabase_client__ = supabaseClient;
}
