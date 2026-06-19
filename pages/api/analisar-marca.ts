import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, rateLimited } from "@/lib/api-auth";

export const config = {
  // base64 infla ~33%; 8mb de body comporta arquivo decodificado de ~6MB
  api: { bodyParser: { sizeLimit: "8mb" } },
};

const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
const ALLOWED = [...ALLOWED_IMAGE, "application/pdf"];
const MAX_BYTES = 6 * 1024 * 1024; // tamanho real do arquivo decodificado

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Mesma origem: sem CORS aberto.
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (await rateLimited(user.id, 10, 60_000)) {
    return res.status(429).json({ ok: false, error: "Muitas requisições. Aguarde um minuto." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ ok: false, error: "Serviço indisponível no momento." });
  }

  const { base64, mimeType } = req.body as { base64: string; mimeType: string };
  if (!base64 || !mimeType) return res.status(400).json({ ok: false, error: "missing fields" });
  if (!ALLOWED.includes(mimeType)) {
    return res.status(400).json({ ok: false, error: "Formato não suportado. Use PNG, JPG, WebP ou PDF." });
  }
  // base64.length * 3/4 ≈ bytes reais do arquivo
  if (Math.floor(base64.length * 0.75) > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: "Arquivo muito grande. Máximo 6 MB." });
  }

  const isPdf = mimeType === "application/pdf";
  const contentBlock = isPdf
    ? ({
        type: "document" as const,
        source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
      } as const)
    : ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mimeType as (typeof ALLOWED_IMAGE)[number],
          data: base64,
        },
      } as const);

  const client = new Anthropic();

  try {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: `Analise esta identidade visual e extraia os dados. Retorne APENAS JSON válido, sem markdown, sem explicação.

{
  "nomeMarca": "nome da marca visto no documento",
  "tema": "dark" ou "light" (fundo escuro = dark, fundo claro = light)",
  "fonte": "nome exato da fonte principal usada nos títulos (ex: Gotham, Futura, Helvetica Neue, Circular) — o nome real, não uma aproximação",
  "fonteSerif": "nome exato da fonte serif ou secundária se houver, senão string vazia",
  "url": "URL do site se visível, senão string vazia",
  "rodapeTexto": "slogan ou tagline curta se visível, senão string vazia"
}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text);
    res.json({ ok: true, config: parsed });
  } catch {
    res.status(502).json({ ok: false, error: "Não foi possível interpretar a resposta." });
  }
  } catch (err) {
    console.error("analisar-marca:", err);
    res.status(500).json({ ok: false, error: "Não consegui ler essa identidade. Tente outra imagem ou PDF." });
  }
}
