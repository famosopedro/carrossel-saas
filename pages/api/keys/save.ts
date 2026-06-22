import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth, userClient } from "@/lib/api-auth";
import { encryptKey } from "@/lib/crypto";

const PROVIDERS = ["gemini", "openai"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  const { provider, key } = req.body as { provider?: string; key?: string };
  if (!provider || !PROVIDERS.includes(provider)) return res.status(400).json({ error: "Provedor inválido." });
  if (typeof key !== "string" || key.trim().length < 20) {
    return res.status(400).json({ error: "Chave inválida (mínimo 20 caracteres)." });
  }

  try {
    const encrypted_key = await encryptKey(key.trim());
    const sb = userClient(req);
    const { error } = await sb.from("user_api_keys").upsert(
      { user_id: user.id, provider, encrypted_key, is_valid: null, last_tested_at: null, updated_at: new Date().toISOString() },
      { onConflict: "user_id,provider" },
    );
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch {
    // sem logar nada que possa conter a chave
    return res.status(500).json({ error: "Não foi possível salvar a chave." });
  }
}
