import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, rateLimited } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getLimites, type PlanoKey } from "@/lib/planos";

const client = new Anthropic();
const T = (s: string | undefined, max: number) => (s ?? "").slice(0, max);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  if (await rateLimited(user.id, 10, 60_000)) {
    return res.status(429).json({ error: "Muitas requisições. Aguarde um minuto." });
  }

  // ── Cota por plano (subscription + usage mensal) ──
  // Service role: leitura/escrita autoritativa, ignora RLS. Sem a env
  // SUPABASE_SERVICE_ROLE_KEY o controle não roda (fail-open) — a geração segue,
  // mas o limite só passa a valer quando a env estiver setada em produção.
  const admin = getSupabaseAdmin();
  const periodo = new Date().toISOString().slice(0, 7); // 'YYYY-MM' (UTC)
  let planoAtivo: PlanoKey | null = null;
  let geradosAtual = 0;

  if (admin) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plano, status")
      .eq("user_id", user.id)
      .in("status", ["trial", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return res.status(403).json({ error: "Sem plano ativo. Assine um plano para gerar carrosséis." });
    }
    planoAtivo = sub.plano as PlanoKey;

    const { data: usageRow } = await admin
      .from("usage")
      .select("carrosseis_gerados")
      .eq("user_id", user.id)
      .eq("periodo", periodo)
      .maybeSingle();

    geradosAtual = usageRow?.carrosseis_gerados ?? 0;
    if (geradosAtual >= getLimites(planoAtivo).carrosseis_por_mes) {
      return res.status(403).json({ error: "Limite de carrosséis do seu plano atingido este mês." });
    }
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

Crie exatamente ${quantidade} slides. Cada slide tem uma "variante" (estrutura visual). Escolha a variante que melhor serve o conteúdo:

- "tipografia": só texto. Use no slide 1 (capa/gancho) e em ideias que pedem foco. Campos: titulo, corpo, subtitulo.
- "lista-icones": pontos-chave em lista. Use quando houver 3-5 itens paralelos. Campos: titulo, itens[].
- "chat": simula uma conversa (ex: cliente x você, pergunta x resposta). Use pra quebrar objeção ou dramatizar. Campos: titulo, mensagens[].
- "cta": chamada final. Use SEMPRE no último slide. Campos: titulo, subtitulo.

Regras:
- Slide 1 = "tipografia" (gancho forte que faz parar de rolar).
- Último slide = "cta".
- Meio: misture "tipografia", "lista-icones" e "chat" conforme o conteúdo (não repita a mesma variante em sequência sem motivo).
- NÃO use variantes de imagem (o usuário adiciona imagens depois).

Campos:
- titulo: frase de impacto (máx 8 palavras). Sem aspas. Pode usar **negrito** e ==realce== com moderação.
- corpo: apoio direto (máx 25 palavras). Pode usar \\n. "" se o título bastar.
- subtitulo: remate curto, tom reflexivo/editorial, máx 14 palavras (itálico serif).
- itens: array de 3 a 5 objetos {"icone","texto"}. icone DEVE ser um destes ids: check, star, bolt, heart, target, rocket, lightbulb, shield, clock, chat, trending, dollar, users, gift, flag. texto = máx 10 palavras.
- mensagens: array de 2 a 4 objetos {"lado","autor","texto"}. lado = "esq" ou "dir" (alterne). autor = rótulo curto (ex: "Cliente", "Você"). texto = máx 18 palavras.

Tom: direto, inteligente, confiante, editorial. Sem emojis, sem hashtags.

Responda SOMENTE com array JSON válido, sem markdown. Inclua só os campos da variante de cada slide:
[{"variante":"tipografia","titulo":"...","corpo":"...","subtitulo":"..."},{"variante":"lista-icones","titulo":"...","itens":[{"icone":"check","texto":"..."}]},{"variante":"chat","titulo":"...","mensagens":[{"lado":"esq","autor":"Cliente","texto":"..."}]},{"variante":"cta","titulo":"...","subtitulo":"..."}]`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    // strip markdown code fences if model wrapped the JSON
    const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(clean);

    // valida shape: precisa ser array de objetos com "variante" conhecida
    const VARIANTES = ["tipografia", "lista-icones", "chat", "cta"];
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("shape inválido");
    const slides = parsed.filter(
      (s) => s && typeof s === "object" && VARIANTES.includes(s.variante) && typeof s.titulo === "string",
    );
    if (slides.length === 0) throw new Error("nenhum slide válido");

    // Geração ok → consome 1 do plano (upsert no período atual).
    if (admin && planoAtivo) {
      await admin.from("usage").upsert(
        { user_id: user.id, periodo, carrosseis_gerados: geradosAtual + 1, updated_at: new Date().toISOString() },
        { onConflict: "user_id,periodo" },
      );
    }

    return res.status(200).json({ slides });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Não consegui gerar agora. Tente de novo em alguns segundos." });
  }
}
