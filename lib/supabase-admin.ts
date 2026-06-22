import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase com service role — SOMENTE server-side. Ignora RLS, então
// é usado para escrever usage e ler subscriptions de forma autoritativa.
// Exige SUPABASE_SERVICE_ROLE_KEY (nunca exposta ao cliente).
let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (_admin) return _admin;
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
