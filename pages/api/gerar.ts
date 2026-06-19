import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, rateLimited } from "@/lib/api-auth";

const client = new Anthropic();
const T = (s: string | undefined, max: number) => (s ?? "").slice(0, max);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (rateLimited(user.id, 10, 60_000)) {
    return res.status(429).json({ error: "Muitas requisições. Aguarde um minuto." });
  }

  const { tema, quantidade: qtdRaw, nomeMarca, descricao, publicoAlvo, conteudoPublico, estiloComunicacao, idioma } = req.body as {
    tema: string;
    quantidade: number;
    nomeMarca: string;
    descricao?: string;
    publicoAlvo?: string;
    conteudoPublico?: string;
    estiloComunicacao?: string;
    idioma?: string;
  };

  const quantidade = Math.min(Math.max(1, Number(qtdRaw) || 5), 20);
  const temaS = T(tema, 300);
  const nomeMarcaS = T(nomeMarca, 100);

  if (!temaS) return res.status(400).json({ error: "tema e quantidade obrigatórios" });

  const dna = [
    descricao && `Sobre a marca: ${T(descricao, 500)}`,
    publicoAlvo && `Público-alvo: ${T(publicoAlvo, 300)}`,
    conteudoPublico && `Conteúdos que o público ama: ${T(conteudoPublico, 300)}`,
    estiloComunicacao && `Estilo de comunicação: ${T(estiloComunicacao, 200)}`,
  ].filter(Boolean).join("\n");

  const prompt = `Você é especialista em copywriting de carrosseis do Instagram para marcas profissionais e sóbrias (estilo editorial).

Marca: ${nomeMarcaS || "a marca"}
Idioma: ${T(idioma, 20) || "Português"}
Tema: "${temaS}"
Total de slides: ${quantidade}
${dna ? `\nDNA da marca:\n${dna}\n` : ""}

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
      model: "claude-haiku-4-5-20251001",
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
    return res.status(500).json({ error: "Não consegui gerar agora. Tente de novo em alguns segundos." });
  }
}
