import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { tema, tipo, posicao, total, nomeMarca } = req.body as {
    tema: string;
    tipo: string;
    posicao: number;
    total: number;
    nomeMarca: string;
  };

  const prompt = `Carrossel do Instagram da marca ${nomeMarca || "a marca"} sobre "${tema}" (estilo editorial sóbrio).
Reescreva APENAS o slide ${posicao} de ${total}, do tipo "${tipo}".

Retorne UM objeto JSON:
- tipo: "${tipo}"
- titulo: frase de impacto bold (máx 8 palavras), sem markdown
- corpo: apoio direto (máx 25 palavras), pode usar \\n, pode ser ""
- subtitulo: frase curta de remate em tom reflexivo (itálico serif), máx 14 palavras

Tom direto, confiante, editorial. Sem emojis. Responda SOMENTE o JSON, sem markdown.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const slide = JSON.parse(text.trim());
    return res.status(200).json({ slide });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao regenerar slide" });
  }
}
