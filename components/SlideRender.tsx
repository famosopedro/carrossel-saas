import { forwardRef } from "react";
import type { BrandConfig, Slide, Tema, Elemento } from "@/lib/storage";

export const DIM = {
  vertical: { w: 1080, h: 1350 },
  quadrado: { w: 1080, h: 1080 },
};

const TEMAS: Record<Tema, { bg: string; bgGrad: string; fg: string; line: string; sub: string }> = {
  dark: {
    bg: "#1c1c1c",
    bgGrad: "radial-gradient(120% 80% at 30% 20%, #262626 0%, #1c1c1c 55%, #161616 100%)",
    fg: "#ededed",
    line: "rgba(237,237,237,0.35)",
    sub: "#cfcfcf",
  },
  light: {
    bg: "#e6e7ea",
    bgGrad: "radial-gradient(120% 90% at 70% 10%, #f3f4f6 0%, #e2e4e8 55%, #d3d6db 100%)",
    fg: "#121212",
    line: "rgba(18,18,18,0.3)",
    sub: "#2a2a2a",
  },
};

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Renderiza texto com **bold**, __underline__, e ~~strikethrough~~
function RichText({ text, baseStyle }: { text: string; baseStyle: React.CSSProperties }) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} style={{ fontWeight: 800 }}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("__") && p.endsWith("__"))
          return <span key={i} style={{ textDecoration: "underline" }}>{p.slice(2, -2)}</span>;
        if (p.startsWith("~~") && p.endsWith("~~"))
          return <span key={i} style={{ textDecoration: "line-through" }}>{p.slice(2, -2)}</span>;
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

