import { supabase } from "./supabase";

// Sincronização localStorage ⇄ Supabase.
// O localStorage é o cache instantâneo (leituras síncronas dos getters em
// storage.ts). O Supabase é o armazém durável: hydrate() carrega no login,
// pushSoon() espelha as gravações (debounce). Tolerante a falha — sem rede/
// tabela o app segue no local — mas a falha NÃO é mais silenciosa: o status
// fica observável (subscribe) para a UI mostrar "salvo / salvando / offline".

export type SyncState = "idle" | "saving" | "saved" | "offline" | "local-only";

let _userId: string | null = null;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _ready = false; // só true após hydrate bem-sucedido (evita push antes da carga)
let _state: SyncState = "idle";
let _lastRemoteUpdatedAt: string | null = null; // p/ detectar conflito de outro device
let _retries = 0;

const listeners = new Set<(s: SyncState) => void>();

export function subscribeSync(fn: (s: SyncState) => void): () => void {
  listeners.add(fn);
  fn(_state);
  return () => listeners.delete(fn);
}
export function getSyncState(): SyncState { return _state; }

function setState(s: SyncState) {
  if (_state === s) return;
  _state = s;
  listeners.forEach((fn) => fn(s));
}

const KEYS = ["famoso_perfis", "famoso_perfil_ativo", "famoso_carrosseis", "famoso_ultimo_id", "famoso_marca", "famoso_agendamentos", "famoso_piloto"];

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
    const { data, error } = await supabase.from("workspaces").select("data, updated_at").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    _lastRemoteUpdatedAt = (data?.updated_at as string) ?? null;
    const remote = data?.data as Record<string, unknown> | undefined;
    if (remote && Object.keys(remote).length) {
      applySnapshot(remote);
    } else {
      await push(true); // remoto vazio → migra o local
    }
    _ready = true;
    setState("saved");
    return true;
  } catch {
    _ready = false; // sem tabela/rede: app continua no localStorage, como antes
    setState("local-only");
    return false;
  }
}

// Agenda um espelhamento (debounce) após uma gravação no localStorage.
export function pushSoon() {
  if (typeof window === "undefined" || !_userId || !_ready) return;
  setState("saving");
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => { void push(); }, 800);
}

async function push(force = false): Promise<void> {
  if (!_userId || (!_ready && !force)) return;
  setState("saving");
  try {
    // Conflito: se o remoto mudou desde o último que vimos (outro device gravou),
    // não clobbera — recarrega e mescla a favor do mais recente.
    if (!force && _lastRemoteUpdatedAt) {
      const { data } = await supabase.from("workspaces").select("updated_at").eq("user_id", _userId).maybeSingle();
      const remoteTs = (data?.updated_at as string) ?? null;
      if (remoteTs && remoteTs !== _lastRemoteUpdatedAt) {
        // outro device escreveu depois — puxa o remoto p/ não perder o trabalho dele
        const { data: full } = await supabase.from("workspaces").select("data, updated_at").eq("user_id", _userId).maybeSingle();
        if (full?.data && Object.keys(full.data).length) {
          applySnapshot(full.data as Record<string, unknown>);
          _lastRemoteUpdatedAt = (full.updated_at as string) ?? remoteTs;
          window.dispatchEvent(new CustomEvent("famoso:sync-conflict"));
          setState("saved");
          return;
        }
      }
    }
    const { data, error } = await supabase
      .from("workspaces")
      .upsert({ user_id: _userId, data: snapshot() })
      .select("updated_at")
      .maybeSingle();
    if (error) throw error;
    _lastRemoteUpdatedAt = (data?.updated_at as string) ?? _lastRemoteUpdatedAt;
    _retries = 0;
    setState("saved");
  } catch {
    // NÃO silencioso: marca offline e re-tenta com backoff (o local já tem o dado)
    setState("offline");
    if (_retries < 5) {
      _retries++;
      const delay = Math.min(1000 * 2 ** _retries, 30_000);
      if (_timer) clearTimeout(_timer);
      _timer = setTimeout(() => { void push(); }, delay);
    }
  }
}

// Apaga o workspace remoto (usado em "Limpar dados"). Sem isso, o hydrate()
// no próximo login repopularia o localStorage a partir da nuvem.
export async function wipeRemote(): Promise<void> {
  if (_timer) { clearTimeout(_timer); _timer = null; } // cancela push pendente
  if (!_userId) return;
  try {
    await supabase.from("workspaces").upsert({ user_id: _userId, data: {} });
    _lastRemoteUpdatedAt = null;
  } catch {
    /* sem rede/tabela: o local já foi limpo; segue */
  }
}

export function clearSyncUser() {
  _userId = null;
  _ready = false;
  _lastRemoteUpdatedAt = null;
  _retries = 0;
  if (_timer) { clearTimeout(_timer); _timer = null; }
  setState("idle");
}
