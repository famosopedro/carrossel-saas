import { forwardRef } from "react";
import type { BrandConfig, Slide, Tema, SlideVariante, TextAlign } from "@/lib/storage";
import { deriveVariante } from "@/lib/storage";
import { getIcone } from "@/lib/icons";

export const DIM = {
  vertical: { w: 1080, h: 1350 },
  quadrado: { w: 1080, h: 1080 },
};

// Cores literais (não CSS vars): os slides são exportados via html-to-image,
// que não resolve variáveis herdadas. `accent` = verde da marca FAMOSO.
// Dark usa o verde claro; light, o verde escuro derivado (#25d366 falha
// contraste em fundo claro). `accentInk` = tinta legível sobre o accent.
const TEMAS: Record<Tema, { bg: string; bgGrad: string; fg: string; line: string; sub: string; accent: string; accentInk: string }> = {
  dark: {
    bg: "#1c1c1c",
    bgGrad: "radial-gradient(120% 80% at 30% 20%, #262626 0%, #1c1c1c 55%, #161616 100%)",
    fg: "#ededed",
    line: "rgba(237,237,237,0.35)",
    sub: "#cfcfcf",
    accent: "#25d366",
    accentInk: "#0a0a0a",
  },
  light: {
    bg: "#e6e7ea",
    bgGrad: "radial-gradient(120% 90% at 70% 10%, #f3f4f6 0%, #e2e4e8 55%, #d3d6db 100%)",
    fg: "#121212",
    line: "rgba(18,18,18,0.3)",
    sub: "#2a2a2a",
    accent: "#1a7f43",
    accentInk: "#ffffff",
  },
};

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const PAD = 96;

