import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { getMarca, saveMarca, saveCarrossel, getCarrossel, getUltimoId, setUltimoId, DEFAULT_BRAND, SLIDE_DEFAULTS, FONTES, FONTES_SERIF, PESOS, type BrandConfig, type Slide, type SlideTipo, type TextDec, type SlideLayout } from "@/lib/storage";
import SlideRender, { DIM } from "@/components/SlideRender";
import PromoRail from "@/components/PromoRail";
import { exportSlidePng, exportAllZip } from "@/lib/export";
import { BG, SURFACE, FG, MUTED, FAINT, LINE, LINE2, CARD, OK, ACCENT, SERIF, eyebrow } from "@/lib/ui";

const SLIDE_OPTIONS = [5, 8, 10];
const TIPOS: { v: SlideTipo; label: string }[] = [
  { v: "capa", label: "Capa" },
  { v: "conteudo", label: "Conteúdo" },
  { v: "cta", label: "CTA" },
];

const SLIDE_VAZIO: Slide = { tipo: "conteudo", titulo: "Novo slide", corpo: "", subtitulo: "", ...SLIDE_DEFAULTS };

// Slide escalado para caber no espaço dado
function ScaledSlide({ slide, index, total, marca, larguraAlvo }: {
  slide: Slide; index: number; total: number; marca: BrandConfig; larguraAlvo: number;
}) {
  const dim = DIM[marca.formato] || DIM.vertical;
  const escala = larguraAlvo / dim.w;
  return (
    <div style={{ width: larguraAlvo, height: dim.h * escala, overflow: "hidden", borderRadius: 10, flexShrink: 0 }}>
      <div style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
        <SlideRender slide={slide} index={index} total={total} marca={marca} />
      </div>
    </div>
  );
}

