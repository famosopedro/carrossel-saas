import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { getMarca, saveMarca, saveCarrossel, getCarrossel, getUltimoId, setUltimoId, DEFAULT_BRAND, FONTES, FONTES_SERIF, PESOS, novoSlide, deriveVariante, migrarSlide, VARIANTES, type BrandConfig, type Slide, type SlideVariante, type ListaItem, type ChatMsg, type TextAlign, type NumeracaoPosicao, type NumeracaoEstilo } from "@/lib/storage";
import SlideRender, { DIM } from "@/components/SlideRender";
import RichField from "@/components/RichField";
import IconPicker from "@/components/IconPicker";
import PromoRail from "@/components/PromoRail";
import { exportSlidePng, exportAllZip } from "@/lib/export";
import { useIsMobile } from "@/lib/useIsMobile";
import { BG, SURFACE, FG, MUTED, FAINT, LINE, LINE2, CARD, OK, ACCENT, SERIF, eyebrow } from "@/lib/ui";


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
  const isMobile = useIsMobile();
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
    undoTimer.current = setTimeout(() => setUndo(null), 10000);
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

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  }

  async function handleGerar() {
    if (!tema.trim()) return;
    setLoading(true); setErro(null);
    try {
      const res = await fetch(`/api/gerar`, {
        method: "POST", headers: await authHeaders(),
        body: JSON.stringify({ tema, quantidade, nomeMarca: marca.nomeMarca, descricao: marca.descricao, publicoAlvo: marca.publicoAlvo, conteudoPublico: marca.conteudoPublico, estiloComunicacao: marca.estiloComunicacao, idioma: marca.idioma }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      // carrossel novo = id novo (não sobrescreve o que já estava salvo)
      setCarrosselId(`c_${Date.now()}`);
      criadoEmRef.current = Date.now();
      setSlides((data.slides as Slide[]).map(migrarSlide));
      setSel(0);
    } catch (err) {
      console.error("gerar error:", err);
      setErro("Não consegui gerar agora. Tente de novo em alguns segundos.");
    } finally { setLoading(false); }
  }

  async function regenerarSlide(i: number) {
    setRegenIdx(i);
    setErro("");
    const anterior = slides[i];
    try {
      const res = await fetch(`/api/regenerar`, {
        method: "POST", headers: await authHeaders(),
        body: JSON.stringify({ tema, variante: deriveVariante(slides[i]), posicao: i + 1, total: slides.length, nomeMarca: marca.nomeMarca }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlides((p) => p.map((s, j) => (j === i ? migrarSlide(data.slide as Slide) : s)));
      showUndo("Slide regenerado", () => setSlides((p) => p.map((s, j) => (j === i ? anterior : s))));
    } catch { setErro("Não consegui refazer esse slide. Tente de novo."); }
    finally { setRegenIdx(null); }
  }

  function update<K extends keyof Slide>(i: number, field: K, value: Slide[K]) {
    setSlides((p) => p.map((s, j) => (j === i ? { ...s, [field]: value } : s)));
  }

  function setVariante(v: SlideVariante) {
    setSlides((p) => p.map((s, j) => {
      if (j !== sel) return s;
      const next: Slide = { ...s, variante: v };
      if (v === "lista-icones" && !(next.itens && next.itens.length)) next.itens = [{ icone: "check", texto: "" }];
      if (v === "chat" && !(next.mensagens && next.mensagens.length)) next.mensagens = [{ lado: "esq", autor: "", texto: "" }];
      return next;
    }));
  }

  // Lê imagem do disco, reduz p/ ≤1080px e devolve dataURL (reuso capa + destaque).
  function pickImage(cb: (dataUrl: string) => void) {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.onchange = () => {
      const file = inp.files?.[0]; if (!file) return;
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxW = 1080; const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale; canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isPng = file.type === "image/png" || file.type === "image/webp";
        cb(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.82));
        URL.revokeObjectURL(url);
      };
      img.src = url;
    };
    inp.click();
  }

  function addSlide() {
    setSlides((p) => { const n = [...p, novoSlide("tipografia")]; setSel(n.length - 1); return n; });
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
  const vAtual: SlideVariante = atual ? deriveVariante(atual) : "tipografia";
  const fontesSans = [...FONTES, ...(marca.customFonts || []).filter((f) => f.style === "normal").map((f) => f.name)].filter((v, i, a) => a.indexOf(v) === i);
  const fontesSerif = [...FONTES_SERIF, ...(marca.customFonts || []).filter((f) => f.style === "italic").map((f) => f.name)].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <>
    <Head><title>{tema ? `${tema} — Carrossel | FAMOSO®` : "Gerar carrossel | FAMOSO®"}</title></Head>
    <div style={{ background: BG, color: FG, display: "flex", ...(isMobile ? { flexDirection: "column", height: "auto", minHeight: "calc(100vh - 56px)" } : { height: "calc(100vh - 56px)", overflow: "hidden" }) }}>

      {/* SIDEBAR */}
      <aside className="sidebar-scroll" style={{ background: SURFACE, padding: "26px 22px", display: "flex", flexDirection: "column", gap: 20, flexShrink: 0, transition: "width 0.2s", ...(isMobile ? { width: "100%", boxSizing: "border-box", borderBottom: `1px solid ${LINE}`, height: "auto", overflowY: "visible" } : { width: marcaOpen ? 300 : 270, borderRight: `1px solid ${LINE}`, height: "100%", overflowY: "auto" }) }}>
        {/* Brand card — expansível */}
        <div style={{ borderRadius: 10, border: `1px solid ${LINE}` }}>
          <button
            onClick={() => setMarcaOpen((o) => !o)}
            style={{ width: "100%", padding: "10px 12px", background: CARD, border: "none", borderRadius: marcaOpen ? "10px 10px 0 0" : 10, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" as const }}
          >
            {marca.logo ? (
              <img src={marca.logo} alt="" style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4, background: BG, padding: 2, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: 4, background: BG, border: `1px solid ${LINE}`, flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{marca.nomeMarca}</p>
              <p style={{ margin: 0, fontSize: 11, color: FG, opacity: 0.6 }}>{marca.fonte} · {marca.formato === "vertical" ? "4:5" : "1:1"}</p>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {([["Título", "tituloPeso"], ["Corpo", "corpoPeso"], ["Serif", "serifPeso"]] as const).map(([lbl, key]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: MUTED, width: 36, flexShrink: 0 }}>{lbl}</span>
                      <input type="range" min={400} max={900} step={100} value={marca[key]} onChange={(e) => setM(key, parseInt(e.target.value))} style={{ flex: 1, accentColor: FG, cursor: "pointer" }} />
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: FG, width: 28, textAlign: "right" as const }}>{marca[key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Numeração */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Numeração</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["bottom-right", "bottom-left", "top-right", "top-left"] as NumeracaoPosicao[]).map((p) => {
                      const lbl = { "bottom-right": "↘", "bottom-left": "↙", "top-right": "↗", "top-left": "↖" }[p];
                      const ativo = (marca.numeracaoPosicao ?? "bottom-right") === p;
                      return <button key={p} onClick={() => setM("numeracaoPosicao", p)} title={p} style={{ flex: 1, padding: "5px 0", borderRadius: 4, fontSize: 14, cursor: "pointer", fontFamily: "inherit", background: ativo ? FG : CARD, color: ativo ? BG : MUTED, border: `1px solid ${ativo ? FG : LINE}` }}>{lbl}</button>;
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["numero", "seta", "nenhum"] as NumeracaoEstilo[]).map((e) => {
                      const lbl = { numero: "① Nº", seta: "→ Seta", nenhum: "∅ Nada" }[e];
                      const ativo = (marca.numeracaoEstilo ?? "numero") === e;
                      return <button key={e} onClick={() => setM("numeracaoEstilo", e)} style={{ flex: 1, padding: "5px 0", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: ativo ? FG : CARD, color: ativo ? BG : MUTED, border: `1px solid ${ativo ? FG : LINE}` }}>{lbl}</button>;
                    })}
                  </div>
                </div>
              </div>

              {/* Logos */}
              <div>
                <p style={{ margin: "0 0 9px", fontFamily: SERIF, fontStyle: "italic" as const, fontWeight: 500, fontSize: 15, color: FG, letterSpacing: "0.01em" }}>Logo</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {(marca.logos || []).map((src, i) => {
                    const ativo = marca.logo === src;
                    return (
                      <div key={i} style={{ position: "relative" }}>
                        <button onClick={() => setM("logo", src)} style={{ width: "100%", height: 46, borderRadius: 5, cursor: "pointer", background: CARD, border: `2px solid ${ativo ? FG : LINE}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, overflow: "hidden", position: "relative" }}>
                          <img src={src} alt="" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                          {ativo && <div style={{ position: "absolute", inset: 0, background: "rgba(237,237,237,0.15)", borderRadius: 3 }} />}
                        </button>
                        <button title="Remover logo" aria-label="Remover logo" onClick={() => { const next = (marca.logos || []).filter((_, j) => j !== i); setMarca((prev) => { const n = { ...prev, logos: next, logo: prev.logo === src ? (next[0] || null) : prev.logo }; saveMarca(n); return n; }); }} style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: FG, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
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
                      <button title="Remover asset" aria-label="Remover asset" onClick={() => { const next = (marca.assets||[]).filter((_,j)=>j!==i); setMarca(p=>{const n={...p,assets:next};saveMarca(n);return n;}); }} style={{ position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: "50%", background: "rgba(0,0,0,0.8)", border: "none", color: FG, fontSize: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
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

        <p className="ed-eyebrow" style={{ marginTop: 4 }}>Conteúdo</p>
        <div style={{ borderRadius: 10, border: `1px solid ${LINE}`, padding: "12px 14px" }}>
          <label style={lblStyle}>Sobre o que é o carrossel?</label>
          <textarea value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Ex: como criar carrosseis com IA em 30s" rows={3} style={taStyle} />
        </div>

        <div style={{ borderRadius: 10, border: `1px solid ${LINE}`, padding: "12px 14px" }}>
          <label id="slides-label" style={lblStyle}>Slides</label>
          <div role="group" aria-labelledby="slides-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setQuantidade((q) => Math.max(1, q - 1))} aria-label="Diminuir número de slides" style={{ width: 44, height: 44, borderRadius: 5, border: `1px solid ${LINE}`, background: "transparent", color: FG, fontSize: 18, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <span role="spinbutton" aria-valuenow={quantidade} aria-valuemin={1} aria-valuemax={30} aria-live="polite" style={{ flex: 1, textAlign: "center" as const, fontSize: 15, fontWeight: 700, color: FG }}>{quantidade}</span>
            <button onClick={() => setQuantidade((q) => Math.min(30, q + 1))} aria-label="Aumentar número de slides" style={{ width: 44, height: 44, borderRadius: 5, border: `1px solid ${LINE}`, background: "transparent", color: FG, fontSize: 18, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>

        <button onClick={handleGerar} disabled={loading || !tema.trim()} className="ed-primary" style={primaryBtn(loading || !tema.trim())}>
          {loading ? "Criando seus slides…" : "Gerar com IA →"}
        </button>
        {erro && <p role="alert" aria-live="assertive" style={{ fontSize: 11, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{erro}</p>}

        {temSlides && (
          <>
            <div style={{ borderRadius: 10, border: `1px solid ${LINE}`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              <p className="ed-eyebrow">Exportar</p>
              <button onClick={baixarUm} className="ed-btn" style={ghostBtn}>↓ Slide atual (PNG)</button>
              <button onClick={baixarTodos} disabled={exportando} className="ed-btn" style={ghostBtn}>
                {exportando ? `⏳ Exportando ${zipProg ?? ""}…` : "↓ Todos (ZIP)"}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: OK }}>
              <span style={{ fontSize: 9 }}>●</span>
              <span>Salvo automaticamente no dashboard</span>
            </div>

            {/* CTA de conversão — visível no fluxo mesmo quando a PromoRail some (<1280px) */}
            <a href="https://www.famosopedro.com.br/diagnostico" target="_blank" rel="noopener noreferrer"
              style={{ display: "block", textDecoration: "none", borderRadius: 10, border: `1px solid ${ACCENT}`, background: "transparent", padding: "12px 14px" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: FG, marginBottom: 3 }}>Sua marca vende como deveria?</span>
              <span style={{ display: "block", fontSize: 11, color: MUTED, lineHeight: 1.45, marginBottom: 8 }}>Diagnóstico gratuito em 3 minutos.</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>Fazer diagnóstico grátis →</span>
            </a>
          </>
        )}
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: 28, ...(isMobile ? { overflowY: "visible" } : { overflowY: "auto" }) }}>
        {loading ? (
          <div role="status" aria-live="polite" aria-busy="true" style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
            {/* espelha o layout carregado (coluna 416 + .stage padding 28 + filmstrip) p/ evitar shift */}
            <div style={{ flexShrink: 0, width: 416 }}>
              <div className="skeleton" style={{ width: 150, height: 14, marginBottom: 12 }} />
              <div className="stage" style={{ padding: 28, display: "flex", justifyContent: "center" }}>
                <div className="skeleton" style={{ width: 360, height: 360 * (DIM[marca.formato].h / DIM[marca.formato].w) }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
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
          <div style={{ minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, color: MUTED, padding: "40px 0" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }}>▦</div>
              <p style={{ ...eyebrow, fontSize: 18, color: FG, margin: "0 0 6px" }}>Crie seu primeiro carrossel</p>
              <p style={{ fontSize: 13, margin: 0, color: MUTED }}>Três passos da marca ao post pronto.</p>
            </div>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, maxWidth: 360, width: "100%" }}>
              {[
                ["1", "Configure sua marca", "Cores, fontes e logo — uma vez só."],
                ["2", "Gere com IA", "Escreva o tema ao lado e deixe a IA montar os slides."],
                ["3", "Exporte", "Baixe em PNG ou ZIP, pronto para postar."],
              ].map(([n, t, d]) => (
                <li key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "12px 14px" }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: FG, color: BG, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</span>
                  <span>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: FG }}>{t}</span>
                    <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{d}</span>
                  </span>
                </li>
              ))}
            </ol>
            <button onClick={() => router.push("/marca")} className="ed-btn" style={{ padding: "10px 22px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", background: FG, color: BG, border: "none", fontFamily: "inherit" }}>
              Configurar marca →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 28, alignItems: "flex-start", ...(isMobile ? { flexDirection: "column" } : {}) }}>

            {/* Preview grande (mesa de estúdio) + filmstrip — fixo enquanto o inspetor rola */}
            <div style={{ flexShrink: 0, alignSelf: "flex-start", ...(isMobile ? { width: "100%", position: "static" } : { width: 416, position: "sticky", top: 0 }) }}>
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
                    <button key={i} onClick={() => setSel(i)} title={`Slide ${i + 1}`} className="ed-thumb" style={{ position: "relative", padding: 0, border: `2px solid ${ativo ? ACCENT : LINE}`, borderRadius: 8, background: "none", cursor: "pointer", lineHeight: 0, overflow: "hidden" }}>
                      <ScaledSlide slide={s} index={i} total={slides.length} marca={marca} larguraAlvo={62} />
                      <span style={{ position: "absolute", left: 4, bottom: 4, width: 16, height: 16, borderRadius: "50%", background: ativo ? ACCENT : "rgba(0,0,0,0.85)", color: ativo ? BG : FG, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{i + 1}</span>
                    </button>
                  );
                })}
                <button onClick={addSlide} title="Adicionar slide" className="ed-btn" style={{ width: 62, height: 62 * (DIM[marca.formato].h / DIM[marca.formato].w), border: `1px dashed ${LINE2}`, borderRadius: 8, background: "none", color: MUTED, fontSize: 22, cursor: "pointer" }}>+</button>
              </div>
            </div>

            {/* Editor do slide selecionado */}
            <div style={{ flex: 1, maxWidth: 420, ...(isMobile ? { maxWidth: "100%", width: "100%" } : {}) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ ...eyebrow }}>Slide {sel + 1} <span style={{ color: FAINT }}>/ {slides.length}</span></p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => mover(sel, -1)} disabled={sel === 0} aria-label="Mover slide para a esquerda" title="Mover para a esquerda" className="ed-btn" style={iconBtn(sel === 0)}>←</button>
                  <button onClick={() => mover(sel, 1)} disabled={sel === slides.length - 1} aria-label="Mover slide para a direita" title="Mover para a direita" className="ed-btn" style={iconBtn(sel === slides.length - 1)}>→</button>
                  <button onClick={() => duplicar(sel)} aria-label="Duplicar slide" title="Duplicar slide" className="ed-btn" style={iconBtn(false)}>⧉</button>
                  <button onClick={() => removeSlide(sel)} disabled={slides.length <= 1} aria-label="Excluir slide" title="Excluir slide" className="ed-btn" style={iconBtn(slides.length <= 1)}>✕</button>
                </div>
              </div>

              <label style={lblStyle}>Estrutura do slide</label>
              <div role="group" aria-label="Estrutura do slide" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 18 }}>
                {VARIANTES.map((t) => {
                  const ativo = vAtual === t.v;
                  return (
                    <button key={t.v} onClick={() => setVariante(t.v)} aria-pressed={ativo} style={{ padding: "8px 0", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: ativo ? FG : "transparent", color: ativo ? BG : MUTED, border: `1px solid ${ativo ? FG : LINE}` }}>{t.label}</button>
                  );
                })}
              </div>

              <label style={lblStyle}>Tema deste slide</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
                {([["dark", "Dark"], ["light", "Light"]] as const).map(([v, lbl]) => {
                  const ativo = (atual.tema || marca.tema) === v;
                  return (
                    <button key={v} onClick={() => update(sel, "tema", v)} style={{ flex: 1, padding: "7px 0", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: ativo ? FG : "transparent", color: ativo ? BG : MUTED, border: `1px solid ${ativo ? FG : LINE}` }}>{lbl}</button>
                  );
                })}
              </div>

              {/* IMAGEM (capa e imagem-destaque) */}
              {(vAtual === "capa-imagem" || vAtual === "imagem-destaque") && (
                <>
                  <label style={lblStyle}>Imagem</label>
                  {atual.imagem ? (
                    <div style={{ marginBottom: 16 }}>
                      <img src={atual.imagem} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />
                      {vAtual === "capa-imagem" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>Opacidade</span>
                          <input type="range" min={0.1} max={1} step={0.05} value={atual.imagemOpacidade ?? 1} onChange={(e) => update(sel, "imagemOpacidade", parseFloat(e.target.value))} aria-label="Opacidade da imagem" style={{ flex: 1, accentColor: FG, cursor: "pointer" }} />
                          <span style={{ fontSize: 10, fontFamily: "monospace", color: FG, width: 30, textAlign: "right" as const }}>{Math.round((atual.imagemOpacidade ?? 1) * 100)}%</span>
                        </div>
                      )}
                      <label htmlFor="f-alt" style={{ ...lblStyle, marginBottom: 6 }}>Texto alternativo (alt)</label>
                      <input id="f-alt" value={atual.imagemAlt ?? ""} onChange={(e) => update(sel, "imagemAlt", e.target.value)} placeholder="Descreva a imagem para leitores de tela" style={{ ...taStyle, marginBottom: 8 }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => pickImage((d) => update(sel, "imagem", d))} className="ed-btn" style={{ ...ghostBtn, flex: 1 }}>Substituir</button>
                        <button onClick={() => update(sel, "imagem", null)} className="ed-btn" style={{ ...ghostBtn, flex: 1 }}>Remover</button>
                      </div>
                    </div>
                  ) : (
                    <button className="ed-btn" style={{ ...ghostBtn, marginBottom: 16, fontSize: 12 }} onClick={() => pickImage((d) => update(sel, "imagem", d))}>+ Adicionar imagem</button>
                  )}
                </>
              )}

              {/* TÍTULO — todas as variantes */}
              <RichField id="f-titulo" label="Título" hint="bold grande" value={atual.titulo} onChange={(v) => update(sel, "titulo", v)} rows={2}
                align={atual.tituloAlign} onAlign={(a) => update(sel, "tituloAlign", a)}
                cor={atual.tituloCor} onCor={(c) => update(sel, "tituloCor", c)} />

              {/* CORPO — capa (subtexto), tipografia, imagem-destaque */}
              {(vAtual === "capa-imagem" || vAtual === "tipografia" || vAtual === "imagem-destaque") && (
                <RichField id="f-corpo" label={vAtual === "capa-imagem" ? "Subtexto" : "Texto"} hint="Enter quebra linha" value={atual.corpo} onChange={(v) => update(sel, "corpo", v)} rows={3}
                  align={atual.corpoAlign} onAlign={(a) => update(sel, "corpoAlign", a)}
                  cor={atual.corpoCor} onCor={(c) => update(sel, "corpoCor", c)} />
              )}

              {/* SUBTÍTULO serif — tipografia */}
              {vAtual === "tipografia" && (
                <RichField id="f-sub" label="Subtítulo" hint="itálico serif" value={atual.subtitulo} onChange={(v) => update(sel, "subtitulo", v)} rows={2}
                  cor={atual.subtituloCor} onCor={(c) => update(sel, "subtituloCor", c)} />
              )}

              {/* CHAMADA — cta */}
              {vAtual === "cta" && (
                <RichField id="f-chamada" label="Chamada" hint="itálico serif" value={atual.subtitulo} onChange={(v) => update(sel, "subtitulo", v)} rows={2}
                  cor={atual.subtituloCor} onCor={(c) => update(sel, "subtituloCor", c)} />
              )}

              {/* ITENS — lista-icones */}
              {vAtual === "lista-icones" && (
                <>
                  <label style={lblStyle}>Itens</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                    {(atual.itens ?? []).map((it, ii) => (
                      <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <IconPicker value={it.icone} onChange={(id) => update(sel, "itens", (atual.itens ?? []).map((x, j) => j === ii ? { ...x, icone: id } : x))} />
                        <input value={it.texto} onChange={(e) => update(sel, "itens", (atual.itens ?? []).map((x, j) => j === ii ? { ...x, texto: e.target.value } : x))} placeholder="Texto do item" aria-label={`Texto do item ${ii + 1}`} style={{ ...taStyle, flex: 1 }} />
                        <button onClick={() => update(sel, "itens", (atual.itens ?? []).filter((_, j) => j !== ii))} aria-label={`Remover item ${ii + 1}`} className="ed-btn" style={iconBtn(false)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => update(sel, "itens", [...(atual.itens ?? []), { icone: "check", texto: "" } as ListaItem])} className="ed-btn" style={{ ...ghostBtn, marginBottom: 16 }}>+ Adicionar item</button>
                </>
              )}

              {/* MENSAGENS — chat */}
              {vAtual === "chat" && (
                <>
                  <label style={lblStyle}>Mensagens</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
                    {(atual.mensagens ?? []).map((m, mi) => (
                      <div key={mi} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <div role="group" aria-label={`Lado da mensagem ${mi + 1}`} style={{ display: "flex", gap: 4 }}>
                            {([["esq", "Esq."], ["dir", "Dir."]] as const).map(([ld, lbl]) => (
                              <button key={ld} onClick={() => update(sel, "mensagens", (atual.mensagens ?? []).map((x, j) => j === mi ? { ...x, lado: ld } : x))} aria-pressed={m.lado === ld} style={{ padding: "5px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: m.lado === ld ? FG : "transparent", color: m.lado === ld ? BG : MUTED, border: `1px solid ${m.lado === ld ? FG : LINE}` }}>{lbl}</button>
                            ))}
                          </div>
                          <input value={m.autor} onChange={(e) => update(sel, "mensagens", (atual.mensagens ?? []).map((x, j) => j === mi ? { ...x, autor: e.target.value } : x))} placeholder="Autor" aria-label={`Autor da mensagem ${mi + 1}`} style={{ ...taStyle, flex: 1, padding: "6px 9px" }} />
                          <button onClick={() => update(sel, "mensagens", (atual.mensagens ?? []).filter((_, j) => j !== mi))} aria-label={`Remover mensagem ${mi + 1}`} className="ed-btn" style={iconBtn(false)}>✕</button>
                        </div>
                        <textarea value={m.texto} onChange={(e) => update(sel, "mensagens", (atual.mensagens ?? []).map((x, j) => j === mi ? { ...x, texto: e.target.value } : x))} rows={2} placeholder="Mensagem" aria-label={`Texto da mensagem ${mi + 1}`} style={taStyle} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => update(sel, "mensagens", [...(atual.mensagens ?? []), { lado: "esq", autor: "", texto: "" } as ChatMsg])} className="ed-btn" style={{ ...ghostBtn, marginBottom: 16 }}>+ Adicionar mensagem</button>
                </>
              )}

              <button onClick={() => regenerarSlide(sel)} disabled={regenIdx !== null} className="ed-btn" style={{ ...ghostBtn, marginTop: 4 }}>
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
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50, overflow: "hidden" }}>
          <span style={{ fontSize: 12, color: FG }}>{undo.msg}</span>
          <button onClick={() => { undo.restore(); setUndo(null); }} className="ed-btn" style={{ fontSize: 12, fontWeight: 700, color: FG, background: "transparent", border: `1px solid ${FG}`, borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>Desfazer</button>
          <span key={undo.msg} className="undo-bar" aria-hidden="true" />
        </div>
      )}
    </div>
    </>
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
