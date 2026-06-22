import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth, userClient } from "@/lib/api-auth";

const PROVIDERS = ["gemini", "openai"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  const { provider } = req.body as { provider?: string };
  if (!provider || !PROVIDERS.includes(provider)) return res.status(400).json({ error: "Provedor inválido." });

  try {
    const sb = userClient(req);
    const { error } = await sb.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ error: "Não foi possível remover a chave." });
  }
}
