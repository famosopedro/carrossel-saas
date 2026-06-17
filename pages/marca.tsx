import React, { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/router";
import { getMarca, saveMarca, getPerfis, savePerfis, getPerfilAtivoId, setPerfilAtivoId, FONTES, FONTES_SERIF, PESOS, DEFAULT_BRAND, BLANK_BRAND, SLIDE_DEFAULTS, type BrandConfig, type BrandProfile, type Slide } from "@/lib/storage";
import { registrarFontesCustom, fileToDataUrl } from "@/lib/fonts";
import SlideRender, { DIM } from "@/components/SlideRender";
import PromoRail from "@/components/PromoRail";
import { BG, FG, MUTED, LINE, CARD, OK, eyebrow } from "@/lib/ui";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>
      {children}
    </label>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 24 }}>{children}</div>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: CARD,
        border: `1px solid ${LINE}`,
        borderRadius: 6,
        padding: "9px 12px",
        fontSize: 13,
        color: FG,
        outline: "none",
        fontFamily: "inherit",
      }}
    />
  );
}

const PREVIEW_SLIDE: Slide = {
  tipo: "capa",
  titulo: "Sua marca pode estar te custando dinheiro.",
  corpo: "",
  subtitulo: "E o pior: talvez você ainda não tenha medido quanto.",
  ...SLIDE_DEFAULTS,
};

function SlidePreview({ marca }: { marca: BrandConfig }) {
  const dim = DIM[marca.formato] || DIM.vertical;
  const largura = 300;
  const escala = largura / dim.w;
  return (
    <div style={{ width: largura, height: dim.h * escala, overflow: "hidden", borderRadius: 10 }}>
      <div style={{ transform: `scale(${escala})`, transformOrigin: "top left" }}>
        <SlideRender slide={PREVIEW_SLIDE} index={0} total={5} marca={marca} />
      </div>
    </div>
  );
}

// Slider normal (espaçamento)
function SliderField({ label, value, min, max, step, fmt, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  fmt: (v: number) => string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 11, color: MUTED, width: 88, flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: FG, cursor: "pointer" }}
      />
      <span style={{ fontSize: 11, fontFamily: "monospace", color: FG, width: 68, textAlign: "right", flexShrink: 0 }}>
        {fmt(value)}
      </span>
    </div>
  );
}

