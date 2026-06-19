import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, rateLimited } from "@/lib/api-auth";

const client = new Anthropic();
const T = (s: string | undefined, max: number) => (s ?? "").slice(0, max);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (await rateLimited(user.id, 20, 60_000)) {
    return res.status(429).json({ error: "Muitas requisições. Aguarde um minuto." });
  }

  const { tema, tipo, posicao, total, nomeMarca } = req.body as {
    tema: string;
    tipo: string;
    posicao: number;
    total: number;
    nomeMarca: string;
  };

  const temaS = T(tema, 300);
  const nomeMarcaS = T(nomeMarca, 100);
  const tipoS = T(tipo, 20);
  const posicaoN = Math.min(Math.max(1, Number(posicao) || 1), 50);
  const totalN = Math.min(Math.max(1, Number(total) || 1), 20);

  const prompt = `Carrossel do Instagram da marca ${nomeMarcaS || "a marca"} sobre "${temaS}" (estilo editorial sóbrio).
Reescreva APENAS o slide ${posicaoN} de ${totalN}, do tipo "${tipoS}".

Retorne UM objeto JSON:
- tipo: "${tipo}"
- titulo: frase de impacto bold (máx 8 palavras), sem markdown
- corpo: apoio direto (máx 25 palavras), pode usar \\n, pode ser ""
- subtitulo: frase curta de remate em tom reflexivo (itálico serif), máx 14 palavras

Tom direto, confiante, editorial. Sem emojis. Responda SOMENTE o JSON, sem markdown.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const slide = JSON.parse(text.trim());
    return res.status(200).json({ slide });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Não consegui refazer esse slide. Tente de novo." });
  }
}
