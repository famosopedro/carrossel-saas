import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias. Verifique seu .env.local."
  );
}

export const supabase = createClient(url as string, key as string, {
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