// Input numérico estilo design software (↑↓ + digitação)
function NumInput({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 11, color: MUTED, width: 44, flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", background: CARD, border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden", height: 32 }}>
        <input
          type="number" value={value} min={min} max={max} step={step}
          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(clamp(v)); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); onChange(clamp(parseFloat((value + step).toFixed(10))));  }
            if (e.key === "ArrowDown") { e.preventDefault(); onChange(clamp(parseFloat((value - step).toFixed(10)))); }
          }}
          style={{ width: 52, background: "transparent", border: "none", outline: "none", color: FG, fontSize: 13, fontWeight: 600, fontFamily: "monospace", padding: "0 6px", textAlign: "right", MozAppearance: "textfield" } as React.CSSProperties}
        />
        {unit && <span style={{ fontSize: 11, color: MUTED, paddingRight: 8, paddingLeft: 2 }}>{unit}</span>}
        <div style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${LINE}`, height: "100%" }}>
          <button onClick={() => onChange(clamp(parseFloat((value + step).toFixed(10))))} style={{ flex: 1, width: 22, background: "transparent", border: "none", cursor: "pointer", color: MUTED, fontSize: 9, lineHeight: 1, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>▲</button>
          <div style={{ height: 1, background: LINE }} />
          <button onClick={() => onChange(clamp(parseFloat((value - step).toFixed(10))))} style={{ flex: 1, width: 22, background: "transparent", border: "none", cursor: "pointer", color: MUTED, fontSize: 9, lineHeight: 1, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>▼</button>
        </div>
      </div>
    </div>
  );
}

// Carrega a fonte pro preview imediato E devolve o dataUrl pra persistir na marca.
async function loadCustomFont(file: File, style: "normal" | "italic" = "normal"): Promise<{ name: string; dataUrl: string }> {
  const dataUrl = await fileToDataUrl(file);
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const face = new FontFace(name, `url(${dataUrl})`, { style, weight: "100 900" });
  await face.load();
  document.fonts.add(face);
  return { name, dataUrl };
}

export default function MarcaPage() {
  const router = useRouter();
  const [marca, setMarca] = useState<BrandConfig>(DEFAULT_BRAND);
  const [saved, setSaved] = useState(false);
  const [customFontes, setCustomFontes] = useState<string[]>([]);
  const [customFontesSerif, setCustomFontesSerif] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const fonteSansRef = useRef<HTMLInputElement>(null);
  const fonteSerifRef = useRef<HTMLInputElement>(null);

  const [perfis, setPerfis] = useState<BrandProfile[]>([]);
  const [perfilAtivoId, setPerfilAtivoIdState] = useState<string | null>(null);
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoArquivos, setNovoArquivos] = useState<File[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const [analisandoIdx, setAnalisandoIdx] = useState(0);
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const novoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ps = getPerfis();
    setPerfis(ps);
    if (ps.length > 0) {
      const savedId = getPerfilAtivoId();
      const found = ps.find(p => p.id === savedId);
      const perfil = found || ps[0];
      setPerfilAtivoIdState(perfil.id);
      setPerfilAtivoId(perfil.id);
      const m = { ...DEFAULT_BRAND, ...perfil.config };
      setMarca(m);
      registrarFontesCustom(m);
      setCustomFontes((m.customFonts || []).filter(f => f.style === "normal").map(f => f.name));
      setCustomFontesSerif((m.customFonts || []).filter(f => f.style === "italic").map(f => f.name));
    }
  }, []);

  function carregarPerfil(id: string) {
    const ps = getPerfis();
    const p = ps.find(p => p.id === id) || ps[0];
    if (!p) return;
    const m = { ...DEFAULT_BRAND, ...p.config };
    setMarca(m);
    registrarFontesCustom(m);
    setCustomFontes((m.customFonts || []).filter((f) => f.style === "normal").map((f) => f.name));
    setCustomFontesSerif((m.customFonts || []).filter((f) => f.style === "italic").map((f) => f.name));
    setSaved(false);
  }

  function switchPerfil(id: string) {
    setPerfilAtivoId(id);
    setPerfilAtivoIdState(id);
    carregarPerfil(id);
  }

  async function comprimirParaBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    if (file.type === "application/pdf") {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { base64: dataUrl.split(",")[1], mimeType: file.type };
    }
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const r = Math.min(MAX / width, MAX / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.src = url;
    });
  }

  async function criarPerfil() {
    const nome = novoNome.trim();
    if (!nome) return;
    const id = `perfil_${Date.now()}`;

    const oversized = novoArquivos.find(f => f.type === "application/pdf" && f.size > 3 * 1024 * 1024);
    if (oversized) {
      setErroAnalise(`PDF "${oversized.name.slice(0, 30)}" passa de 3 MB. Exporte uma página como PNG.`);
      return;
    }

    // 1. Cria perfil vazio e abre o form imediatamente
    const configInicial: BrandConfig = { ...BLANK_BRAND, nomeMarca: nome };
    const novo: BrandProfile = { id, nome, config: configInicial };
    const ps = [...getPerfis(), novo];
    savePerfis(ps);
    setPerfis(ps);
    setNovoNome("");
    setNovoArquivos([]);
    setCriandoNovo(false);
    setPerfilAtivoId(id);
    setPerfilAtivoIdState(id);
    setMarca(configInicial);
    setSaved(false);
    console.log("[marca] perfil criado, id=", id, "perfilAtivoId setado");

    // 2. Análise roda em background e atualiza os campos quando terminar
    if (novoArquivos.length === 0) return;
    setAnalisando(true);
    setErroAnalise(null);
    let extraConfig: Partial<BrandConfig> = {};
    const arquivos = [...novoArquivos];
    for (let i = 0; i < arquivos.length; i++) {
      setAnalisandoIdx(i);
      const arquivo = arquivos[i];
      const apiUrl = "/api/analisar-marca";
      try {
        const { base64, mimeType: mt } = await comprimirParaBase64(arquivo);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        const resp = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: mt }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        const json = await resp.json();
        console.log("[analisar-marca] resposta:", JSON.stringify(json));
        if (json.ok && json.config) {
          const partial = Object.fromEntries(
            Object.entries(json.config).filter(([, v]) => v !== "" && v != null)
          ) as Partial<BrandConfig>;
          console.log("[analisar-marca] extraído:", JSON.stringify(partial));
          extraConfig = { ...extraConfig, ...partial };
        } else {
          setErroAnalise(json.error || `Erro ${resp.status}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErroAnalise(msg.includes("abort") ? "Tempo esgotado" : msg);
      }
    }
    setAnalisando(false);
    setAnalisandoIdx(0);

    if (Object.keys(extraConfig).length === 0) return;

    // Atualiza o form independente de storage
    const configFinal: BrandConfig = { ...configInicial, ...extraConfig };
    console.log("[marca] aplicando configFinal:", JSON.stringify(configFinal));
    flushSync(() => {
      setMarca(configFinal);
      setPerfilAtivoIdState(id);
      setFormKey(k => k + 1);
      setSaved(false);
    });

    // Tenta persistir
    const perfisSalvos = getPerfis();
    const idx = perfisSalvos.findIndex(p => p.id === id);
    if (idx >= 0) {
      perfisSalvos[idx] = { ...perfisSalvos[idx], nome: configFinal.nomeMarca || nome, config: configFinal };
      savePerfis(perfisSalvos);
      setPerfis([...perfisSalvos]);
    }
  }

  function deletarPerfil(id: string) {
    const ps = getPerfis().filter(p => p.id !== id);
    const next = ps.length ? ps : [{ id: "famoso", nome: "FAMOSO.", config: DEFAULT_BRAND }];
    savePerfis(next);
    setPerfis(next);
    if (perfilAtivoId === id) {
      switchPerfil(next[0].id);
    }
  }

  function set<K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) {
    setMarca((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const ok = saveMarca(marca);
    if (!ok) {
      alert("Não foi possível salvar — o armazenamento do navegador está cheio. Remova fontes ou logos pesados e tente de novo.");
      return;
    }
    setPerfis(getPerfis());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const current = marca.logos || [];
    const slots = 5 - current.length;
    files.slice(0, slots).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result as string;
        setMarca((prev) => {
          const next = [...(prev.logos || []), src].slice(0, 5);
          return { ...prev, logos: next, logo: prev.logo || src };
        });
        setSaved(false);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  async function handleUploadSans(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { name, dataUrl } = await loadCustomFont(file, "normal");
    setCustomFontes((prev) => prev.includes(name) ? prev : [...prev, name]);
    setMarca((prev) => {
      const outras = (prev.customFonts || []).filter((f) => !(f.name === name && f.style === "normal"));
      return { ...prev, fonte: name, customFonts: [...outras, { name, dataUrl, style: "normal" }] };
    });
    setSaved(false);
    e.target.value = "";
  }

  async function handleUploadSerif(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { name, dataUrl } = await loadCustomFont(file, "italic");
    setCustomFontesSerif((prev) => prev.includes(name) ? prev : [...prev, name]);
    setMarca((prev) => {
      const outras = (prev.customFonts || []).filter((f) => !(f.name === name && f.style === "italic"));
      return { ...prev, fonteSerif: name, customFonts: [...outras, { name, dataUrl, style: "italic" }] };
    });
    setSaved(false);
    e.target.value = "";
  }

  return (
    <div style={{ background: BG, height: "calc(100vh - 56px)", overflow: "hidden", color: FG, display: "flex" }}>
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 28px", display: "grid", gridTemplateColumns: "1fr 320px", gap: 48, alignItems: "start" }}>

        {/* Form */}
        <div>
          {/* Seletor de perfis */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: MUTED, marginBottom: 12 }}>
              Identidade visual
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              {perfis.map((p) => {
                const ativo = perfilAtivoId === p.id;
                return (
                  <div key={p.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <button
                      onClick={() => switchPerfil(p.id)}
                      style={{
                        padding: "7px 14px",
                        paddingRight: perfis.length > 1 ? 28 : 14,
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: ativo ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        background: ativo ? FG : CARD,
                        color: ativo ? BG : MUTED,
                        border: `1px solid ${ativo ? FG : LINE}`,
                        transition: "all 0.1s",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      {p.nome}
                    </button>
                    {perfis.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deletarPerfil(p.id); }}
                        title="Remover perfil"
                        style={{
                          position: "absolute",
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: "transparent",
                          border: "none",
                          color: ativo ? BG : MUTED,
                          fontSize: 9,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0.6,
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              {criandoNovo ? (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, padding: "10px 14px", background: CARD, border: `1px solid ${LINE}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" as const }}>
                    <input
                      autoFocus
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") criarPerfil();
                        if (e.key === "Escape") { setCriandoNovo(false); setNovoNome(""); setNovoArquivos([]); setErroAnalise(null); }
                      }}
                      placeholder="Nome da marca..."
                      style={{ padding: "6px 10px", border: `1px solid ${LINE}`, borderRadius: 6, background: BG, color: FG, fontSize: 12, outline: "none", fontFamily: "inherit", width: 160 }}
                    />
                    <button
                      onClick={() => novoFileRef.current?.click()}
                      title="PDF ou imagem da identidade visual — Claude extrai nome, tema, fonte e URL"
                      style={{
                        padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        background: "transparent", color: MUTED,
                        border: `1px dashed ${LINE}`,
                        fontFamily: "inherit", whiteSpace: "nowrap" as const,
                      }}
                    >
                      ＋ Arquivos da marca
                    </button>
                    <input
                      ref={novoFileRef}
                      type="file"
                      accept=".pdf,image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setNovoArquivos(prev => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {novoArquivos.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                      {novoArquivos.map((f, i) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: BG, border: `1px solid ${LINE}`, borderRadius: 4, padding: "3px 8px", color: MUTED }}>
                          {f.name.slice(0, 24)}{f.name.length > 24 ? "…" : ""} <span style={{ fontSize: 10, opacity: 0.5 }}>({(f.size / 1024 / 1024).toFixed(1)}MB)</span>
                          <button onClick={() => setNovoArquivos(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 10, padding: 0, lineHeight: 1, marginLeft: 2 }}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      onClick={criarPerfil}
                      disabled={analisando || !novoNome.trim()}
                      style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: analisando ? "default" : "pointer", background: FG, color: BG, border: "none", fontFamily: "inherit", opacity: (!novoNome.trim() || analisando) ? 0.5 : 1 }}
                    >
                      {analisando ? `Analisando ${analisandoIdx + 1}/${novoArquivos.length}…` : "Criar"}
                    </button>
                    <button
                      onClick={() => { setCriandoNovo(false); setNovoNome(""); setNovoArquivos([]); setErroAnalise(null); }}
                      style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "transparent", color: MUTED, border: `1px solid ${LINE}`, fontFamily: "inherit" }}
                    >
                      Cancelar
                    </button>
                    {erroAnalise && (
                      <span style={{ fontSize: 11, color: "#e55", maxWidth: 200 }}>
                        ⚠ {erroAnalise}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCriandoNovo(true)}
                  style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "transparent", color: MUTED, border: `1px dashed ${LINE}`, fontFamily: "inherit", whiteSpace: "nowrap" as const }}
                >
                  + Nova identidade
                </button>
              )}
            </div>
          </div>

          {analisando && (
            <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
              ⏳ Analisando arquivo {analisandoIdx + 1}… Claude está extraindo nome, tema e fonte.
            </p>
          )}
          {!analisando && erroAnalise && (
            <p style={{ fontSize: 12, color: "#e55", marginBottom: 16 }}>
              ⚠ {erroAnalise}
            </p>
          )}

          {perfilAtivoId == null ? (
            <p style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>Selecione uma identidade acima para editar.</p>
          ) : (
          <div key={formKey}>
          <p style={{ ...eyebrow, fontSize: 20, marginBottom: 28 }}>
            Identidade da marca
          </p>

          <Field>
            <Label>Nome da marca</Label>
            <TextInput value={marca.nomeMarca} onChange={(v) => set("nomeMarca", v)} placeholder="Ex: FAMOSO." />
          </Field>

          <Field>
            <Label>URL / site (rodapé)</Label>
            <TextInput value={marca.url} onChange={(v) => set("url", v)} placeholder="famosopedro.com.br" />
          </Field>

          <Field>
            <Label>Texto do rodapé <span style={{ textTransform: "none", fontWeight: 400, color: MUTED }}>— opcional</span></Label>
            <TextInput value={marca.rodapeTexto} onChange={(v) => set("rodapeTexto", v)} placeholder={`${marca.url || "famosopedro.com.br"}//`} />
            <p style={{ fontSize: 11, color: MUTED, margin: "6px 0 0" }}>
              Vazio = usa URL com //. Ex: <em>@famosopedro</em> ou <em>Link na bio →</em>
            </p>
          </Field>

          <Field>
            <Label>Tema padrão</Label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["dark", "Dark"], ["light", "Light"]] as const).map(([v, lbl]) => (
                <button key={v} onClick={() => set("tema", v)} style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: marca.tema === v ? FG : CARD, color: marca.tema === v ? BG : MUTED, border: `1px solid ${marca.tema === v ? FG : LINE}` }}>{lbl}</button>
              ))}
            </div>
          </Field>

          <Field>
            <Label>Cores customizadas <span style={{ textTransform: "none", fontWeight: 400, color: MUTED }}>— substituem o tema dark/light</span></Label>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {([
                ["corFundo", "Fundo"],
                ["corTexto", "Texto"],
                ["corAccent", "Destaque"],
              ] as const).map(([key, label]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: MUTED, width: 60, flexShrink: 0 }}>{label}</span>
                  <input
                    type="color"
                    value={marca[key] || (key === "corFundo" ? "#1c1c1c" : key === "corTexto" ? "#ededed" : "#ffffff")}
                    onChange={(e) => set(key, e.target.value)}
                    style={{ width: 36, height: 28, border: `1px solid ${LINE}`, borderRadius: 4, cursor: "pointer", padding: 2, background: CARD }}
                  />
                  <input
                    type="text"
                    value={marca[key] || ""}
                    onChange={(e) => { const v = e.target.value; if (!v || /^#[0-9a-fA-F]{0,6}$/.test(v)) set(key, v || undefined as unknown as string); }}
                    placeholder="ex: #1a1a2e"
                    style={{ flex: 1, background: CARD, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, color: FG, outline: "none", fontFamily: "monospace" }}
                  />
                  {marca[key] && (
                    <button onClick={() => set(key, undefined as unknown as string)} style={{ fontSize: 11, color: MUTED, background: "none", border: "none", cursor: "pointer", padding: 0 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </Field>

          <Field>
            <Label>Formato</Label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["vertical", "Vertical 4:5"], ["quadrado", "Quadrado 1:1"]] as const).map(([v, lbl]) => (
                <button key={v} onClick={() => set("formato", v)} style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: marca.formato === v ? FG : CARD, color: marca.formato === v ? BG : MUTED, border: `1px solid ${marca.formato === v ? FG : LINE}` }}>{lbl}</button>
              ))}
            </div>
          </Field>

          <Field>
            <Label>Fonte dos títulos</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[...FONTES, ...customFontes].map((f) => (
                <button
                  key={f}
                  onClick={() => set("fonte", f)}
                  style={{
                    padding: "8px 0",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: `'${f}', sans-serif`,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: marca.fonte === f ? FG : CARD,
                    color: marca.fonte === f ? BG : MUTED,
                    border: `1px solid ${marca.fonte === f ? FG : LINE}`,
                    transition: "all 0.1s",
                  }}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={() => fonteSansRef.current?.click()}
                style={{ padding: "8px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: MUTED, border: `1px dashed ${LINE}`, transition: "all 0.1s", letterSpacing: "0.04em" }}
              >
                + Subir fonte
              </button>
              <input ref={fonteSansRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{ display: "none" }} onChange={handleUploadSans} />
            </div>
          </Field>

          <Field>
            <Label>Fonte serif <span style={{ textTransform: "none", fontWeight: 400, color: MUTED }}>— subtítulo itálico</span></Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[...FONTES_SERIF, ...customFontesSerif].map((f) => (
                <button
                  key={f}
                  onClick={() => set("fonteSerif", f)}
                  style={{
                    padding: "8px 0",
                    borderRadius: 6,
                    fontSize: 12,
                    fontFamily: `'${f}', serif`,
                    fontStyle: "italic",
                    fontWeight: 500,
                    cursor: "pointer",
                    background: marca.fonteSerif === f ? FG : CARD,
                    color: marca.fonteSerif === f ? BG : MUTED,
                    border: `1px solid ${marca.fonteSerif === f ? FG : LINE}`,
                    transition: "all 0.1s",
                  }}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={() => fonteSerifRef.current?.click()}
                style={{ padding: "8px 0", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: MUTED, border: `1px dashed ${LINE}`, transition: "all 0.1s", letterSpacing: "0.04em" }}
              >
                + Subir fonte
              </button>
              <input ref={fonteSerifRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{ display: "none" }} onChange={handleUploadSerif} />
            </div>
            <p style={{ fontSize: 11, color: MUTED, margin: "8px 0 0" }}>
              Aparece no subtítulo em itálico abaixo da divisória em cada slide.
            </p>
          </Field>

          <Field>
            <Label>Tamanho das fontes <span style={{ textTransform: "none", fontWeight: 400, color: MUTED }}>— px na resolução 1080</span></Label>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const }}>
              <NumInput label="Título" value={marca.tituloTamanho} min={48} max={160} step={2} unit="px" onChange={(v) => set("tituloTamanho", v)} />
              <NumInput label="Corpo" value={marca.corpoTamanho} min={24} max={80} step={2} unit="px" onChange={(v) => set("corpoTamanho", v)} />
              <NumInput label="Serif" value={marca.serifTamanho} min={24} max={80} step={2} unit="px" onChange={(v) => set("serifTamanho", v)} />
            </div>
          </Field>

          <Field>
            <Label>Peso das fontes</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {([["tituloPeso", "Título"], ["corpoPeso", "Corpo"], ["serifPeso", "Serif"]] as [keyof BrandConfig, string][]).map(([key, lbl]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: MUTED, width: 44, flexShrink: 0 }}>{lbl}</span>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {PESOS.map((p) => (
                      <button key={p} onClick={() => set(key, p as BrandConfig[typeof key])} style={{ padding: "5px 10px", borderRadius: 4, fontSize: 11, fontWeight: p, cursor: "pointer", fontFamily: "inherit", background: marca[key] === p ? FG : CARD, color: marca[key] === p ? BG : MUTED, border: `1px solid ${marca[key] === p ? FG : LINE}` }}>{p}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          <Field>
            <Label>Espaçamento — título</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SliderField
                label="Entrelinhas"
                value={marca.tituloEntreLinhas}
                min={0.8} max={1.6} step={0.01}
                fmt={(v) => v.toFixed(2)}
                onChange={(v) => set("tituloEntreLinhas", v)}
              />
              <SliderField
                label="EntreLetras"
                value={marca.tituloEntreLetras}
                min={-0.1} max={0.1} step={0.005}
                fmt={(v) => (v >= 0 ? "+" : "") + v.toFixed(3) + "em"}
                onChange={(v) => set("tituloEntreLetras", v)}
              />
            </div>
          </Field>

          <Field>
            <Label>Espaçamento — corpo</Label>
            <SliderField
              label="Entrelinhas"
              value={marca.corpoEntreLinhas}
              min={1.0} max={2.0} step={0.05}
              fmt={(v) => v.toFixed(2)}
              onChange={(v) => set("corpoEntreLinhas", v)}
            />
          </Field>

          <Field>
            <Label>Espaçamento — subtítulo serif</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SliderField
                label="Entrelinhas"
                value={marca.serifEntreLinhas}
                min={0.9} max={2.0} step={0.05}
                fmt={(v) => v.toFixed(2)}
                onChange={(v) => set("serifEntreLinhas", v)}
              />
              <SliderField
                label="Entreletras"
                value={marca.serifEntreLetras}
                min={-0.05} max={0.1} step={0.005}
                fmt={(v) => (v >= 0 ? "+" : "") + v.toFixed(3) + "em"}
                onChange={(v) => set("serifEntreLetras", v)}
              />
            </div>
          </Field>

          <Field>
            <Label>Logo (imagem — opcional, substitui o texto)</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(marca.logos || []).map((src, i) => {
                const ativo = marca.logo === src;
                return (
                  <div key={i} style={{ position: "relative" }}>
                    <button
                      onClick={() => set("logo", src)}
                      style={{ width: "100%", height: 64, borderRadius: 6, cursor: "pointer", background: ativo ? FG : CARD, border: `1px solid ${ativo ? FG : LINE}`, display: "flex", alignItems: "center", justifyContent: "center", padding: 8, overflow: "hidden" }}
                    >
                      <img src={src} alt="" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", filter: ativo ? "invert(1)" : "none" }} />
                    </button>
                    <button
                      onClick={() => {
                        const next = (marca.logos || []).filter((_, j) => j !== i);
                        setMarca((prev) => ({ ...prev, logos: next, logo: prev.logo === src ? (next[0] || null) : prev.logo }));
                        setSaved(false);
                      }}
                      style={{ position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.7)", border: "none", color: FG, fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {(marca.logos || []).length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ height: 64, borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "transparent", color: MUTED, border: `1px dashed ${LINE}`, letterSpacing: "0.04em" }}
                >
                  + Subir logo
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleLogo} style={{ display: "none" }} />
            <p style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>PNG ou SVG com fundo transparente. Clique para ativar.</p>
          </Field>

          <button
            onClick={handleSave}
            style={{
              padding: "11px 28px",
              background: saved ? OK : FG,
              color: BG,
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
          >
            {saved ? "Salvo ✓" : "Salvar identidade"}
          </button>
          </div>
          )}
        </div>

        {/* Preview */}
        <div style={{ position: "sticky", top: 80, opacity: perfilAtivoId == null ? 0.3 : 1, pointerEvents: perfilAtivoId == null ? "none" : "auto", transition: "opacity 0.2s" }}>
          <p style={{ ...eyebrow, fontSize: 16, marginBottom: 16 }}>
            Preview
          </p>
          <SlidePreview marca={marca} />
          <p style={{ fontSize: 11, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
            Assim ficará cada slide do carrossel com a identidade configurada.
          </p>
          <button
            onClick={() => router.push("/gerar")}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "9px 0",
              background: "transparent",
              color: MUTED,
              border: `1px solid ${LINE}`,
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Ir para Gerar →
          </button>
        </div>

        </div>
      </div>
      <PromoRail />
    </div>
  );
}
