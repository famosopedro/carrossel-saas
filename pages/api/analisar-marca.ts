import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { base64, mimeType } = req.body as { base64: string; mimeType: string };
  if (!base64 || !mimeType) return res.status(400).json({ error: "missing fields" });

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
          media_type: mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: base64,
        },
      } as const);

  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-8",
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
  "fonte": "escolha UMA destas opções exata: Neue Haas Grotesk, Inter, Montserrat, Space Grotesk, DM Sans, Archivo — a mais parecida visualmente com a fonte principal de títulos",
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
    res.status(500).json({ ok: false, error: "parse failed", raw: text });
  }
}
