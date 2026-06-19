import { supabase } from "./supabase";

// Sincronização localStorage ⇄ Supabase.
// O localStorage continua sendo o cache instantâneo (leituras síncronas dos
// getters em storage.ts). O Supabase é o armazém durável: hydrate() carrega no
// login, pushSoon() espelha as gravações (debounce). Tudo tolerante a falha —
// se a tabela `workspaces` não existir ou faltar rede, o app segue só no local.

let _userId: string | null = null;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _ready = false; // só true após hydrate bem-sucedido (evita push antes da carga)

const KEYS = ["famoso_perfis", "famoso_perfil_ativo", "famoso_carrosseis", "famoso_ultimo_id", "famoso_marca"];

function snapshot(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const k of KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) data[k] = v;
  }
  return data;
}

function applySnapshot(data: Record<string, unknown>) {
  for (const k of KEYS) {
    if (typeof data[k] === "string") localStorage.setItem(k, data[k] as string);
  }
}

// Login: carrega o workspace do Supabase para o localStorage. Se o remoto estiver
// vazio mas houver dados locais, sobe (migração one-shot, não destrutiva).
// Retorna true se a nuvem respondeu (sync ativo); false se caiu p/ local-only.
export async function hydrate(userId: string): Promise<boolean> {
  _userId = userId;
  try {
    const { data, error } = await supabase.from("workspaces").select("data").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const remote = data?.data as Record<string, unknown> | undefined;
    if (remote && Object.keys(remote).length) {
      applySnapshot(remote);
    } else {
      await push(true); // remoto vazio → migra o local
    }
    _ready = true;
    return true;
  } catch {
    _ready = false; // sem tabela/rede: app continua no localStorage, como antes
    return false;
  }
}

// Agenda um espelhamento (debounce) após uma gravação no localStorage.
export function pushSoon() {
  if (typeof window === "undefined" || !_userId || !_ready) return;
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => { void push(); }, 800);
}

async function push(force = false) {
  if (!_userId || (!_ready && !force)) return;
  try {
    await supabase.from("workspaces").upsert({ user_id: _userId, data: snapshot() });
  } catch {
    /* silencioso: o localStorage já tem o dado; tenta de novo na próxima gravação */
  }
}

export function clearSyncUser() {
  _userId = null;
  _ready = false;
  if (_timer) { clearTimeout(_timer); _timer = null; }
}
