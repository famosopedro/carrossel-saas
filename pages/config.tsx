import { useState, useEffect } from "react";
import type React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import PageContainer from "@/components/PageContainer";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { wipeRemote } from "@/lib/sync";
import ApiKeysConfig from "@/components/ApiKeysConfig";
import {
  getPerfis, savePerfis, getPerfilAtivoId, setPerfilAtivoId,
  type BrandProfile,
} from "@/lib/storage";
import { BG, CARD, FG, MUTED, LINE, LINE2, BRAND, BRAND_INK, SP, RADIUS, SANS, SERIF } from "@/lib/ui";

const LS_KEYS = ["famoso_perfis", "famoso_perfil_ativo", "famoso_carrosseis", "famoso_ultimo_id", "famoso_marca", "famoso_agendamentos", "famoso_piloto"];

function Secao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, padding: SP.xl, marginBottom: SP.lg, fontFamily: SANS }}>
      <h2 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 18, color: FG, margin: 0 }}>{titulo}</h2>
      {descricao && <p style={{ fontSize: 12.5, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>{descricao}</p>}
      <div style={{ marginTop: SP.lg }}>{children}</div>
    </section>
  );
}

export default function Config() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { toast, ToastHost } = useToast();
  const [perfis, setPerfis] = useState<BrandProfile[]>([]);
  const [ativoId, setAtivoId] = useState("");
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => { setPerfis(getPerfis()); setAtivoId(getPerfilAtivoId()); }, []);

  function ativar(id: string) {
    setPerfilAtivoId(id); setAtivoId(id);
    toast("Perfil de marca ativado");
  }
  function excluir(id: string) {
    if (perfis.length <= 1) { toast("Mantenha ao menos um perfil", "erro"); return; }
    const next = perfis.filter((p) => p.id !== id);
    savePerfis(next); setPerfis(next);
    if (ativoId === id) { setPerfilAtivoId(next[0].id); setAtivoId(next[0].id); }
    toast("Perfil removido");
  }

  async function sair() { await signOut(); router.push("/login"); }

  async function limparDados() {
    if (!confirmarLimpar) { setConfirmarLimpar(true); setTimeout(() => setConfirmarLimpar(false), 4000); return; }
    setConfirmarLimpar(false);
    LS_KEYS.forEach((k) => localStorage.removeItem(k));
    await wipeRemote(); // sem isso, o hydrate() no reload traz tudo de volta da nuvem
    toast("Dados limpos");
    setTimeout(() => router.reload(), 600);
  }

  async function excluirConta() {
    if (!confirmarExcluir) { setConfirmarExcluir(true); setTimeout(() => setConfirmarExcluir(false), 5000); return; }
    setExcluindo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" },
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) { toast(json.error || "Não consegui excluir.", "erro"); setExcluindo(false); setConfirmarExcluir(false); return; }
      LS_KEYS.forEach((k) => localStorage.removeItem(k));
      await signOut();
      router.push("/login");
    } catch {
      toast("Falha ao excluir. Tente de novo.", "erro");
      setExcluindo(false);
      setConfirmarExcluir(false);
    }
  }

  return (
    <>
      <Head><title>Configurações | FAMOSO®</title></Head>
      <PageContainer eyebrow="Conta" titulo="Configurações" descricao="Gerencie sua conta, perfis de marca e dados." maxWidth={820}>

        {/* Integrações de IA */}
        <Secao titulo="Integrações de IA" descricao="Conecte suas chaves de API para gerar imagens nos carrosséis.">
          <ApiKeysConfig />
        </Secao>

        {/* Conta */}
        <Secao titulo="Conta">
          <div style={{ display: "flex", alignItems: "center", gap: SP.md, flexWrap: "wrap" }}>
            <div aria-hidden="true" style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--bg)", border: `1px solid ${LINE2}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: FG }}>
              {(user?.email?.[0] || "F").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>E-mail</div>
              <div style={{ fontSize: 14, color: FG, marginTop: 2 }}>{user?.email || "—"}</div>
            </div>
            <button onClick={sair}
              style={{ padding: "9px 16px", borderRadius: RADIUS.md, border: `1px solid ${LINE2}`, background: "transparent", color: FG, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>
              Sair da conta
            </button>
          </div>
        </Secao>

        {/* Perfis de marca */}
        <Secao titulo="Perfis de marca" descricao="Cada perfil guarda cores, fontes, logo e tom de voz próprios. O perfil ativo é usado ao gerar carrosséis.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {perfis.map((p) => {
              const ativo = p.id === ativoId;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: SP.md, padding: "12px 14px", borderRadius: RADIUS.md, border: `1px solid ${ativo ? BRAND : LINE}`, background: ativo ? "rgba(37,211,102,0.06)" : "var(--bg)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: FG }}>{p.nome || p.config?.nomeMarca || "Sem nome"}</div>
                    {ativo && <div style={{ fontSize: 11.5, color: BRAND, marginTop: 2, fontWeight: 600 }}>Ativo</div>}
                  </div>
                  {!ativo && (
                    <button onClick={() => ativar(p.id)} style={{ padding: "6px 12px", borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, background: "transparent", color: FG, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>Ativar</button>
                  )}
                  <Link href="/marca" style={{ padding: "6px 12px", borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, color: FG, fontSize: 12, fontWeight: 600, fontFamily: SANS, textDecoration: "none" }}>Editar</Link>
                  {perfis.length > 1 && (
                    <button onClick={() => excluir(p.id)} aria-label={`Excluir perfil ${p.nome}`} title="Excluir"
                      style={{ width: 30, height: 30, borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, background: "transparent", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <Link href="/marca?novo=1" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: SP.md, padding: "9px 16px", borderRadius: RADIUS.md, background: BRAND, color: BRAND_INK, fontSize: 13, fontWeight: 700, fontFamily: SANS, textDecoration: "none" }}>
            <span style={{ fontSize: 15, lineHeight: 0 }}>+</span> Novo perfil de marca
          </Link>
        </Secao>

        {/* Zona de perigo */}
        <Secao titulo="Dados e privacidade" descricao="Seus dados ficam neste navegador e sincronizados com sua conta. Você pode limpar os dados deste aparelho ou excluir permanentemente a conta e tudo que está na nuvem.">
          <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={limparDados}
              style={{ padding: "9px 16px", borderRadius: RADIUS.md, border: `1px solid ${LINE2}`, background: confirmarLimpar ? FG : "transparent", color: confirmarLimpar ? BG : FG, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: SANS }}>
              {confirmarLimpar ? "Confirmar limpeza" : "Limpar dados locais"}
            </button>
            <a href="https://www.famosopedro.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12.5, color: MUTED, fontFamily: SANS, textDecoration: "underline" }}>
              Política de privacidade
            </a>
            <a href="https://www.famosopedro.com.br/termos-de-uso" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12.5, color: MUTED, fontFamily: SANS, textDecoration: "underline" }}>
              Termos de uso
            </a>
          </div>
          <div style={{ marginTop: SP.lg, paddingTop: SP.lg, borderTop: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
              Excluir a conta apaga permanentemente seu login, perfis de marca, carrosséis e agendamentos — na nuvem e neste aparelho. Não dá pra desfazer.
            </div>
            <button onClick={excluirConta} disabled={excluindo}
              style={{ padding: "9px 16px", borderRadius: RADIUS.md, border: `1px solid var(--danger)`, background: confirmarExcluir ? "var(--danger)" : "transparent", color: confirmarExcluir ? "#fff" : "var(--danger)", fontSize: 13, fontWeight: 600, cursor: excluindo ? "not-allowed" : "pointer", fontFamily: SANS, opacity: excluindo ? 0.6 : 1 }}>
              {excluindo ? "Excluindo…" : confirmarExcluir ? "Confirmar exclusão da conta" : "Excluir conta e todos os dados"}
            </button>
          </div>
        </Secao>
      </PageContainer>
      {ToastHost}
    </>
  );
}
