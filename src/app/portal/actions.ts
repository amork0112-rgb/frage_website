"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export async function login(email: string, password: string) {
  const supabase = createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error;
}

