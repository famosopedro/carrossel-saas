import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { BG, CARD, FG, MUTED, FAINT, LINE, LINE2, BRAND, BRAND_INK, SP, RADIUS, SANS, input as inputStyle } from "@/lib/ui";

type Provider = "gemini" | "openai";
type ProviderStatus = { connected: boolean; valid: boolean | null; last_tested_at: string | null };
type StatusMap = Record<Provider, ProviderStatus>;

const META: Record<Provider, { nome: string; placeholder: string }> = {
  gemini: { nome: "Google Gemini", placeholder: "Obtenha em aistudio.google.com/apikey" },
  openai: { nome: "OpenAI DALL·E 3", placeholder: "Obtenha em platform.openai.com/api-keys" },
};

const DEFAULT_STATUS: StatusMap = {
  gemini: { connected: false, valid: null, last_tested_at: null },
  openai: { connected: false, valid: null, last_tested_at: null },
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export default function ApiKeysConfig() {
  const { basePath } = useRouter();
  const [status, setStatus] = useState<StatusMap>(DEFAULT_STATUS);
  const [valores, setValores] = useState<Record<Provider, string>>({ gemini: "", openai: "" });
  const [busy, setBusy] = useState<string | null>(null); // ex.: "save:gemini"
  const [msg, setMsg] = useState<Record<Provider, string | null>>({ gemini: null, openai: null });

  const carregar = useCallback(async () => {
    try {
      const resp = await fetch(`${basePath}/api/keys/status`, { headers: await authHeaders() });
      if (resp.ok) setStatus(await resp.json());
    } catch { /* mantém default */ }
  }, [basePath]);

  useEffect(() => { void carregar(); }, [carregar]);

  function setMensagem(p: Provider, t: string | null) { setMsg((m) => ({ ...m, [p]: t })); }

  async function salvar(p: Provider) {
    const key = valores[p].trim();
    if (key.length < 20) { setMensagem(p, "Chave inválida (mínimo 20 caracteres)."); return; }
    setBusy(`save:${p}`); setMensagem(p, null);
    try {
      const resp = await fetch(`${basePath}/api/keys/save`, { method: "POST", headers: await authHeaders(), body: JSON.stringify({ provider: p, key }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setMensagem(p, data.error || "Falha ao salvar."); return; }
      setValores((v) => ({ ...v, [p]: "" })); // nunca mantém o valor em tela
      setMensagem(p, "Chave salva. Teste a conexão.");
      await carregar();
    } catch { setMensagem(p, "Falha de rede ao salvar."); }
    finally { setBusy(null); }
  }

  async function testar(p: Provider) {
    setBusy(`test:${p}`); setMensagem(p, "Testando…");
    try {
      const resp = await fetch(`${basePath}/api/keys/test`, { method: "POST", headers: await authHeaders(), body: JSON.stringify({ provider: p }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setMensagem(p, data.error || "Falha no teste."); return; }
      setMensagem(p, data.valid ? "Conexão válida ✓" : `Chave inválida. ${data.debug ?? ""}`);
      await carregar();
    } catch { setMensagem(p, "Falha de rede no teste."); }
    finally { setBusy(null); }
  }

  async function remover(p: Provider) {
    setBusy(`del:${p}`); setMensagem(p, null);
    try {
      const resp = await fetch(`${basePath}/api/keys/delete`, { method: "DELETE", headers: await authHeaders(), body: JSON.stringify({ provider: p }) });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) { setMensagem(p, data.error || "Falha ao remover."); return; }
      setMensagem(p, "Chave removida.");
      await carregar();
    } catch { setMensagem(p, "Falha de rede ao remover."); }
    finally { setBusy(null); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.md, fontFamily: SANS }}>
      <p style={{ fontSize: 12.5, color: MUTED, margin: 0, lineHeight: 1.5 }}>
        Conecte sua própria chave para gerar imagens nos carrosséis. O custo de geração é cobrado direto pelo provedor na sua conta.
      </p>

      {(Object.keys(META) as Provider[]).map((p) => {
        const st = status[p];
        return (
          <div key={p} style={{ background: BG, border: `1px solid ${LINE}`, borderRadius: RADIUS.md, padding: SP.lg }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SP.md, marginBottom: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: FG }}>{META[p].nome}</span>
              <Badge st={st} />
            </div>

            <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="password"
                value={valores[p]}
                onChange={(e) => setValores((v) => ({ ...v, [p]: e.target.value }))}
                placeholder={META[p].placeholder}
                autoComplete="off"
                aria-label={`Chave de API ${META[p].nome}`}
                style={{ ...inputStyle, flex: 1, minWidth: 220 }}
              />
              <button onClick={() => salvar(p)} disabled={busy !== null}
                style={btn(true, busy !== null)}>
                {busy === `save:${p}` ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={() => testar(p)} disabled={busy !== null || !st.connected}
                style={btn(false, busy !== null || !st.connected)}>
                {busy === `test:${p}` ? "Testando…" : "Testar conexão"}
              </button>
              {st.connected && (
                <button onClick={() => remover(p)} disabled={busy !== null}
                  style={{ ...btn(false, busy !== null), color: "var(--danger)", borderColor: LINE2 }}>
                  Remover
                </button>
              )}
            </div>

            {msg[p] && <p style={{ fontSize: 12, color: MUTED, margin: "10px 0 0" }}>{msg[p]}</p>}
          </div>
        );
      })}
    </div>
  );
}

function Badge({ st }: { st: ProviderStatus }) {
  let txt = "Não conectada", cor = FAINT, bg = "transparent";
  if (st.connected && st.valid === true) { txt = "Conectada"; cor = BRAND; bg = "rgba(37,211,102,0.12)"; }
  else if (st.connected && st.valid === false) { txt = "Inválida"; cor = "var(--danger)"; bg = "rgba(248,113,113,0.12)"; }
  else if (st.connected) { txt = "Não testada"; cor = MUTED; bg = "transparent"; }
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: cor, background: bg, border: `1px solid ${LINE2}`, borderRadius: 999, padding: "3px 10px" }}>
      {txt}
    </span>
  );
}

function btn(primary: boolean, disabled: boolean): React.CSSProperties {
  return {
    flexShrink: 0, padding: "9px 14px", borderRadius: RADIUS.md, fontSize: 12.5, fontWeight: 700,
    fontFamily: SANS, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
    border: primary ? "none" : `1px solid ${LINE2}`,
    background: primary ? BRAND : "transparent",
    color: primary ? BRAND_INK : FG,
  };
}
