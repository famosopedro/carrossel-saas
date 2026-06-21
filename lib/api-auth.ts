import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextApiRequest, NextApiResponse } from "next";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPA_URL, SUPA_ANON);

function bearer(req: NextApiRequest): string | undefined {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "");
}

/**
 * Verifica o Bearer token no header Authorization.
 * Retorna o user autenticado ou termina a resposta com 401.
 */
export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const token = bearer(req);
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

/** Cliente Supabase agindo COMO o usuário (RLS aplica auth.uid()). */
export function userClient(req: NextApiRequest): SupabaseClient {
  const token = bearer(req);
  return createClient(SUPA_URL, SUPA_ANON, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Limites de cota gratuita (sobrescreva via env). Defesa de custo: sem isto, um
// único usuário com signup aberto poderia torrar a ANTHROPIC_API_KEY do dono.
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 30);
const MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT || 200);

export interface QuotaResult { allowed: boolean; day: number; month: number; }

/**
 * Conta uma geração de IA contra a cota do usuário (atômico, no Postgres).
 * Fail-open: se a função `bump_ai_usage` ainda não existe (migração 0002 não
 * rodada) ou houver erro de rede, libera — o rate-limit por minuto ainda vale.
 * Quando a migração estiver aplicada, vira defesa de custo dura.
 */
export async function checkQuota(req: NextApiRequest): Promise<QuotaResult> {
  try {
    const sb = userClient(req);
    const { data, error } = await sb.rpc("bump_ai_usage", {
      p_daily_limit: DAILY_LIMIT,
      p_monthly_limit: MONTHLY_LIMIT,
    });
    if (error) return { allowed: true, day: 0, month: 0 }; // fail-open
    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: !!row?.allowed,
      day: row?.day_count ?? 0,
      month: row?.month_count ?? 0,
    };
  } catch {
    return { allowed: true, day: 0, month: 0 }; // fail-open
  }
}

export const QUOTA = { DAILY_LIMIT, MONTHLY_LIMIT };

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
