import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase__: SupabaseClient | undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const ready = !!url && !!key && !/your-project\.supabase\.co|your_supabase_url/i.test(url);
export const supabaseReady = ready;
const makeThrowProxy = () =>
  new Proxy({} as SupabaseClient, {
    get() {
      throw new Error("Supabase env missing");
    },
  });

export const supabase: SupabaseClient =
  globalThis.__supabase__ ??
  (ready
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
    : makeThrowProxy());

if (!globalThis.__supabase__) {
  globalThis.__supabase__ = supabase;
}
