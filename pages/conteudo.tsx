import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import PageContainer from "@/components/PageContainer";
import ContentCard from "@/components/ContentCard";
import EmptyState from "@/components/EmptyState";
import SlideRender from "@/components/SlideRender";
import { useToast } from "@/components/Toast";
import {
  getCarrosseis, getCarrossel, deleteCarrossel, saveCarrossel, getMarca, novoId,
  type Carrossel, type BrandConfig,
} from "@/lib/storage";
import { exportAllZip } from "@/lib/export";
import { BG, CARD, FG, MUTED, LINE, LINE2, BRAND, BRAND_INK, SP, RADIUS, SANS, input } from "@/lib/ui";

type Ordem = "recentes" | "antigos" | "az";

export default function Conteudo() {
  const router = useRouter();
  const { toast, ToastHost } = useToast();
  const [carrosseis, setCarrosseis] = useState<Carrossel[]>([]);
  const [marca, setMarca] = useState<BrandConfig | null>(null);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [undo, setUndo] = useState<Carrossel | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // export ZIP off-screen
  const [exportId, setExportId] = useState<string | null>(null);
  const [zipProg, setZipProg] = useState<string | null>(null);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => { setCarrosseis(getCarrosseis()); setMarca(getMarca()); }, []);

  function recarregar() { setCarrosseis(getCarrosseis()); }

  function handleDelete(c: Carrossel) {
    deleteCarrossel(c.id);
    setCarrosseis((prev) => prev.filter((x) => x.id !== c.id));
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

  // Exporta ZIP renderizando os slides em tamanho real fora da tela.
  // Espera TODOS os nós montarem (evita ZIP com slides faltando em máquina lenta).
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

  const filtrados = carrosseis
    .filter((c) => (c.tema || "").toLowerCase().includes(busca.toLowerCase().trim()))
    .sort((a, b) => ordem === "recentes" ? b.criadoEm - a.criadoEm
      : ordem === "antigos" ? a.criadoEm - b.criadoEm
      : (a.tema || "").localeCompare(b.tema || ""));

  const novoBtn = (
    <button onClick={() => router.push("/gerar?new=1")}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", background: BRAND, color: BRAND_INK, border: "none", borderRadius: RADIUS.md, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
      <span style={{ fontSize: 16, lineHeight: 0 }}>+</span> Novo carrossel
    </button>
  );

  return (
    <>
      <Head><title>Meu Conteúdo | FAMOSO®</title></Head>
      <PageContainer eyebrow="Biblioteca" titulo="Meu Conteúdo" descricao="Todos os carrosséis que você criou. Edite, duplique ou exporte quando quiser." acao={carrosseis.length > 0 ? novoBtn : undefined}>

        {carrosseis.length === 0 ? (
          <EmptyState
            titulo="Nenhum carrossel ainda"
            texto="Configure sua marca uma vez e deixe a IA montar seus carrosséis. Eles aparecem aqui prontos para editar e exportar."
            steps={[
              { n: 1, titulo: "DNA da Marca", texto: "Cores, fontes e logo — uma vez só." },
              { n: 2, titulo: "Gere com IA", texto: "Escreva o tema, a IA monta os slides." },
              { n: 3, titulo: "Exporte", texto: "Baixe em PNG ou ZIP e publique." },
            ]}
            ctaLabel="Gerar primeiro carrossel →"
            ctaHref="/gerar?new=1"
          />
        ) : (
          <>
            {/* Busca + ordenação */}
            <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap", marginBottom: SP.lg, alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por tema…"
                  aria-label="Buscar carrosséis" style={{ ...input, paddingLeft: 34 }} />
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" aria-hidden="true"
                  style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}>
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
                </svg>
              </div>
              <div style={{ display: "flex", gap: 4, background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.md, padding: 3 }}>
                {([["recentes", "Recentes"], ["antigos", "Antigos"], ["az", "A–Z"]] as [Ordem, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setOrdem(v)} aria-pressed={ordem === v}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: SANS,
                      fontSize: 12.5, fontWeight: 600, background: ordem === v ? BG : "transparent", color: ordem === v ? FG : MUTED }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {filtrados.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 14, padding: "32px 0", textAlign: "center", fontFamily: SANS }}>
                Nenhum carrossel encontrado para “{busca}”.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: SP.lg }}>
                {marca && filtrados.map((c) => (
                  <ContentCard key={c.id} carrossel={c} marca={marca} larguraAlvo={260}
                    onEdit={() => router.push(`/gerar?id=${c.id}`)}
                    onDuplicate={() => duplicar(c)}
                    onDelete={() => handleDelete(c)}
                    onExport={() => { if (!zipProg) { exportRefs.current = []; setExportId(c.id); } }}
                  />
                ))}
              </div>
            )}
          </>
        )}
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