function Footer({ temaRodape, slide, marca, fontSerif, corTexto, index }: { temaRodape: TemaT; slide: Slide; marca: BrandConfig; fontSerif: string; corTexto: string; index: number }) {
  const cor = slide.textoClaro != null ? corTexto : temaRodape.fg;
  return (
    <div style={{ position: "absolute", left: 96, right: 96, bottom: 80, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontFamily: fontSerif, fontStyle: "italic", fontSize: 32, color: cor, opacity: 0.85 }}>
        {marca.rodapeTexto || `${marca.url}//`}
      </span>
      <span style={{ width: 54, height: 54, borderRadius: "50%", border: `2px solid ${cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 600, color: cor }}>
        {index + 1}
      </span>
    </div>
  );
}

type Props = { slide: Slide; index: number; total: number; marca: BrandConfig };

const SlideRender = forwardRef<HTMLDivElement, Props>(function SlideRender(
  { slide, index, total, marca },
  ref
) {
  const dim = DIM[marca.formato] || DIM.vertical;
  const isSplit = slide.layout === "split";
  const ratio = slide.splitRatio ?? 0.58;
  const temaBase = TEMAS[slide.tema || marca.tema];
  const temaPrincipal = {
    ...temaBase,
    ...(marca.corFundo ? { bg: marca.corFundo, bgGrad: marca.corFundo } : {}),
    ...(marca.corTexto ? { fg: marca.corTexto, sub: marca.corTexto, line: marca.corTexto + "55" } : {}),
  };
  const corTexto = slide.textoClaro != null ? (slide.textoClaro ? TEMAS.dark.fg : TEMAS.light.fg) : temaPrincipal.fg;
  const corSub   = slide.textoClaro != null ? (slide.textoClaro ? TEMAS.dark.sub : TEMAS.light.sub) : temaPrincipal.sub;
  // split: topo sempre dark, base sempre light
  const temaTop = isSplit ? TEMAS["dark"] : temaPrincipal;
  const temaBot = isSplit ? TEMAS["light"] : temaPrincipal;

  const fontSans = `'${marca.fonte}', sans-serif`;
  const fontSerif = `'${marca.fonteSerif}', serif`;

  const topH = Math.round(dim.h * ratio);
  const botH = dim.h - topH;

  if (isSplit) {
    return (
      <div ref={ref} style={{ width: dim.w, height: dim.h, position: "relative", overflow: "hidden", fontFamily: fontSans, boxSizing: "border-box" }}>
        {/* topo dark */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: topH, background: temaTop.bgGrad || temaTop.bg, overflow: "hidden" }}>
          <div style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px", position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: 96, right: 96, top: 100, display: "flex", flexDirection: "column" }}>
            <h1 style={{ color: temaTop.fg, fontSize: marca.tituloTamanho, fontWeight: marca.tituloPeso, lineHeight: marca.tituloEntreLinhas, letterSpacing: `${marca.tituloEntreLetras}em`, margin: 0, textDecoration: slide.tituloDecoracao !== "none" ? slide.tituloDecoracao : undefined }}>
              <RichText text={slide.titulo} baseStyle={{}} />
            </h1>
            {slide.corpo && (
              <p style={{ color: temaTop.fg, fontSize: marca.corpoTamanho, lineHeight: marca.corpoEntreLinhas, fontWeight: marca.corpoPeso, margin: "40px 0 0", whiteSpace: "pre-line", textDecoration: slide.corpoDecoracao !== "none" ? slide.corpoDecoracao : undefined }}>
                <RichText text={slide.corpo} baseStyle={{}} />
              </p>
            )}
          </div>
        </div>

        {/* base light */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: botH, background: temaBot.bgGrad || temaBot.bg, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 96, right: 96, top: 60, display: "flex", flexDirection: "column" }}>
            {slide.subtitulo && (
              <p style={{ color: temaBot.sub, fontFamily: fontSerif, fontStyle: "italic", fontSize: marca.serifTamanho, lineHeight: marca.serifEntreLinhas, letterSpacing: `${marca.serifEntreLetras}em`, fontWeight: marca.serifPeso, margin: 0, textDecoration: slide.serifDecoracao !== "none" ? slide.serifDecoracao : undefined }}>
                <RichText text={slide.subtitulo} baseStyle={{}} />
              </p>
            )}
          </div>
          <Footer temaRodape={temaBot} slide={slide} marca={marca} fontSerif={fontSerif} corTexto={corTexto} index={index} />
        </div>
      </div>
    );
  }

  const imgPos = slide.imagemPos ?? "fundo";
  const imgOp = slide.imagemOpacidade ?? 0.35;
  const imgStyle: Record<string, React.CSSProperties> = {
    fundo: { position: "absolute", inset: 0, objectFit: "cover" as const, width: "100%", height: "100%", opacity: imgOp },
    topo:  { position: "absolute", top: 0, left: 0, right: 0, height: "50%", objectFit: "cover" as const, width: "100%", opacity: imgOp },
    base:  { position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", objectFit: "cover" as const, width: "100%", opacity: imgOp },
    direita: { position: "absolute", top: 0, right: 0, bottom: 0, width: "45%", objectFit: "cover" as const, height: "100%", opacity: imgOp },
  };

  // layout normal
  return (
    <div ref={ref} style={{ width: dim.w, height: dim.h, background: temaPrincipal.bgGrad || temaPrincipal.bg, position: "relative", overflow: "hidden", fontFamily: fontSans, boxSizing: "border-box" }}>
      <div style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px", position: "absolute", inset: 0, opacity: temaPrincipal === TEMAS.light ? 0.04 : 0.06, mixBlendMode: "overlay", pointerEvents: "none" }} />
      {slide.imagem && <img src={slide.imagem} alt="" style={imgStyle[imgPos]} />}
      {(slide.elementos ?? []).map((el, i) => (
        <img key={i} src={el.src} alt="" style={{ position: "absolute", left: `${el.x}%`, top: `${el.y}%`, width: el.tamanho, transform: `translate(-50%, -50%) rotate(${el.rotacao}deg)`, objectFit: "contain", pointerEvents: "none" }} />
      ))}

      <div style={{
        position: "absolute",
        left: 96,
        right: imgPos === "direita" && slide.imagem ? dim.w * 0.48 : 96,
        top: imgPos === "topo" && slide.imagem ? dim.h * 0.52 : 96,
        bottom: imgPos === "base" && slide.imagem ? dim.h * 0.52 : undefined,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ lineHeight: 0, marginBottom: slide.tipo === "capa" ? 208 : 128 }}>
          <Logo size={slide.tipo === "capa" ? 76 : 52} color={corTexto} marca={marca} fontSans={fontSans} />
        </div>
        <h1 style={{ color: corTexto, fontSize: marca.tituloTamanho, fontWeight: marca.tituloPeso, lineHeight: marca.tituloEntreLinhas, letterSpacing: `${marca.tituloEntreLetras}em`, margin: 0, textDecoration: slide.tituloDecoracao !== "none" ? slide.tituloDecoracao : undefined }}>
          <RichText text={slide.titulo} baseStyle={{}} />
        </h1>

        {slide.corpo && (
          <p style={{ color: corTexto, fontSize: marca.corpoTamanho, lineHeight: marca.corpoEntreLinhas, fontWeight: marca.corpoPeso, margin: "40px 0 0", whiteSpace: "pre-line", textDecoration: slide.corpoDecoracao !== "none" ? slide.corpoDecoracao : undefined }}>
            <RichText text={slide.corpo} baseStyle={{}} />
          </p>
        )}

        {slide.subtitulo && (
          <>
            <div style={{ height: 1, background: corTexto, opacity: 0.3, margin: "48px 0", width: "78%" }} />
            <p style={{ color: corSub, fontFamily: fontSerif, fontStyle: "italic", fontSize: marca.serifTamanho, lineHeight: marca.serifEntreLinhas, letterSpacing: `${marca.serifEntreLetras}em`, fontWeight: marca.serifPeso, margin: 0, textDecoration: slide.serifDecoracao !== "none" ? slide.serifDecoracao : undefined }}>
              <RichText text={slide.subtitulo} baseStyle={{}} />
            </p>
          </>
        )}
      </div>

      <Footer temaRodape={temaPrincipal} slide={slide} marca={marca} fontSerif={fontSerif} corTexto={corTexto} index={index} />
    </div>
  );
});

export default SlideRender;
