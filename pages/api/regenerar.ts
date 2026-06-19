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

  const { tema, variante, posicao, total, nomeMarca } = req.body as {
    tema: string;
    variante: string;
    posicao: number;
    total: number;
    nomeMarca: string;
  };

  const temaS = T(tema, 300);
  const nomeMarcaS = T(nomeMarca, 100);
  const VALIDAS = ["capa-imagem", "tipografia", "lista-icones", "imagem-destaque", "chat", "cta"];
  const varianteS = VALIDAS.includes(variante) ? variante : "tipografia";
  const posicaoN = Math.min(Math.max(1, Number(posicao) || 1), 50);
  const totalN = Math.min(Math.max(1, Number(total) || 1), 20);

  const campos: Record<string, string> = {
    "capa-imagem": `- titulo: gancho forte (máx 8 palavras)\n- corpo: subtexto curto (máx 18 palavras)`,
    "tipografia": `- titulo: frase de impacto (máx 8 palavras)\n- corpo: apoio (máx 25 palavras, pode usar \\n)\n- subtitulo: remate reflexivo, máx 14 palavras`,
    "lista-icones": `- titulo: título da lista (máx 8 palavras)\n- itens: array de 3 a 5 {"icone","texto"}. icone ∈ [check,star,bolt,heart,target,rocket,lightbulb,shield,clock,chat,trending,dollar,users,gift,flag]. texto máx 10 palavras`,
    "imagem-destaque": `- titulo: título (máx 8 palavras)\n- corpo: texto que acompanha a imagem (máx 25 palavras)`,
    "chat": `- titulo: título curto\n- mensagens: array de 2 a 4 {"lado","autor","texto"}. lado ∈ [esq,dir] alternando. texto máx 18 palavras`,
    "cta": `- titulo: chamada à ação (máx 8 palavras)\n- subtitulo: remate curto, máx 14 palavras`,
  };

  const prompt = `Carrossel do Instagram da marca ${nomeMarcaS || "a marca"} sobre "${temaS}" (estilo editorial sóbrio).
Reescreva APENAS o slide ${posicaoN} de ${totalN}. Mantenha a variante "${varianteS}".

Retorne UM objeto JSON com "variante":"${varianteS}" e os campos:
${campos[varianteS]}

Pode usar **negrito** e ==realce== com moderação. Tom direto, confiante, editorial. Sem emojis. Responda SOMENTE o JSON, sem markdown.`;

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