export default function Gerar() {
  const router = useRouter();
  const [tema, setTema] = useState("");
  const [quantidade, setQuantidade] = useState(5);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [sel, setSel] = useState(0);
  const [marca, setMarca] = useState<BrandConfig>(DEFAULT_BRAND); // hidrata via useEffect (evita mismatch SSR)
  const [carrosselId, setCarrosselId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [zipProg, setZipProg] = useState<string | null>(null);
  const [marcaOpen, setMarcaOpen] = useState(false);
  const [undo, setUndo] = useState<{ msg: string; restore: () => void } | null>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);
  const criadoEmRef = useRef<number>(0); // setado ao gerar ou carregar
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgFileRef = useRef<HTMLInputElement>(null);

  function showUndo(msg: string, restore: () => void) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ msg, restore });
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }

  function setM<K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) {
    setMarca((prev) => {
      const next = { ...prev, [key]: value };
      saveMarca(next);
      return next;
    });
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const current = marca.logos || [];
    const slots = 5 - current.length;
    files.slice(0, slots).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setMarca((prev) => {
          const next = { ...prev, logos: [...(prev.logos || []), src].slice(0, 5), logo: prev.logo || src };
          saveMarca(next);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  useEffect(() => { setMarca(getMarca()); }, []);

  // Carrega carrossel: ?id= vindo do dashboard (corrige "Editar"), senão retoma o último rascunho.
  // ?new=1 (botão "Novo carrossel") força começar em branco.
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.new) return;
    const qid = typeof router.query.id === "string" ? router.query.id : null;
    const id = qid || getUltimoId();
    if (!id) return;
    const c = getCarrossel(id);
    if (c) {
      setSlides(c.slides);
      setTema(c.tema);
      setCarrosselId(c.id);
      criadoEmRef.current = c.criadoEm;
      setSel(0);
    }
  }, [router.isReady, router.query.id, router.query.new]);

  // Auto-save: persiste no dashboard a cada mudança (debounce 600ms).
  // carrosselId já está sempre setado quando há slides (em handleGerar e no load).
  useEffect(() => {
    if (!slides.length || !carrosselId) return;
    const id = carrosselId;
    const t = setTimeout(() => {
      saveCarrossel({ id, tema, slides, criadoEm: criadoEmRef.current || Date.now() });
      setUltimoId(id);
    }, 600);
    return () => clearTimeout(t);
  }, [slides, tema, carrosselId]);

  async function handleGerar() {
    if (!tema.trim()) return;
    setLoading(true); setErro(null);
    try {
      const res = await fetch(`/maquina-de-carrosseis/api/gerar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, quantidade, nomeMarca: marca.nomeMarca, descricao: marca.descricao, publicoAlvo: marca.publicoAlvo, conteudoPublico: marca.conteudoPublico, estiloComunicacao: marca.estiloComunicacao, idioma: marca.idioma }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      // carrossel novo = id novo (não sobrescreve o que já estava salvo)
      setCarrosselId(`c_${Date.now()}`);
      criadoEmRef.current = Date.now();
      setSlides(data.slides);
      setSel(0);
    } catch (err) {
      console.error("gerar error:", err);
      setErro("Não consegui gerar agora. Tente de novo em alguns segundos.");
    } finally { setLoading(false); }
  }

  async function regenerarSlide(i: number) {
    setRegenIdx(i);
    const anterior = slides[i];
    try {
      const res = await fetch(`/maquina-de-carrosseis/api/regenerar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema, tipo: slides[i].tipo, posicao: i + 1, total: slides.length, nomeMarca: marca.nomeMarca }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlides((p) => p.map((s, j) => (j === i ? data.slide : s)));
      showUndo("Slide regenerado", () => setSlides((p) => p.map((s, j) => (j === i ? anterior : s))));
    } catch { setErro("Falha ao regenerar"); }
    finally { setRegenIdx(null); }
  }

  function update<K extends keyof Slide>(i: number, field: K, value: Slide[K]) {
    setSlides((p) => p.map((s, j) => (j === i ? { ...s, [field]: value } : s)));
  }

  function addSlide() {
    setSlides((p) => { const n = [...p, { ...SLIDE_VAZIO }]; setSel(n.length - 1); return n; });
  }
  function removeSlide(i: number) {
    const removido = slides[i];
    setSlides((p) => p.filter((_, j) => j !== i));
    setSel((s) => Math.max(0, s >= i ? s - 1 : s));
    showUndo("Slide removido", () => {
      setSlides((p) => { const n = [...p]; n.splice(i, 0, removido); return n; });
      setSel(i);
    });
  }
  function duplicar(i: number) {
    setSlides((p) => { const n = [...p]; n.splice(i + 1, 0, { ...p[i] }); return n; });
  }
  function mover(i: number, dir: -1 | 1) {
    const j = i + dir;
    setSlides((p) => { if (j < 0 || j >= p.length) return p; const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    setSel((s) => (s === i ? i + dir : s));
  }

  async function baixarUm() {
    const node = exportRefs.current[sel];
    if (node) await exportSlidePng(node, `slide-${sel + 1}`);
  }
  async function baixarTodos() {
    setExportando(true); setZipProg("0/" + slides.length);
    try {
      const nodes = exportRefs.current.filter(Boolean) as HTMLDivElement[];
      await exportAllZip(nodes, (tema || "carrossel").slice(0, 30).replace(/\s+/g, "-"), (feito, total) => setZipProg(`${feito}/${total}`));
    } finally { setExportando(false); setZipProg(null); }
  }

  const temSlides = slides.length > 0;
  const atual = slides[sel];
  const fontesSans = [...FONTES, ...(marca.customFonts || []).filter((f) => f.style === "normal").map((f) => f.name)].filter((v, i, a) => a.indexOf(v) === i);
  const fontesSerif = [...FONTES_SERIF, ...(marca.customFonts || []).filter((f) => f.style === "italic").map((f) => f.name)].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div style={{ background: BG, height: "calc(100vh - 56px)", overflow: "hidden", color: FG, display: "flex" }}>

      {/* SIDEBAR */}
      <aside style={{ width: marcaOpen ? 300 : 270, background: SURFACE, borderRight: `1px solid ${LINE}`, padding: "26px 22px", display: "flex", flexDirection: "column", gap: 20, flexShrink: 0, position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto", transition: "width 0.2s" }}>
        {/* Brand card — expansível */}
        <div style={{ borderRadius: 10, border: `1px solid ${LINE}`, overflow: "hidden" }}>
          <button
            onClick={() => setMarcaOpen((o) => !o)}
            style={{ width: "100%", padding: "10px 12px", background: CARD, border: "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" as const }}
          >
            {marca.logo ? (
              <img src={marca.logo} alt="" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4, background: BG, padding: 2, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: 4, background: BG, border: `1px solid ${LINE}`, flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{marca.nomeMarca}</p>
              <p style={{ margin: 0, fontSize: 10, color: MUTED }}>{marca.fonte} · {marca.formato === "vertical" ? "4:5" : "1:1"}</p>
            </div>
            <span style={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>{marcaOpen ? "▲" : "▼"}</span>
          </button>

          {marcaOpen && (
            <div style={{ padding: "14px 12px", borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 16, background: BG }}>

              {/* Fonte títulos */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Fonte títulos</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {fontesSans.map((f) => (
                    <button key={f} onClick={() => setM("fonte", f)} style={{ padding: "6px 0", borderRadius: 5, fontSize: 11, fontFamily: `'${f}', sans-serif`, fontWeight: 700, cursor: "pointer", background: marca.fonte === f ? FG : CARD, color: marca.fonte === f ? BG : MUTED, border: `1px solid ${marca.fonte === f ? FG : LINE}` }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fonte serif */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Fonte serif</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {fontesSerif.map((f) => (
                    <button key={f} onClick={() => setM("fonteSerif", f)} style={{ padding: "6px 0", borderRadius: 5, fontSize: 11, fontFamily: `'${f}', serif`, fontStyle: "italic", fontWeight: 500, cursor: "pointer", background: marca.fonteSerif === f ? FG : CARD, color: marca.fonteSerif === f ? BG : MUTED, border: `1px solid ${marca.fonteSerif === f ? FG : LINE}` }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tamanhos */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Tamanho</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {([["Título", "tituloTamanho", 48, 160], ["Corpo", "corpoTamanho", 24, 80], ["Serif", "serifTamanho", 24, 80]] as const).map(([lbl, key, min, max]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: MUTED, width: 36, flexShrink: 0 }}>{lbl}</span>
                      <input type="range" min={min} max={max} step={2} value={marca[key]} onChange={(e) => setM(key, parseFloat(e.target.value))} style={{ flex: 1, accentColor: FG, cursor: "pointer" }} />
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: FG, width: 36, textAlign: "right" as const }}>{marca[key]}px</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pesos */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Peso</p>
                {([["Título", "tituloPeso"], ["Corpo", "corpoPeso"], ["Serif", "serifPeso"]] as const).map(([lbl, key]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: MUTED, width: 36, flexShrink: 0 }}>{lbl}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {PESOS.map((p) => (
                        <button key={p} onClick={() => setM(key, p)} style={{ width: 28, padding: "4px 0", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", background: marca[key] === p ? FG : CARD, color: marca[key] === p ? BG : MUTED, border: `1px solid ${marca[key] === p ? FG : LINE}` }}>{p}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Logos */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Logo</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {(marca.logos || []).map((src, i) => {
                    const ativo = marca.logo === src;
                    return (
                      <div key={i} style={{ position: "relative" }}>
                        <button onClick={() => setM("logo", src)} style={{ width: "100%", height: 46, borderRadius: 5, cursor: "pointer", background: ativo ? FG : CARD, border: `1px solid ${ativo ? FG : LINE}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, overflow: "hidden" }}>
                          <img src={src} alt="" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", filter: ativo ? "invert(1)" : "none" }} />
                        </button>
                        <button onClick={() => { const next = (marca.logos || []).filter((_, j) => j !== i); setMarca((prev) => { const n = { ...prev, logos: next, logo: prev.logo === src ? (next[0] || null) : prev.logo }; saveMarca(n); return n; }); }} style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: FG, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      </div>
                    );
                  })}
                  {(marca.logos || []).length < 5 && (
                    <button onClick={() => logoFileRef.current?.click()} style={{ height: 46, borderRadius: 5, fontSize: 10, cursor: "pointer", background: "transparent", color: MUTED, border: `1px dashed ${LINE}` }}>+ logo</button>
                  )}
                </div>
                <input ref={logoFileRef} type="file" accept="image/*" multiple onChange={handleLogoUpload} style={{ display: "none" }} />
              </div>

              {/* Assets */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Assets PNG/SVG</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                  {(marca.assets || []).map((src, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <div style={{ width: "100%", aspectRatio: "1", background: "rgba(255,255,255,0.05)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `1px solid ${LINE}` }}>
                        <img src={src} alt="" style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                      </div>
                      <button onClick={() => { const next = (marca.assets||[]).filter((_,j)=>j!==i); setMarca(p=>{const n={...p,assets:next};saveMarca(n);return n;}); }} style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.8)", border: "none", color: FG, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => assetFileRef.current?.click()} style={{ aspectRatio: "1", borderRadius: 5, fontSize: 16, cursor: "pointer", background: "transparent", color: MUTED, border: `1px dashed ${LINE}` }}>+</button>
                </div>
                <input ref={assetFileRef} type="file" accept="image/png,image/svg+xml" multiple style={{ display: "none" }} onChange={(e) => {
                  Array.from(e.target.files||[]).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (ev) => { const src = ev.target?.result as string; setMarca(p=>{const n={...p,assets:[...(p.assets||[]),src].slice(0,20)};saveMarca(n);return n;}); };
                    reader.readAsDataURL(file);
                  });
                  e.target.value = "";
                }} />
              </div>

            </div>
          )}
        </div>

        <div style={{ borderRadius: 10, border: `1px solid ${LINE}`, padding: "12px 14px" }}>
          <label style={lblStyle}>Sobre o que é o carrossel?</label>
          <textarea value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex: como criar carrosseis com IA em 30s" rows={3} style={taStyle} />
        </div>

        <div style={{ borderRadius: 10, border: `1px solid ${LINE}`, padding: "12px 14px" }}>
          <label style={lblStyle}>Slides</label>
          <div style={{ display: "flex", gap: 6 }}>
            {SLIDE_OPTIONS.map((n) => (
              <button key={n} onClick={() => setQuantidade(n)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: quantidade === n ? FG : "transparent", color: quantidade === n ? BG : MUTED, border: `1px solid ${quantidade === n ? FG : LINE}` }}>{n}</button>
            ))}
          </div>
        </div>

        <button onClick={handleGerar} disabled={loading || !tema.trim()} style={primaryBtn(loading || !tema.trim())}>
          {loading ? "Criando seus slides…" : "Gerar com IA →"}
        </button>
        {erro && <p style={{ fontSize: 11, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{erro}</p>}

        {temSlides && (
          <>
            <div style={{ borderRadius: 10, border: `1px solid ${LINE}`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={lblStyle}>Exportar</label>
              <button onClick={baixarUm} style={ghostBtn}>↓ Slide atual (PNG)</button>
              <button onClick={baixarTodos} disabled={exportando} style={ghostBtn}>{exportando ? `Gerando ZIP… ${zipProg ?? ""}` : "↓ Todos (ZIP)"}</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: OK }}>
              <span style={{ fontSize: 9 }}>●</span>
              <span>Salvo automaticamente no dashboard</span>
            </div>
          </>
        )}
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {loading ? (
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
            <div style={{ flexShrink: 0 }}>
              <div className="skeleton" style={{ width: 360, height: 360 * (DIM[marca.formato].h / DIM[marca.formato].w) }} />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                {Array.from({ length: quantidade }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ width: 62, height: 62 * (DIM[marca.formato].h / DIM[marca.formato].w) }} />
                ))}
              </div>
            </div>
            <div style={{ flex: 1, maxWidth: 420, display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="skeleton" style={{ width: 140, height: 14 }} />
              <div className="skeleton" style={{ width: "100%", height: 40 }} />
              <div className="skeleton" style={{ width: "100%", height: 90 }} />
              <div className="skeleton" style={{ width: "75%", height: 40 }} />
              <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>Criando seus slides com IA…</p>
            </div>
          </div>
        ) : !temSlides ? (
          <div style={{ height: "100%", minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: MUTED }}>
            <div style={{ fontSize: 24, opacity: 0.3 }}>▦</div>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Comece por um tema. A IA monta os slides; você refina.</p>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>

            {/* Preview grande (mesa de estúdio) + filmstrip — fixo enquanto o inspetor rola */}
            <div style={{ flexShrink: 0, width: 416, position: "sticky", top: 0, alignSelf: "flex-start" }}>
              <p style={{ ...eyebrow, fontSize: 14, color: MUTED, margin: "0 0 12px" }}>Prévia — slide {sel + 1} de {slides.length}</p>
              <div className="stage" style={{ padding: 28, display: "flex", justifyContent: "center" }}>
                <div style={{ position: "relative", boxShadow: "var(--shadow-slide)", borderRadius: 10 }}>
                  <ScaledSlide slide={atual} index={sel} total={slides.length} marca={marca} larguraAlvo={360} />
                  {regenIdx === sel && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>Regenerando…</div>
                  )}
                </div>
              </div>
              {/* filmstrip — numerais circulares ecoam o número de página exportado */}
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", width: 416 }}>
                {slides.map((s, i) => {
                  const ativo = i === sel;
                  return (
                    <button key={i} onClick={() => setSel(i)} title={`Slide ${i + 1}`} style={{ position: "relative", padding: 0, border: `2px solid ${ativo ? ACCENT : LINE}`, borderRadius: 8, background: "none", cursor: "pointer", lineHeight: 0, overflow: "hidden" }}>
                      <ScaledSlide slide={s} index={i} total={slides.length} marca={marca} larguraAlvo={62} />
                      <span style={{ position: "absolute", left: 4, bottom: 4, width: 16, height: 16, borderRadius: "50%", background: ativo ? ACCENT : "rgba(0,0,0,0.62)", color: ativo ? BG : FG, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{i + 1}</span>
                    </button>
                  );
                })}
                <button onClick={addSlide} title="Adicionar slide" style={{ width: 62, height: 62 * (DIM[marca.formato].h / DIM[marca.formato].w), border: `1px dashed ${LINE2}`, borderRadius: 8, background: "none", color: MUTED, fontSize: 22, cursor: "pointer" }}>+</button>
              </div>
            </div>

            {/* Editor do slide selecionado */}
            <div style={{ flex: 1, maxWidth: 420 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ ...eyebrow }}>Slide {sel + 1} <span style={{ color: FAINT }}>/ {slides.length}</span></p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => mover(sel, -1)} disabled={sel === 0} style={iconBtn(sel === 0)}>←</button>
                  <button onClick={() => mover(sel, 1)} disabled={sel === slides.length - 1} style={iconBtn(sel === slides.length - 1)}>→</button>
                  <button onClick={() => duplicar(sel)} style={iconBtn(false)}>⧉</button>
                  <button onClick={() => removeSlide(sel)} disabled={slides.length <= 1} style={iconBtn(slides.length <= 1)}>✕</button>
                </div>
              </div>

              <label style={lblStyle}>Tipo</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                {TIPOS.map((t) => (
                  <button key={t.v} onClick={() => update(sel, "tipo", t.v)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: atual.tipo === t.v ? FG : "transparent", color: atual.tipo === t.v ? BG : MUTED, border: `1px solid ${atual.tipo === t.v ? FG : LINE}` }}>{t.label}</button>
                ))}
              </div>

              <label style={lblStyle}>Layout</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                {([["normal", "Normal"], ["split", "Split ½"]] as [SlideLayout, string][]).map(([v, lbl]) => (
                  <button key={v} onClick={() => update(sel, "layout", v)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: atual.layout === v ? FG : "transparent", color: atual.layout === v ? BG : MUTED, border: `1px solid ${atual.layout === v ? FG : LINE}` }}>{lbl}</button>
                ))}
              </div>

              {atual.layout === "split" && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ ...lblStyle, marginBottom: 6 }}>Divisão dark/light</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input type="range" min={0.3} max={0.8} step={0.01} value={atual.splitRatio} onChange={(e) => update(sel, "splitRatio", parseFloat(e.target.value))} style={{ flex: 1, accentColor: FG, cursor: "pointer" }} />
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: FG, width: 40, textAlign: "right" }}>{Math.round((atual.splitRatio ?? 0.58) * 100)}%</span>
                  </div>
                </div>
              )}

              <label style={lblStyle}>Tema deste slide</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                {([["dark", "Dark"], ["light", "Light"]] as const).map(([v, lbl]) => {
                  const ativo = (atual.tema || marca.tema) === v;
                  return (
                    <button key={v} onClick={() => update(sel, "tema", v)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: ativo ? FG : "transparent", color: ativo ? BG : MUTED, border: `1px solid ${ativo ? FG : LINE}` }}>{lbl}</button>
                  );
                })}
              </div>

              <label style={lblStyle}>Título <span style={{ textTransform: "none", color: MUTED, fontWeight: 400 }}>— bold grande</span></label>
              <textarea value={atual.titulo} onChange={(e) => update(sel, "titulo", e.target.value)} rows={2} style={{ ...taStyle, marginBottom: 16 }} />

              <label style={lblStyle}>Corpo <span style={{ textTransform: "none", color: MUTED, fontWeight: 400 }}>— Enter quebra linha</span></label>
              <textarea value={atual.corpo} onChange={(e) => update(sel, "corpo", e.target.value)} rows={3} style={{ ...taStyle, marginBottom: 16 }} />

              <label style={lblStyle}>Subtítulo <span style={{ textTransform: "none", color: MUTED, fontWeight: 400 }}>— itálico serif</span></label>
              <textarea value={atual.subtitulo} onChange={(e) => update(sel, "subtitulo", e.target.value)} rows={2} style={{ ...taStyle, marginBottom: 16 }} />

              <label style={lblStyle}>Decorações</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <DecRow label="Título" value={atual.tituloDecoracao} onChange={(v) => update(sel, "tituloDecoracao", v)} />
                <DecRow label="Corpo" value={atual.corpoDecoracao} onChange={(v) => update(sel, "corpoDecoracao", v)} />
                <DecRow label="Serif" value={atual.serifDecoracao} onChange={(v) => update(sel, "serifDecoracao", v)} />
              </div>
              <p style={{ fontSize: 10, color: MUTED, margin: "0 0 16px", lineHeight: 1.5 }}>
                No corpo: <code style={{ background: "rgba(237,237,237,0.08)", padding: "1px 4px", borderRadius: 3 }}>**bold**</code> · <code style={{ background: "rgba(237,237,237,0.08)", padding: "1px 4px", borderRadius: 3 }}>__underline__</code> · <code style={{ background: "rgba(237,237,237,0.08)", padding: "1px 4px", borderRadius: 3 }}>~~riscado~~</code>
              </p>

              {/* IMAGEM */}
              <label style={{ ...lblStyle, marginTop: 8 }}>Imagem</label>
              {atual.imagem ? (
                <div style={{ marginBottom: 12 }}>
                  <img src={atual.imagem} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {(["fundo", "topo", "base", "direita"] as const).map((p) => (
                      <button key={p} onClick={() => update(sel, "imagemPos", p)} style={{ flex: 1, padding: "5px 0", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: (atual.imagemPos ?? "fundo") === p ? FG : CARD, color: (atual.imagemPos ?? "fundo") === p ? BG : MUTED, border: `1px solid ${(atual.imagemPos ?? "fundo") === p ? FG : LINE}` }}>{p}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>Opacidade</span>
                    <input type="range" min={0.05} max={1} step={0.05} value={atual.imagemOpacidade ?? 0.35} onChange={(e) => update(sel, "imagemOpacidade", parseFloat(e.target.value))} style={{ flex: 1, accentColor: FG, cursor: "pointer" }} />
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: FG, width: 30, textAlign: "right" as const }}>{Math.round((atual.imagemOpacidade ?? 0.35) * 100)}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <button onClick={() => update(sel, "textoClaro", true)} style={{ flex: 1, padding: "5px 0", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: atual.textoClaro === true ? "#ededed" : CARD, color: atual.textoClaro === true ? "#1c1c1c" : MUTED, border: `1px solid ${atual.textoClaro === true ? "#ededed" : LINE}` }}>A claro</button>
                    <button onClick={() => update(sel, "textoClaro", false)} style={{ flex: 1, padding: "5px 0", borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: atual.textoClaro === false ? "#1c1c1c" : CARD, color: atual.textoClaro === false ? "#ededed" : MUTED, border: `1px solid ${atual.textoClaro === false ? "#ededed" : LINE}` }}>A escuro</button>
                    <button onClick={() => update(sel, "textoClaro", undefined)} style={{ flex: 1, padding: "5px 0", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "inherit", background: atual.textoClaro == null ? FG : CARD, color: atual.textoClaro == null ? BG : MUTED, border: `1px solid ${atual.textoClaro == null ? FG : LINE}` }}>auto</button>
                  </div>
                  <button onClick={() => update(sel, "imagem", null)} style={{ fontSize: 10, color: MUTED, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>remover imagem</button>
                </div>
              ) : (
                <button onClick={() => imgFileRef.current?.click()} style={{ ...ghostBtn, marginBottom: 12, fontSize: 11 }}>+ Adicionar imagem</button>
              )}
              <input ref={imgFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // comprime: canvas resize pra max 1080px
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                  const maxW = 1080;
                  const scale = img.width > maxW ? maxW / img.width : 1;
                  const canvas = document.createElement("canvas");
                  canvas.width = img.width * scale;
                  canvas.height = img.height * scale;
                  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                  update(sel, "imagem", canvas.toDataURL("image/jpeg", 0.82));
                  URL.revokeObjectURL(url);
                };
                img.src = url;
                e.target.value = "";
              }} />

              {/* ELEMENTOS / ASSETS */}
              {(marca.assets || []).length > 0 && (
                <>
                  <label style={{ ...lblStyle, marginTop: 8 }}>Elementos</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5, marginBottom: 8 }}>
                    {(marca.assets || []).map((src, i) => (
                      <button key={i} onClick={() => {
                        const els = atual.elementos ?? [];
                        update(sel, "elementos", [...els, { src, x: 50, y: 50, tamanho: 200, rotacao: 0 }]);
                      }} style={{ aspectRatio: "1", borderRadius: 5, cursor: "pointer", background: CARD, border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 4 }}>
                        <img src={src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                      </button>
                    ))}
                  </div>
                  {(atual.elementos ?? []).map((el, ei) => (
                    <div key={ei} style={{ background: CARD, borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <img src={el.src} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                        <span style={{ fontSize: 10, color: MUTED, flex: 1 }}>Elemento {ei + 1}</span>
                        <button onClick={() => update(sel, "elementos", (atual.elementos ?? []).filter((_, j) => j !== ei))} style={{ fontSize: 10, color: MUTED, background: "none", border: "none", cursor: "pointer" }}>✕</button>
                      </div>
                      {([["x", "X", 0, 100], ["y", "Y", 0, 100], ["tamanho", "Tam", 40, 1080], ["rotacao", "Rot", -180, 180]] as const).map(([key, lbl, min, max]) => (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: MUTED, width: 24, flexShrink: 0 }}>{lbl}</span>
                          <input type="range" min={min} max={max} step={key === "rotacao" ? 1 : key === "tamanho" ? 10 : 1} value={el[key]} onChange={(e) => {
                            const next = (atual.elementos ?? []).map((e2, j) => j === ei ? { ...e2, [key]: parseFloat(e.target.value) } : e2);
                            update(sel, "elementos", next);
                          }} style={{ flex: 1, accentColor: FG, cursor: "pointer" }} />
                          <span style={{ fontSize: 10, fontFamily: "monospace", color: FG, width: 32, textAlign: "right" as const }}>{el[key]}{key === "rotacao" ? "°" : key === "x" || key === "y" ? "%" : "px"}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}

              <button onClick={() => regenerarSlide(sel)} disabled={regenIdx !== null} style={{ ...ghostBtn, marginTop: 4 }}>
                {regenIdx === sel ? "Regenerando..." : "↻ Regenerar este slide com IA"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Ofertas FAMOSO.® — aproveita o espaço à direita (some em telas estreitas) */}
      <PromoRail />

      {/* Render full-size escondido para export */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        {slides.map((s, i) => (
          <div key={i} ref={(el) => { exportRefs.current[i] = el; }}>
            <SlideRender slide={s} index={i} total={slides.length} marca={marca} />
          </div>
        ))}
      </div>

      {undo && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50 }}>
          <span style={{ fontSize: 12, color: FG }}>{undo.msg}</span>
          <button onClick={() => { undo.restore(); setUndo(null); }} style={{ fontSize: 12, fontWeight: 700, color: FG, background: "transparent", border: `1px solid ${FG}`, borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>Desfazer</button>
        </div>
      )}
    </div>
  );
}

const DECS: { v: TextDec; label: string }[] = [
  { v: "none", label: "—" },
  { v: "underline", label: "U̲" },
  { v: "line-through", label: "S̶" },
];

function DecRow({ label, value, onChange }: { label: string; value: TextDec; onChange: (v: TextDec) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: MUTED, width: 44, flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {DECS.map((d) => (
          <button key={d.v} onClick={() => onChange(d.v)} style={{ width: 32, height: 26, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: value === d.v ? FG : "transparent", color: value === d.v ? BG : MUTED, border: `1px solid ${value === d.v ? FG : LINE}` }}>{d.label}</button>
        ))}
      </div>
    </div>
  );
}

const lblStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 };
const taStyle: React.CSSProperties = { width: "100%", background: CARD, border: `1px solid ${LINE}`, borderRadius: 6, padding: "9px 11px", fontSize: 12, color: FG, resize: "none", outline: "none", lineHeight: 1.55, fontFamily: "inherit", boxSizing: "border-box" };

function primaryBtn(disabled: boolean): React.CSSProperties {
  return { width: "100%", padding: "10px 0", background: disabled ? "rgba(237,237,237,0.2)" : FG, color: disabled ? MUTED : BG, border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" };
}
const ghostBtn: React.CSSProperties = { width: "100%", padding: "9px 0", background: "transparent", color: FG, border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
function iconBtn(disabled: boolean): React.CSSProperties {
  return { width: 30, height: 30, borderRadius: 5, background: "transparent", color: disabled ? "rgba(237,237,237,0.2)" : FG, border: `1px solid ${LINE}`, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" };
}
