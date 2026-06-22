import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateImage } from "@/lib/image-generation";
import { decryptKey } from "@/lib/crypto";

const PROVIDERS = ["gemini", "openai"];

async function testGeminiKey(encrypted: string): Promise<{ valid: boolean; debug?: string }> {
  try {
    const apiKey = await decryptKey(encrypted);
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
      }
    );
    if (!resp.ok && resp.status !== 429) {
      const body = await resp.text().catch(() => "");
      return { valid: false, debug: `HTTP ${resp.status}: ${body.slice(0, 500)}` };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, debug: err instanceof Error ? err.message : String(err) };
  }
}

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

  // Gemini: testa via API de texto (grátis, sem billing). OpenAI: gera imagem simples.
  let valid: boolean;
  let debug: string | undefined;
  if (provider === "gemini") {
    const result = await testGeminiKey(encrypted);
    valid = result.valid;
    debug = result.debug;
  } else {
    const result = await generateImage("a plain solid blue circle on white background", provider, encrypted);
    valid = !("error" in result);
    if ("error" in result) debug = result.error;
  }

  await admin
    .from("user_api_keys")
    .update({ is_valid: valid, last_tested_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("provider", provider);

  return res.status(200).json({ valid, provider, ...(debug ? { debug } : {}) });
}
