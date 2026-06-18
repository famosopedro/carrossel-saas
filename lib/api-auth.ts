import { createClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/**
 * Verifica o Bearer token no header Authorization.
 * Retorna o user autenticado ou termina a resposta com 401.
 */
export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Não autenticado" });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Sessão inválida ou expirada" });
    return null;
  }
  return user;
}

/** Rate limiter in-memory (free, sem dependências externas). */
interface Window { count: number; resetAt: number }
const store = new Map<string, Window>();
setInterval(() => {
  const now = Date.now();
  for (const [k, w] of store.entries()) if (w.resetAt < now) store.delete(k);
}, 5 * 60 * 1000);

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const w = store.get(key);
  if (!w || w.resetAt < now) { store.set(key, { count: 1, resetAt: now + windowMs }); return false; }
  w.count += 1;
  return w.count > max;
}
