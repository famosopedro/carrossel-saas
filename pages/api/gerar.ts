import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { tema, quantidade, nomeMarca } = req.body as {
    tema: string;
    quantidade: number;
    nomeMarca: string;
  };

  if (!tema || !quantidade) return res.status(400).json({ error: "tema e quantidade obrigatórios" });

  const prompt = `Você é especialista em copywriting de carrosseis do Instagram para marcas profissionais e sóbrias (estilo editorial).

Marca: ${nomeMarca || "a marca"}
Tema: "${tema}"
Total de slides: ${quantidade}

Crie exatamente ${quantidade} slides. Estrutura:
- Slide 1: tipo "capa" — gancho forte que faz parar de rolar.
- Slides do meio: tipo "conteudo" — desenvolvem a ideia, um ponto por slide.
- Último slide: tipo "cta" — chamada pra ação (comentar, salvar, link na bio).

Cada slide tem:
- tipo: "capa" | "conteudo" | "cta"
- titulo: frase de impacto, bold (máx 8 palavras). Sem aspas, sem markdown.
- corpo: texto de apoio direto (máx 25 palavras). Pode usar quebras de linha (\\n) pra frases curtas separadas. Pode ser "" se o título bastar.
- subtitulo: UMA frase curta de remate, tom reflexivo/editorial (será exibida em itálico serif). Ex: "E o pior: talvez você ainda não tenha medido quanto." Máx 14 palavras.

Tom: direto, inteligente, confiante, editorial. Sem emojis, sem exageros, sem hashtags.

Responda SOMENTE com array JSON válido, sem markdown:
[{"tipo":"capa","titulo":"...","corpo":"...","subtitulo":"..."}]`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    // strip markdown code fences if model wrapped the JSON
    const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const slides = JSON.parse(clean);

    return res.status(200).json({ slides });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Falha ao gerar slides" });
  }
}
