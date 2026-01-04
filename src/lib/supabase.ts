import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __supabase__: SupabaseClient | undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseReady =
  !!url &&
  !!key &&
  !/your-project\.supabase\.co|your_supabase_url/i.test(url);

function createMockSupabase(): SupabaseClient {
  const getStore = (table: string) => {
    const key = `mock_supabase_${table}`;
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };
  const setStore = (table: string, rows: any[]) => {
    const key = `mock_supabase_${table}`;
    try {
      localStorage.setItem(key, JSON.stringify(rows));
    } catch {}
  };
  const makeSelect = (table: string) => {
    const state: { filters: { field: string; value: any }[]; order?: { field: string; asc: boolean }; limit?: number } = {
      filters: [],
    };
    const api: any = {
      eq(field: string, value: any) {
        state.filters.push({ field, value });
        return api;
      },
      order(field: string, opts?: { ascending?: boolean }) {
        state.order = { field, asc: !!opts?.ascending };
        return api;
      },
      limit(n: number) {
        state.limit = n;
        return api;
      },
      then(resolve: (v: any) => void, reject?: (e: any) => void) {
        try {
          let rows = getStore(table).slice();
          state.filters.forEach(f => {
            rows = rows.filter(r => r && r[f.field] === f.value);
          });
          if (state.order) {
            const { field, asc } = state.order;
            rows.sort((a, b) => {
              const av = a?.[field];
              const bv = b?.[field];
              if (typeof av === "number" && typeof bv === "number") return asc ? av - bv : bv - av;
              const ad = new Date(av).getTime();
              const bd = new Date(bv).getTime();
              if (!Number.isNaN(ad) && !Number.isNaN(bd)) return asc ? ad - bd : bd - ad;
              return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
            });
          }
          if (typeof state.limit === "number") rows = rows.slice(0, state.limit);
          resolve({ data: rows, error: null });
        } catch (e) {
          if (reject) reject(e);
        }
      },
      catch() {
        return api;
      },
      finally() {
        return api;
      },
    };
    return api;
  };
  const tableApi = (table: string) => ({
    select: (_cols?: string) => makeSelect(table),
    insert: async (payload: any) => {
      const rows = getStore(table);
      const now = new Date().toISOString();
      const row = {
        id: payload?.id ?? Date.now(),
        created_at: payload?.created_at ?? now,
        updated_at: payload?.updated_at ?? now,
        ...payload,
      };
      rows.unshift(row);
      setStore(table, rows);
      return { data: row, error: null };
    },
    update: (payload: any) => ({
      eq: async (field: string, val: any) => {
        const rows = getStore(table);
        const next = rows.map(r => (r && r[field] === val ? { ...r, ...payload, updated_at: new Date().toISOString() } : r));
        setStore(table, next);
        return { data: null, error: null };
      },
    }),
    delete: () => ({
      eq: async (field: string, val: any) => {
        const rows = getStore(table);
        const next = rows.filter(r => !(r && r[field] === val));
        setStore(table, next);
        return { data: null, error: null };
      },
    }),
  });
  const mock = {
    from: (table: string) => tableApi(table),
    auth: {
      signUp: async (_payload?: any) => ({ data: { user: { id: "mock-user" } }, error: null }),
      signInWithPassword: async () => ({ data: { session: null, user: { id: "mock-user" } }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: { id: "mock-user" } }, error: null }),
    },
  } as unknown as SupabaseClient;
  return mock;
}

export const supabase: SupabaseClient =
  globalThis.__supabase__ ??
  (supabaseReady
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : createMockSupabase());

if (!globalThis.__supabase__) {
  globalThis.__supabase__ = supabase;
}
