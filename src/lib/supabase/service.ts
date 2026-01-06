import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase_service__: SupabaseClient | undefined;
}

function initService(): SupabaseClient {
  if (globalThis.__supabase_service__) return globalThis.__supabase_service__;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const client = createClient(url, serviceKey);
  globalThis.__supabase_service__ = client;
  return client;
}

export const supabaseService = new Proxy({}, {
  get(_target, prop) {
    const client = initService() as any;
    return client[prop];
  },
  set(_target, prop, value) {
    const client = initService() as any;
    client[prop] = value;
    return true;
  },
  has(_target, prop) {
    const client = initService() as any;
    return prop in client;
  },
}) as SupabaseClient;
