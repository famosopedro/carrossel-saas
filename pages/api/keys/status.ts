import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth, userClient } from "@/lib/api-auth";

type ProviderStatus = { connected: boolean; valid: boolean | null; last_tested_at: string | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  const base: Record<"gemini" | "openai", ProviderStatus> = {
    gemini: { connected: false, valid: null, last_tested_at: null },
    openai: { connected: false, valid: null, last_tested_at: null },
  };

  try {
    const sb = userClient(req);
    const { data } = await sb
      .from("user_api_keys")
      .select("provider, is_valid, last_tested_at")
      .eq("user_id", user.id);

    for (const row of (data || []) as { provider: "gemini" | "openai"; is_valid: boolean | null; last_tested_at: string | null }[]) {
      if (row.provider in base) {
        base[row.provider] = { connected: true, valid: row.is_valid, last_tested_at: row.last_tested_at };
      }
    }
  } catch {
    /* sem rede/tabela: devolve o default (nada conectado) */
  }

  return res.status(200).json(base);
}
