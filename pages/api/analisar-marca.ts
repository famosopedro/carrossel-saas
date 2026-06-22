import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth, rateLimited, checkQuota } from "@/lib/api-auth";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
};

const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
const ALLOWED = [...ALLOWED_IMAGE, "application/pdf"];
const MAX_BYTES = 6 * 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (await rateLimited(user.id, 10, 60_000)) {
    return res.status(429).json({ ok: false, error: "Muitas requisições. Aguarde um minuto." });
  }

  const quota = await checkQuota(req);
  if (!quota.allowed) {
    return res.status(429).json({ ok: false, error: "Você atingiu o limite do seu plano. Tente amanhã ou faça upgrade.", quota: true });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(503).json({ ok: false, error: "Serviço indisponível no momento." });
  }

  const { base64, mimeType } = req.body as { base64: string; mimeType: string };
  if (!base64 || !mimeType) return res.status(400).json({ ok: false, error: "missing fields" });
  if (!ALLOWED.includes(mimeType)) {
    return res.status(400).json({ ok: false, error: "Formato não suportado. Use PNG, JPG, WebP ou PDF." });
  }
  if (Math.floor(base64.length * 0.75) > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: "Arquivo muito grande. Máximo 6 MB." });
  }

  const textPrompt = `Analise esta identidade visual e extraia os dados. Retorne APENAS JSON válido, sem markdown, sem explicação.

{
  "nomeMarca": "nome da marca visto no documento",
  "tema": "dark" ou "light" (fundo escuro = dark, fundo claro = light)",
  "fonte": "nome exato da fonte principal usada nos títulos (ex: Gotham, Futura, Helvetica Neue, Circular) — o nome real, não uma aproximação",
  "fonteSerif": "nome exato da fonte serif ou secundária se houver, senão string vazia",
  "url": "URL do site se visível, senão string vazia",
  "rodapeTexto": "slogan ou tagline curta se visível, senão string vazia"
}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: textPrompt },
            ],
          }],
          generationConfig: { maxOutputTokens: 512 },
        }),
      },
    );

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error("analisar-marca gemini:", resp.status, body.slice(0, 300));
      return res.status(500).json({ ok: false, error: "Não consegui ler essa identidade. Tente outra imagem ou PDF." });
    }

    const data = await resp.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

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