// Renderiza texto com **bold**, *itálico*, __underline__, ~~riscado~~, ==realce==.
function RichText({ text, accent }: { text: string; accent: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|__[^_]+__|~~[^~]+~~|==[^=]+==)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} style={{ fontWeight: 800 }}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("==") && p.endsWith("=="))
          return <span key={i} style={{ background: accent, color: "#0a0a0a", padding: "0 0.12em", borderRadius: "0.08em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{p.slice(2, -2)}</span>;
        if (p.startsWith("__") && p.endsWith("__"))
          return <span key={i} style={{ textDecoration: "underline" }}>{p.slice(2, -2)}</span>;
        if (p.startsWith("~~") && p.endsWith("~~"))
          return <span key={i} style={{ textDecoration: "line-through" }}>{p.slice(2, -2)}</span>;
        if (p.startsWith("*") && p.endsWith("*"))
          return <em key={i} style={{ fontStyle: "italic" }}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

type TemaT = (typeof TEMAS)[Tema];

function Logo({ size, color, marca, fontSans }: { size: number; color: string; marca: BrandConfig; fontSans: string }) {
  const escala = (marca.logoTamanho ?? 100) / 100;
  return marca.logo ? (
    <img src={marca.logo} alt="" style={{ height: size * 1.1 * escala, objectFit: "contain", display: "block" }} />
  ) : (
    <span style={{ fontFamily: fontSans, fontWeight: 800, fontSize: size, letterSpacing: "-0.03em", color, lineHeight: 0.92 }}>
      {marca.nomeMarca}
    </span>
  );
}

// Traço verde recorrente — motivo da marca. No topo das variantes de texto.
function Traco({ accent }: { accent: string }) {
  return <div style={{ width: 72, height: 6, borderRadius: 3, background: accent, marginBottom: 40 }} />;
}

// Numeração de página (círculo/seta) — canto superior direito, fora do rodapé.
function Numeracao({ marca, cor, index }: { marca: BrandConfig; cor: string; index: number }) {
  const estilo = marca.numeracaoEstilo ?? "numero";
  if (estilo === "nenhum") return null;
  return (
    <div style={{ position: "absolute", top: PAD, right: PAD, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {estilo === "seta" ? (
        <span style={{ fontSize: 52, color: cor, lineHeight: 1, opacity: 0.85 }}>→</span>
      ) : (
        <span style={{ width: 54, height: 54, borderRadius: "50%", border: `2px solid ${cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 600, color: cor }}>
          {index + 1}
        </span>
      )}
    </div>
  );
}

// Rodapé comum: divisor fino + @handle (esq) + nome da marca (dir).
function Rodape({ marca, cor, fontSans }: { marca: BrandConfig; cor: string; fontSans: string }) {
  const handle = marca.rodapeTexto || marca.url || "";
  return (
    <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 72 }}>
      <div style={{ height: 1, background: cor, opacity: 0.25, marginBottom: 22 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: fontSans }}>
        <span style={{ fontSize: 30, color: cor, opacity: 0.9 }}>{handle}</span>
        <span style={{ fontSize: 30, fontWeight: 700, color: cor, letterSpacing: "-0.01em" }}>{marca.nomeMarca}</span>
      </div>
    </div>
  );
}

type Props = { slide: Slide; index: number; total: number; marca: BrandConfig };

const SlideRender = forwardRef<HTMLDivElement, Props>(function SlideRender(
  { slide, index, total, marca },
  ref
) {
  const dim = DIM[marca.formato] || DIM.vertical;
  const temaBase = TEMAS[slide.tema || marca.tema];
  const usaMarcaCores = !slide.tema;
  const tema: TemaT = {
    ...temaBase,
    ...(usaMarcaCores && marca.corFundo ? { bg: marca.corFundo, bgGrad: marca.corFundo } : {}),
    ...(usaMarcaCores && marca.corTexto ? { fg: marca.corTexto, sub: marca.corTexto } : {}),
    ...(usaMarcaCores && marca.corAccent ? { accent: marca.corAccent } : {}),
  };

  const fontSans = `'${marca.fonte}', sans-serif`;
  const fontSerif = `'${marca.fonteSerif}', serif`;
  const variante: SlideVariante = deriveVariante(slide);

  const tituloStyle = (cor: string): React.CSSProperties => ({
    color: slide.tituloCor || cor,
    fontSize: marca.tituloTamanho,
    fontWeight: marca.tituloPeso,
    lineHeight: marca.tituloEntreLinhas,
    letterSpacing: `${marca.tituloEntreLetras}em`,
    margin: 0,
    textAlign: (slide.tituloAlign ?? "left") as TextAlign,
    textDecoration: slide.tituloDecoracao !== "none" ? slide.tituloDecoracao : undefined,
  });
  const corpoStyle = (cor: string): React.CSSProperties => ({
    color: slide.corpoCor || cor,
    fontSize: marca.corpoTamanho,
    lineHeight: marca.corpoEntreLinhas,
    fontWeight: marca.corpoPeso,
    margin: "40px 0 0",
    whiteSpace: "pre-line",
    textAlign: (slide.corpoAlign ?? "left") as TextAlign,
    textDecoration: slide.corpoDecoracao !== "none" ? slide.corpoDecoracao : undefined,
  });

  const shell = (children: React.ReactNode, bg?: string): React.ReactElement => (
    <div ref={ref} style={{ width: dim.w, height: dim.h, background: bg ?? (tema.bgGrad || tema.bg), position: "relative", overflow: "hidden", fontFamily: fontSans, boxSizing: "border-box" }}>
      <div style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px", position: "absolute", inset: 0, opacity: tema === TEMAS.light ? 0.04 : 0.06, mixBlendMode: "overlay", pointerEvents: "none" }} />
      {children}
    </div>
  );

  // ── 1. CAPA COM IMAGEM ──────────────────────────────────────────────
  if (variante === "capa-imagem") {
    const op = slide.imagemOpacidade ?? 1;
    return shell(
      <>
        {slide.imagem && <img src={slide.imagem} alt={slide.imagemAlt || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: op }} />}
        {/* Overlay adaptativo: garante legibilidade sobre qualquer imagem */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 32%, rgba(0,0,0,0.12) 58%, rgba(0,0,0,0.5) 100%)" }} />
        <div style={{ position: "absolute", top: PAD, left: PAD }}>
          <Logo size={76} color="#ffffff" marca={marca} fontSans={fontSans} />
        </div>
        <Numeracao marca={marca} cor="#ffffff" index={index} />
        <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 200 }}>
          <h1 style={tituloStyle("#ffffff")}><RichText text={slide.titulo} accent={tema.accent} /></h1>
          {slide.corpo && <p style={corpoStyle("rgba(255,255,255,0.9)")}><RichText text={slide.corpo} accent={tema.accent} /></p>}
        </div>
        <Rodape marca={marca} cor="#ffffff" fontSans={fontSans} />
      </>,
    );
  }

  // ── 2. TIPOGRAFIA ───────────────────────────────────────────────────
  if (variante === "tipografia") {
    return shell(
      <>
        <Numeracao marca={marca} cor={tema.fg} index={index} />
        <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD, bottom: 200, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Traco accent={tema.accent} />
          <h1 style={{ ...tituloStyle(tema.fg), maxWidth: "92%" }}><RichText text={slide.titulo} accent={tema.accent} /></h1>
          {slide.corpo && <p style={{ ...corpoStyle(tema.sub), maxWidth: "82%" }}><RichText text={slide.corpo} accent={tema.accent} /></p>}
          {slide.subtitulo && (
            <p style={{ color: slide.subtituloCor || tema.sub, fontFamily: fontSerif, fontStyle: "italic", fontSize: marca.serifTamanho, lineHeight: marca.serifEntreLinhas, fontWeight: marca.serifPeso, margin: "40px 0 0", maxWidth: "82%" }}>
              <RichText text={slide.subtitulo} accent={tema.accent} />
            </p>
          )}
        </div>
        <Rodape marca={marca} cor={tema.fg} fontSans={fontSans} />
      </>,
    );
  }

  // ── 3. LISTA COM ÍCONES ─────────────────────────────────────────────
  if (variante === "lista-icones") {
    const itens = slide.itens ?? [];
    const n = Math.max(itens.length, 1);
    const chip = n > 5 ? 78 : 92;     // encolhe quando há muitos itens
    const gap = n > 5 ? 22 : 34;
    return shell(
      <>
        <Numeracao marca={marca} cor={tema.fg} index={index} />
        <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD, bottom: 200, display: "flex", flexDirection: "column" }}>
          <Traco accent={tema.accent} />
          <h1 style={{ ...tituloStyle(tema.fg), marginBottom: 56 }}><RichText text={slide.titulo} accent={tema.accent} /></h1>
          <div style={{ display: "flex", flexDirection: "column", gap, justifyContent: "center", flex: 1 }}>
            {itens.map((it, i) => {
              const ic = getIcone(it.icone);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 28 }}>
                  <div style={{ width: chip, height: chip, borderRadius: chip * 0.26, background: tema.accent + "26", border: `2px solid ${tema.accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width={chip * 0.5} height={chip * 0.5} viewBox="0 0 24 24" fill="none" stroke={tema.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={ic.path} />
                    </svg>
                  </div>
                  <span style={{ color: tema.fg, fontSize: Math.min(marca.corpoTamanho, chip * 0.5), lineHeight: 1.25, fontWeight: marca.corpoPeso }}>
                    <RichText text={it.texto} accent={tema.accent} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <Rodape marca={marca} cor={tema.fg} fontSans={fontSans} />
      </>,
    );
  }

  // ── 4. IMAGEM EM DESTAQUE ───────────────────────────────────────────
  if (variante === "imagem-destaque") {
    return shell(
      <>
        <Numeracao marca={marca} cor={tema.fg} index={index} />
        <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD, bottom: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ width: "100%", height: 560, borderRadius: 28, overflow: "hidden", background: tema.accent + "1a", flexShrink: 0, marginBottom: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {slide.imagem ? (
              <img src={slide.imagem} alt={slide.imagemAlt || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: tema.sub, fontSize: 28, opacity: 0.6 }}>Adicione uma imagem</span>
            )}
          </div>
          <h1 style={tituloStyle(tema.fg)}><RichText text={slide.titulo} accent={tema.accent} /></h1>
          {slide.corpo && <p style={corpoStyle(tema.sub)}><RichText text={slide.corpo} accent={tema.accent} /></p>}
        </div>
        <Rodape marca={marca} cor={tema.fg} fontSans={fontSans} />
      </>,
    );
  }

  // ── 5. CHAT ─────────────────────────────────────────────────────────
  if (variante === "chat") {
    const msgs = slide.mensagens ?? [];
    return shell(
      <>
        <Numeracao marca={marca} cor={tema.fg} index={index} />
        <div style={{ position: "absolute", left: PAD, right: PAD, top: PAD, bottom: 200, display: "flex", flexDirection: "column" }}>
          <Traco accent={tema.accent} />
          <h1 style={{ ...tituloStyle(tema.fg), marginBottom: 48 }}><RichText text={slide.titulo} accent={tema.accent} /></h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 28, justifyContent: "center", flex: 1 }}>
            {msgs.map((m, i) => {
              const dir = m.lado === "dir";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: dir ? "flex-end" : "flex-start", maxWidth: "100%" }}>
                  {m.autor && <span style={{ fontSize: 22, color: tema.sub, opacity: 0.8, margin: dir ? "0 12px 8px 0" : "0 0 8px 12px" }}>{m.autor}</span>}
                  <div style={{ maxWidth: "78%", padding: "26px 32px", borderRadius: 32, fontSize: Math.min(marca.corpoTamanho, 40), lineHeight: 1.3, ...(dir ? { background: tema.accent, color: tema.accentInk, borderBottomRightRadius: 8 } : { background: "#f0f0f0", color: "#1c1c1c", borderBottomLeftRadius: 8 }) }}>
                    <RichText text={m.texto} accent={tema.accent} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Rodape marca={marca} cor={tema.fg} fontSans={fontSans} />
      </>,
    );
  }

  // ── 6. CTA ──────────────────────────────────────────────────────────
  const handle = marca.rodapeTexto || marca.url || "";
  return shell(
    <>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `${PAD}px`, textAlign: "center" }}>
        <div style={{ marginBottom: 80, lineHeight: 0 }}>
          <Logo size={104} color={tema.fg} marca={marca} fontSans={fontSans} />
        </div>
        <h1 style={{ ...tituloStyle(tema.fg), textAlign: "center", maxWidth: "90%" }}><RichText text={slide.titulo} accent={tema.accent} /></h1>
        {slide.subtitulo && (
          <p style={{ color: slide.subtituloCor || tema.sub, fontFamily: fontSerif, fontStyle: "italic", fontSize: marca.serifTamanho, lineHeight: marca.serifEntreLinhas, fontWeight: marca.serifPeso, margin: "36px 0 0", maxWidth: "80%", textAlign: "center" }}>
            <RichText text={slide.subtitulo} accent={tema.accent} />
          </p>
        )}
        <div style={{ width: 120, height: 6, borderRadius: 3, background: tema.accent, margin: "56px 0 36px" }} />
        <span style={{ fontSize: 34, fontWeight: 700, color: tema.fg }}>{handle}</span>
      </div>
    </>,
  );
});

export default SlideRender;
