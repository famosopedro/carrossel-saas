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

/**
 * Rate limiter. Usa Upstash Redis (REST, sem dependência) quando
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN estão setados —
 * defesa global real no serverless. Sem env, cai p/ in-memory por instância.
 */
interface Window { count: number; resetAt: number }
const store = new Map<string, Window>();

function memoryLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (store.size > 5000) for (const [k, w] of store.entries()) if (w.resetAt < now) store.delete(k);
  const w = store.get(key);
  if (!w || w.resetAt < now) { store.set(key, { count: 1, resetAt: now + windowMs }); return false; }
  w.count += 1;
  return w.count > max;
}

export async function rateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const k = `rl:${key}`;
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify([["INCR", k], ["PEXPIRE", k, windowMs, "NX"]]),
      });
      const data = await res.json();
      const count = Array.isArray(data) ? data[0]?.result : undefined;
      if (typeof count === "number") return count > max;
    } catch {
      // rede/Upstash falhou → fallback in-memory
    }
  }
  return memoryLimited(key, max, windowMs);
}
