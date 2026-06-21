import { useState, useEffect } from "react";
import type React from "react";
import Head from "next/head";
import Link from "next/link";
import PageContainer from "@/components/PageContainer";
import MetricCard from "@/components/MetricCard";
import MiniChart from "@/components/MiniChart";
import EmptyState from "@/components/EmptyState";
import { getCarrosseis, getAgendamentos, type Carrossel, type Agendamento } from "@/lib/storage";
import { CARD, FG, MUTED, FAINT, LINE, LINE2, BRAND, SP, RADIUS, SANS, SERIF } from "@/lib/ui";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const Ico = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

function fmtData(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Relatorios() {
  const [carrosseis, setCarrosseis] = useState<Carrossel[]>([]);
  const [ags, setAgs] = useState<Agendamento[]>([]);

  useEffect(() => { setCarrosseis(getCarrosseis()); setAgs(getAgendamentos()); }, []);

  const totalSlides = carrosseis.reduce((s, c) => s + c.slides.length, 0);
  const publicados = ags.filter((a) => a.status === "publicado").length;
  const agendados = ags.filter((a) => a.status === "agendado").length;

  // Carrosséis criados nos últimos 6 meses
  const now = new Date();
  const serie = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    const ini = d.getTime();
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const value = carrosseis.filter((c) => c.criadoEm >= ini && c.criadoEm < fim).length;
    return { label: MESES[d.getMonth()], value };
  });

  const recentes = [...carrosseis].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 10);

  return (
    <>
      <Head><title>Relatórios | FAMOSO®</title></Head>
      <PageContainer eyebrow="Análise" titulo="Relatórios" descricao="Acompanhe sua produção de conteúdo. Métricas de alcance e engajamento chegam ao conectar o Instagram.">

        {carrosseis.length === 0 ? (
          <EmptyState
            titulo="Sem dados ainda"
            texto="Gere seus primeiros carrosséis para ver estatísticas de produção aqui."
            ctaLabel="Criar carrossel →"
            ctaHref="/gerar?new=1"
          />
        ) : (
          <>
            {/* Métricas de produção */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: SP.md, marginBottom: SP.xl }}>
              <MetricCard label="Carrosséis" value={carrosseis.length} hint="criados no total" icon={Ico("M3 5h18v14H3z")} />
              <MetricCard label="Slides" value={totalSlides} hint="gerados no total" icon={Ico("M4 4h10v10H4zM10 10h10v10H10z")} />
              <MetricCard label="Agendados" value={agendados} hint="na fila" icon={Ico("M8 2v4M16 2v4M3 10h18M5 6h14v14H5z")} />
              <MetricCard label="Publicados" value={publicados} hint="via piloto" accent icon={Ico("M20 6 9 17l-5-5")} />
            </div>

            {/* Gráfico de produção */}
            <section style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, padding: SP.xl, marginBottom: SP.xl, fontFamily: SANS }}>
              <h2 style={subTitulo}>Produção nos últimos 6 meses</h2>
              <MiniChart data={serie} />
            </section>

            {/* Placeholder métricas Instagram */}
            <section style={{ marginBottom: SP.xl }}>
              <h2 style={subTitulo}>Desempenho no Instagram</h2>
              <div style={{ position: "relative", borderRadius: RADIUS.lg, border: `1px solid ${LINE2}`, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: SP.md, padding: SP.lg, filter: "blur(2px)", opacity: 0.45, pointerEvents: "none" }} aria-hidden="true">
                  {[["Alcance", "12,4 mil"], ["Impressões", "18,9 mil"], ["Salvamentos", "962"], ["Engajamento", "8,1%"]].map(([l, v]) => (
                    <div key={l} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.md, padding: SP.md }}>
                      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: FG, marginTop: 4 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center", padding: SP.lg, background: "rgba(0,0,0,0.18)", fontFamily: SANS }}>
                  <div style={{ color: MUTED }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: FG }}>Conecte o Instagram para métricas reais</div>
                  <div style={{ fontSize: 12.5, color: MUTED, maxWidth: 360, lineHeight: 1.5 }}>Alcance, impressões, salvamentos e engajamento por post — via API oficial da Meta. Disponível em breve. <span style={{ color: FAINT }}>(números ao fundo são ilustrativos)</span></div>
                </div>
              </div>
            </section>

            {/* Tabela por carrossel */}
            <section>
              <h2 style={subTitulo}>Por carrossel</h2>
              <div style={{ border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, overflow: "hidden", fontFamily: SANS }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 130px", gap: SP.md, padding: "10px 16px", background: CARD, borderBottom: `1px solid ${LINE}`, fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <span>Tema</span><span style={{ textAlign: "right" }}>Slides</span><span style={{ textAlign: "right" }}>Criado em</span>
                </div>
                {recentes.map((c, i) => (
                  <Link key={c.id} href={`/gerar?id=${c.id}`} title={`Editar: ${c.tema || "Sem título"}`}
                    style={{ display: "grid", gridTemplateColumns: "1fr 80px 130px", gap: SP.md, padding: "12px 16px", borderBottom: i < recentes.length - 1 ? `1px solid ${LINE}` : "none", fontSize: 13, color: FG, alignItems: "center", textDecoration: "none", transition: "background 0.12s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.tema || "Sem título"}</span>
                    <span style={{ textAlign: "right", color: MUTED }}>{c.slides.length}</span>
                    <span style={{ textAlign: "right", color: MUTED }}>{fmtData(c.criadoEm)}</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </PageContainer>
    </>
  );
}

const subTitulo: React.CSSProperties = {
  fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 18, color: FG, margin: "0 0 14px",
};
