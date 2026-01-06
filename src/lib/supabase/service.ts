import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase_service__: SupabaseClient | undefined;
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseService: SupabaseClient =
  globalThis.__supabase_service__ ??
  createClient(url, serviceKey);

if (!globalThis.__supabase_service__) {
  globalThis.__supabase_service__ = supabaseService;
}
