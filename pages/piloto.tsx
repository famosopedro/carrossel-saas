import { useState, useEffect } from "react";
import type React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import PageContainer from "@/components/PageContainer";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import {
  getPilotoConfig, savePilotoConfig, getAgendamentos, saveAgendamento, deleteAgendamento, novoId,
  type PilotoConfig, type Agendamento,
} from "@/lib/storage";
import { CARD, FG, MUTED, LINE, LINE2, BRAND, BRAND_INK, SP, RADIUS, SANS, SERIF, input, label as labelStyle } from "@/lib/ui";

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS_LONGO = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function fmtData(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function meiaNoite(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }

export default function Piloto() {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const { limites } = useAuth();
  const [cfg, setCfg] = useState<PilotoConfig | null>(null);
  const [ags, setAgs] = useState<Agendamento[]>([]);
  const [novaPauta, setNovaPauta] = useState("");

  useEffect(() => { setCfg(getPilotoConfig()); setAgs(getAgendamentos()); }, []);

  function patch(p: Partial<PilotoConfig>) {
    if (!cfg) return;
    const next = { ...cfg, ...p };
    setCfg(next); savePilotoConfig(next);
  }
  function toggleDia(i: number) {
    if (!cfg) return;
    const dias = cfg.dias.includes(i) ? cfg.dias.filter((d) => d !== i) : [...cfg.dias, i].sort();
    patch({ dias, frequencia: dias.length });
  }
  function addPauta() {
    const t = novaPauta.trim();
    if (!cfg) return;
    if (!t) { toast("Escreva uma pauta antes de adicionar", "erro"); return; }
    if (cfg.pautas.some((p) => p.toLowerCase() === t.toLowerCase())) { toast("Essa pauta já existe", "erro"); setNovaPauta(""); return; }
    patch({ pautas: [...cfg.pautas, t] });
    setNovaPauta("");
  }
  function removePauta(i: number) {
    if (!cfg) return;
    patch({ pautas: cfg.pautas.filter((_, idx) => idx !== i) });
  }

  // Cria agendamentos para os próximos dias que batem com a config (2 semanas)
  function gerarAgenda() {
    if (!cfg) return;
    if (!limites?.agendamento) { toast("Agendamento automático está disponível no plano Profissional.", "erro"); return; }
    if (!cfg.dias.length) { toast("Selecione ao menos um dia da semana", "erro"); return; }
    if (!cfg.pautas.length) { toast("Adicione ao menos uma pauta", "erro"); return; }
    const existentes = new Set(getAgendamentos().map((a) => a.data));
    const novos: Agendamento[] = [];
    let pautaIdx = 0;
    const hoje = new Date();
    for (let d = 1; d <= 14; d++) {
      const dia = new Date(hoje); dia.setDate(hoje.getDate() + d);
      if (!cfg.dias.includes(dia.getDay())) continue;
      const ts = meiaNoite(dia);
      if (existentes.has(ts)) continue;
      novos.push({
        id: novoId(), carrosselId: null, tema: cfg.pautas[pautaIdx % cfg.pautas.length],
        data: ts, hora: cfg.horario, status: "agendado", criadoEm: Date.now(),
      });
      pautaIdx++;
    }
    if (!novos.length) { toast("Nenhuma data nova nas próximas 2 semanas"); return; }
    novos.forEach(saveAgendamento);
    setAgs(getAgendamentos());
    toast(`${novos.length} ${novos.length === 1 ? "agendamento criado" : "agendamentos criados"}`);
  }

  function remover(id: string) {
    deleteAgendamento(id); setAgs(getAgendamentos());
  }
  function marcarPublicado(a: Agendamento) {
    saveAgendamento({ ...a, status: a.status === "publicado" ? "agendado" : "publicado" });
    setAgs(getAgendamentos());
  }

  if (!cfg) return null;

  const futuros = ags.filter((a) => a.status !== "publicado");

  // Vincula um slot da fila (sem carrossel) à geração com IA: leva o tema pro
  // /gerar e, ao gerar, o carrossel volta amarrado a este agendamento.
  function gerarDoSlot(a: Agendamento) {
    router.push(`/gerar?new=1&tema=${encodeURIComponent(a.tema)}&ag=${a.id}`);
  }

  return (
    <>
      <Head><title>Piloto Automático | FAMOSO®</title></Head>
      <PageContainer eyebrow="Planejamento" titulo="Piloto Automático" descricao="Planeje sua frequência e pautas. Gere os carrosséis da fila com 1 clique — a IA monta no DNA da sua marca. Publicação automática no Instagram chega em breve." maxWidth={920}>

        {/* Banner Instagram (fase 2) */}
        <div style={{ display: "flex", alignItems: "center", gap: SP.md, marginBottom: SP.xl, borderRadius: RADIUS.lg, border: `1px solid ${LINE2}`, background: CARD, padding: "14px 18px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--bg)", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: MUTED }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0, fontFamily: SANS }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: FG }}>Publicação automática no Instagram</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>Em breve: conecte sua conta para publicar direto pela API oficial da Meta. Por enquanto, o piloto monta a fila e você baixa para postar.</div>
          </div>
          <button disabled aria-disabled="true" title="Em breve"
            style={{ flexShrink: 0, padding: "8px 14px", borderRadius: RADIUS.md, border: `1px solid ${LINE2}`, background: "transparent", color: MUTED, fontSize: 12.5, fontWeight: 600, cursor: "not-allowed", fontFamily: SANS }}>
            Conectar (em breve)
          </button>
        </div>

        {/* Configuração */}
        <section style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, padding: SP.xl, marginBottom: SP.xl, fontFamily: SANS }}>
          <h2 style={subTitulo}>Frequência</h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: SP.xl }}>
            <div>
              <span style={labelStyle}>Dias da semana</span>
              <div style={{ display: "flex", gap: 6 }}>
                {DIAS.map((d, i) => {
                  const on = cfg.dias.includes(i);
                  return (
                    <button key={i} onClick={() => toggleDia(i)} aria-pressed={on} aria-label={DIAS_LONGO[i]} title={DIAS_LONGO[i]}
                      style={{ width: 38, height: 38, borderRadius: "50%", cursor: "pointer", fontFamily: SANS, fontSize: 13, fontWeight: 700,
                        border: `1px solid ${on ? BRAND : LINE2}`, background: on ? BRAND : "transparent", color: on ? BRAND_INK : MUTED }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="piloto-hora" style={labelStyle}>Horário</label>
              <input id="piloto-hora" type="time" value={cfg.horario} onChange={(e) => patch({ horario: e.target.value })}
                style={{ ...input, width: 130 }} />
            </div>

            <div style={{ alignSelf: "flex-end" }}>
              <span style={labelStyle}>Frequência</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: FG, padding: "9px 0" }}>
                {cfg.dias.length}× por semana
              </div>
            </div>
          </div>

          {/* Pautas */}
          <h2 style={{ ...subTitulo, marginTop: SP.xl }}>Pautas</h2>
          <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 12px" }}>Temas usados ao montar a fila (em rodízio). Cada slot vira um carrossel quando você clica em “Gerar”.</p>
          <div style={{ display: "flex", gap: SP.sm, marginBottom: cfg.pautas.length ? SP.md : 0 }}>
            <input value={novaPauta} onChange={(e) => setNovaPauta(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addPauta(); }}
              placeholder="Ex.: dicas de produtividade" aria-label="Nova pauta" style={{ ...input, flex: 1 }} />
            <button onClick={addPauta} style={{ flexShrink: 0, padding: "0 16px", borderRadius: RADIUS.md, border: "none", background: BRAND, color: BRAND_INK, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>Adicionar</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {cfg.pautas.map((p, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--bg)", border: `1px solid ${LINE2}`, borderRadius: 999, padding: "6px 8px 6px 12px", fontSize: 12.5, color: FG }}>
                {p}
                <button onClick={() => removePauta(i)} aria-label={`Remover pauta ${p}`} title="Remover"
                  style={{ width: 18, height: 18, borderRadius: "50%", border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>

          <div style={{ marginTop: SP.xl, display: "flex", gap: SP.md, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={gerarAgenda}
              style={{ padding: "11px 20px", borderRadius: RADIUS.md, border: "none", background: BRAND, color: BRAND_INK, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
              Gerar agenda (2 semanas)
            </button>
            <span style={{ fontSize: 12.5, color: MUTED }}>Cria a fila com base nos dias e pautas acima.</span>
          </div>
        </section>

        {/* Fila */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: SP.md }}>
            <h2 style={{ ...subTitulo, marginBottom: 0 }}>Fila de publicação</h2>
            {futuros.length > 0 && <span style={{ fontSize: 12.5, color: MUTED, fontFamily: SANS }}>{futuros.length} na fila</span>}
          </div>

          {ags.length === 0 ? (
            <EmptyState
              titulo="Nada agendado"
              texto="Defina dias e pautas acima e clique em “Gerar agenda” para montar a fila das próximas duas semanas."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ags.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: SP.md, background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.md, padding: "12px 16px", fontFamily: SANS }}>
                  <div style={{ textAlign: "center", flexShrink: 0, minWidth: 52 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: FG, textTransform: "capitalize" }}>{fmtData(a.data)}</div>
                    <div style={{ fontSize: 11.5, color: MUTED }}>{a.hora}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.tema}</div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{a.carrosselId ? "Carrossel pronto" : "Aguardando geração"}</div>
                  </div>
                  {a.carrosselId ? (
                    <Link href={`/gerar?id=${a.carrosselId}`} title="Abrir carrossel"
                      style={{ flexShrink: 0, padding: "7px 13px", borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, background: "transparent", color: FG, fontSize: 12, fontWeight: 600, fontFamily: SANS, textDecoration: "none" }}>
                      Abrir
                    </Link>
                  ) : (
                    <button onClick={() => gerarDoSlot(a)} title="Gerar carrossel com IA para este tema"
                      style={{ flexShrink: 0, padding: "7px 13px", borderRadius: RADIUS.sm, border: "none", background: BRAND, color: BRAND_INK, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                      Gerar
                    </button>
                  )}
                  <StatusBadge status={a.status} />
                  <button onClick={() => marcarPublicado(a)} title={a.status === "publicado" ? "Marcar como agendado" : "Marcar como publicado"}
                    aria-label={a.status === "publicado" ? "Marcar como agendado" : "Marcar como publicado"}
                    style={{ flexShrink: 0, width: 30, height: 30, borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, background: "transparent", color: MUTED, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                  </button>
                  <button onClick={() => remover(a.id)} title="Remover" aria-label="Remover agendamento"
                    style={{ flexShrink: 0, width: 30, height: 30, borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, background: "transparent", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </PageContainer>
      {ToastHost}
    </>
  );
}

const subTitulo: React.CSSProperties = {
  fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 18, color: FG, margin: "0 0 14px",
};
