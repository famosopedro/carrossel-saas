import { useState, useEffect, useRef } from "react";
import type React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import PageContainer from "@/components/PageContainer";
import MetricCard from "@/components/MetricCard";
import ContentCard from "@/components/ContentCard";
import EmptyState from "@/components/EmptyState";
import SlideRender from "@/components/SlideRender";
import { useToast } from "@/components/Toast";
import { exportAllZip } from "@/lib/export";
import { useAuth } from "@/lib/auth";
import {
  getCarrosseis, getCarrossel, deleteCarrossel, saveCarrossel, getAgendamentos, getUltimoId, getMarca, isMarcaConfigurada, novoId,
  type Carrossel, type BrandConfig,
} from "@/lib/storage";
import { CARD, FG, MUTED, LINE, LINE2, BRAND, BRAND_INK, SP, RADIUS, SANS, SERIF } from "@/lib/ui";

const Ico = (d: string) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast, ToastHost } = useToast();
  const [carrosseis, setCarrosseis] = useState<Carrossel[]>([]);
  const [marca, setMarca] = useState<BrandConfig | null>(null);
  const [ultimo, setUltimo] = useState<Carrossel | null>(null);
  const [agCount, setAgCount] = useState({ agendado: 0, publicado: 0 });
  const [temMarca, setTemMarca] = useState(true);
  const [undo, setUndo] = useState<Carrossel | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // export ZIP off-screen (mesmo padrão de /conteudo)
  const [exportId, setExportId] = useState<string | null>(null);
  const [zipProg, setZipProg] = useState<string | null>(null);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  function recarregar() { setCarrosseis(getCarrosseis()); }

  useEffect(() => {
    const cs = getCarrosseis();
    setCarrosseis(cs);
    setMarca(getMarca());
    setTemMarca(isMarcaConfigurada());
    const uid = getUltimoId();
    setUltimo((uid && cs.find((c) => c.id === uid)) || null);
    const ag = getAgendamentos();
    setAgCount({
      agendado: ag.filter((a) => a.status === "agendado").length,
      publicado: ag.filter((a) => a.status === "publicado").length,
    });
  }, []);

  function handleDelete(c: Carrossel) {
    deleteCarrossel(c.id);
    setCarrosseis((prev) => prev.filter((x) => x.id !== c.id));
    setUltimo((u) => (u && u.id === c.id ? null : u));
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(c);
    undoTimer.current = setTimeout(() => setUndo(null), 8000);
  }
  function desfazer() {
    if (!undo) return;
    saveCarrossel(undo); recarregar(); setUndo(null);
    toast("Carrossel restaurado");
  }
  function duplicar(c: Carrossel) {
    const copia: Carrossel = { ...c, id: novoId(), tema: `${c.tema || "Sem título"} (cópia)`, criadoEm: Date.now() };
    saveCarrossel(copia); recarregar();
    toast("Carrossel duplicado");
  }

  // Renderiza os slides em tamanho real fora da tela e zipa.
  // Espera TODOS os nós montarem (evita ZIP incompleto em máquina lenta).
  const carrosselExport = exportId ? getCarrossel(exportId) : undefined;
  useEffect(() => {
    if (!exportId || !carrosselExport || !marca) return;
    let cancel = false;
    const total = carrosselExport.slides.length;
    setZipProg("Preparando…");
    let tentativas = 0;
    async function tentar() {
      if (cancel) return;
      const nodes = exportRefs.current.filter(Boolean) as HTMLDivElement[];
      if (nodes.length < total && tentativas < 40) { tentativas++; setTimeout(tentar, 50); return; }
      try {
        await exportAllZip(nodes, carrosselExport!.tema || "carrossel", (f, t) => {
          if (!cancel) setZipProg(`${f}/${t}`);
        });
        if (!cancel) toast("ZIP exportado");
      } catch {
        if (!cancel) toast("Falha ao exportar", "erro");
      } finally {
        if (!cancel) { setZipProg(null); setExportId(null); }
      }
    }
    const t = setTimeout(tentar, 50);
    return () => { cancel = true; clearTimeout(t); };
  }, [exportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const recentes = [...carrosseis].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 4);
  const ultimoGeradoTxt = recentes[0]
    ? new Date(recentes[0].criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "—";
  const primeiroNome = (user?.email || "").split("@")[0];

  const acoes: { href: string; titulo: string; texto: string; icon: React.ReactElement }[] = [
    { href: "/gerar?new=1", titulo: "Novo Carrossel", texto: "Gere slides com IA a partir de um tema.", icon: Ico("M12 5v14M5 12h14") },
    { href: "/marca", titulo: "DNA da Marca", texto: "Ajuste cores, fontes, logo e tom de voz.", icon: Ico("M12 2a10 10 0 1 0 0 20 4 4 0 0 0 0-8 2 2 0 0 1 0-4") },
    { href: "/piloto", titulo: "Piloto Automático", texto: "Programe a frequência e deixe rodar.", icon: Ico("M13 2 4.5 13.5H11l-1 8.5L19.5 10.5H13z") },
  ];

  return (
    <>
      <Head><title>Dashboard | FAMOSO®</title></Head>
      <PageContainer eyebrow="Visão geral" titulo={primeiroNome ? `Olá, ${primeiroNome}` : "Dashboard"} descricao="Seu painel da Máquina de Carrosséis.">

        {/* Alerta: marca não configurada */}
        {!temMarca && (
          <Link href="/marca" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: SP.xl, textDecoration: "none", borderRadius: RADIUS.lg, border: `1px solid ${BRAND}`, background: "rgba(37,211,102,0.06)", padding: "14px 18px" }}>
            <span style={{ fontFamily: SANS }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: FG }}>Comece pelo DNA da Marca</span>
              <span style={{ display: "block", fontSize: 12.5, color: MUTED, marginTop: 2 }}>Defina cores, fontes e logo para a IA gerar no seu estilo.</span>
            </span>
            <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: BRAND }}>Configurar →</span>
          </Link>
        )}

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: SP.md, marginBottom: SP.xl }}>
          <MetricCard label="Carrosséis" value={carrosseis.length} hint="total criados" icon={Ico("M3 5h18v14H3z")} />
          <MetricCard label="Agendados" value={agCount.agendado} hint="na fila do piloto" icon={Ico("M8 2v4M16 2v4M3 10h18M5 6h14v14H5z")} />
          <MetricCard label="Publicados" value={agCount.publicado} hint="via piloto" accent icon={Ico("M20 6 9 17l-5-5")} />
          <MetricCard label="Último gerado" value={ultimoGeradoTxt} hint={recentes[0] ? "data do último" : "nenhum ainda"} icon={Ico("M12 8v4l3 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z")} />
        </div>

        {carrosseis.length === 0 ? (
          <EmptyState
            titulo="Seu primeiro carrossel em 3 passos"
            texto="Da identidade ao post pronto para publicar."
            steps={[
              { n: 1, titulo: "Configure a marca", texto: "Cores, fontes e logo — uma vez só." },
              { n: 2, titulo: "Gere com IA", texto: "Escreva o tema e a IA monta os slides." },
              { n: 3, titulo: "Exporte", texto: "Baixe em PNG ou ZIP e publique." },
            ]}
            ctaLabel="Gerar primeiro carrossel →"
            ctaHref="/gerar?new=1"
          />
        ) : (
          <>
            {/* Continuar de onde parou */}
            {ultimo && (
              <section style={{ marginBottom: SP.xl }}>
                <h2 style={subTitulo}>Continuar de onde parou</h2>
                <Link href={`/gerar?id=${ultimo.id}`} style={{ display: "flex", alignItems: "center", gap: SP.lg, textDecoration: "none", background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, padding: SP.lg }}>
                  <div style={{ width: 46, height: 46, borderRadius: RADIUS.md, background: "var(--bg)", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND, flexShrink: 0 }}>{Ico("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")}</div>
                  <div style={{ flex: 1, minWidth: 0, fontFamily: SANS }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ultimo.tema || "Sem título"}</div>
                    <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{ultimo.slides.length} slides · retomar edição</div>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: BRAND, fontFamily: SANS }}>Editar →</span>
                </Link>
              </section>
            )}

            {/* Recentes */}
            <section style={{ marginBottom: SP.xl }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: SP.md }}>
                <h2 style={{ ...subTitulo, marginBottom: 0 }}>Recentes</h2>
                <Link href="/conteudo" style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, fontFamily: SANS }}>Ver tudo →</Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: SP.lg }}>
                {marca && recentes.map((c) => (
                  <ContentCard key={c.id} carrossel={c} marca={marca} larguraAlvo={240}
                    onEdit={() => router.push(`/gerar?id=${c.id}`)}
                    onDuplicate={() => duplicar(c)}
                    onDelete={() => handleDelete(c)}
                    onExport={() => { if (!zipProg) { exportRefs.current = []; setExportId(c.id); } }}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Atalhos rápidos */}
        <section>
          <h2 style={subTitulo}>Atalhos</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: SP.md }}>
            {acoes.map((a) => (
              <Link key={a.href} href={a.href} className="lift" style={{ textDecoration: "none", background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, padding: SP.lg, display: "flex", gap: SP.md, alignItems: "flex-start" }}>
                <span style={{ color: BRAND, flexShrink: 0, marginTop: 1 }}>{a.icon}</span>
                <span style={{ fontFamily: SANS }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: FG }}>{a.titulo}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: MUTED, marginTop: 3, lineHeight: 1.45 }}>{a.texto}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA de conversão */}
        <a href="https://www.famosopedro.com.br/diagnostico" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: SP.xl, textDecoration: "none", borderRadius: RADIUS.lg, border: `1px solid ${LINE2}`, background: "transparent", padding: "16px 18px" }}>
          <span style={{ fontFamily: SANS }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: FG, marginBottom: 3 }}>Sua marca vende como deveria?</span>
            <span style={{ display: "block", fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>Diagnóstico gratuito de percepção de valor em 3 minutos.</span>
          </span>
          <span style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: BRAND, whiteSpace: "nowrap", fontFamily: SANS }}>Fazer grátis →</span>
        </a>
      </PageContainer>

      {/* Render off-screen p/ exportar ZIP em tamanho real */}
      {carrosselExport && marca && (
        <div aria-hidden="true" style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
          {carrosselExport.slides.map((s, i) => (
            <div key={i} ref={(el) => { exportRefs.current[i] = el; }}>
              <SlideRender slide={s} index={i} total={carrosselExport.slides.length} marca={marca} />
            </div>
          ))}
        </div>
      )}

      {zipProg && (
        <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: CARD, border: `1px solid ${LINE2}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: FG, fontFamily: SANS, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          Exportando ZIP… {zipProg}
        </div>
      )}

      {undo && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 200, fontFamily: SANS }}>
          <span style={{ fontSize: 12.5, color: FG }}>Carrossel apagado</span>
          <button onClick={desfazer} style={{ fontSize: 12, fontWeight: 700, color: FG, background: "transparent", border: `1px solid ${FG}`, borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>Desfazer</button>
        </div>
      )}

      {ToastHost}
    </>
  );
}

const subTitulo: React.CSSProperties = {
  fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 18, color: FG, margin: "0 0 14px",
};
