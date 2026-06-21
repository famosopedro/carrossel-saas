import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/api-auth";

// Exclusão de conta self-service (LGPD). Apaga o usuário em auth.users; o ON
// DELETE CASCADE leva junto workspaces e ai_usage. Exige SUPABASE_SERVICE_ROLE_KEY
// (server-only). Sem ela, devolve 503 com orientação — nunca expõe a chave.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    return res.status(503).json({
      error: "Exclusão automática indisponível no momento. Fale com o suporte para excluir sua conta.",
    });
  }

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    // limpa o workspace explicitamente (defensivo, caso o cascade não cubra)
    await admin.from("workspaces").delete().eq("user_id", user.id);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("delete-account:", err);
    return res.status(500).json({ error: "Não consegui excluir agora. Tente de novo ou fale com o suporte." });
  }
}
