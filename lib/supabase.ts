import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // implicit: token vem direto no hash #access_token (sem code_verifier do PKCE,
    // que se perde no multi-zone e causa "Unable to exchange external code")
    flowType: "implicit",
    // desligado de propósito: o AuthProvider processa o hash manualmente,
    // sem corrida com o detector interno do Supabase
    detectSessionInUrl: false,
  },
});
