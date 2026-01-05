import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase_server__: SupabaseClient | undefined;
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const supabaseServerReady =
  !!url && !!service && !/your-project\.supabase\.co|your_supabase_url/i.test(url);

function createMockServerSupabase(): SupabaseClient {
  const empty = { data: [], error: null };
  const chain = () => {
    const q: any = {
      select: () => q,
      eq: () => q,
      in: () => q,
      or: () => q,
      order: () => q,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (v: any) => void) => resolve(empty),
      catch: () => q,
      finally: () => q,
    };
    return q;
  };
  const tableApi = () => ({
    select: () => chain(),
    eq: () => chain(),
    in: () => chain(),
    or: () => chain(),
    order: () => chain(),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
    insert: async () => ({ data: null, error: null }),
    delete: () => ({ eq: async () => ({ data: null, error: null }) }),
  });
  const mock = {
    from: (_table: string) => tableApi(),
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient;
  return mock;
}

export const supabaseServer: SupabaseClient =
  globalThis.__supabase_server__ ?? (supabaseServerReady ? createClient(url, service) : createMockServerSupabase());

if (!globalThis.__supabase_server__) {
  globalThis.__supabase_server__ = supabaseServer;
}
