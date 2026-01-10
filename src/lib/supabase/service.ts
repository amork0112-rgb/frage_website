// lib/supabase/service.ts
import { createClient } from "@supabase/supabase-js";

export const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, // ✅ Vercel에 실제 존재
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);


