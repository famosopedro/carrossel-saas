import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateImage } from "@/lib/image-generation";

const PROVIDERS = ["gemini", "openai"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  const { provider } = req.body as { provider?: "gemini" | "openai" };
  if (!provider || !PROVIDERS.includes(provider)) return res.status(400).json({ error: "Provedor inválido." });

  const admin = getSupabaseAdmin();
  if (!admin) return res.status(503).json({ error: "Teste indisponível no momento." });

  const { data: row } = await admin
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .maybeSingle();

  const encrypted = (row as { encrypted_key?: string } | null)?.encrypted_key;
  if (!encrypted) return res.status(400).json({ error: "Chave de API não configurada para este provedor." });

  // Chamada mínima de teste — gera uma imagem simples.
  const result = await generateImage("a plain solid blue circle on white background", provider, encrypted);
  const valid = !("error" in result);

  await admin
    .from("user_api_keys")
    .update({ is_valid: valid, last_tested_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("provider", provider);

  return res.status(200).json({ valid, provider });
}
