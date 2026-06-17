export type Formato = "vertical" | "quadrado";
export type Tema = "dark" | "light";
export type TextDec = "none" | "underline" | "line-through";
export type SlideLayout = "normal" | "split";

export type BrandConfig = {
  nomeMarca: string;
  url: string;
  fonte: string;
  fonteSerif: string;
  logo: string | null;
  logos: string[];
  tema: Tema;
  formato: Formato;
  // tamanhos (px na resolução 1080)
  tituloTamanho: number;
  corpoTamanho: number;
  serifTamanho: number;
  // pesos
  tituloPeso: number;
  corpoPeso: number;
  serifPeso: number;
  // espaçamento
  tituloEntreLetras: number;
  tituloEntreLinhas: number;
  corpoEntreLinhas: number;
  serifEntreLetras: number;
  serifEntreLinhas: number;
  rodapeTexto: string;
  assets: string[];
};

export type SlideTipo = "capa" | "conteudo" | "cta";

export type ImagemPos = "fundo" | "topo" | "base" | "direita";
export type Elemento = { src: string; x: number; y: number; tamanho: number; rotacao: number };

export type Slide = {
  tipo: SlideTipo;
  layout: SlideLayout;
  splitRatio: number;
  titulo: string;
  corpo: string;
  subtitulo: string;
  tema?: Tema;
  tituloDecoracao: TextDec;
  corpoDecoracao: TextDec;
  serifDecoracao: TextDec;
  imagem?: string | null;
  imagemPos?: ImagemPos;
  imagemOpacidade?: number;
  textoClaro?: boolean;
  elementos?: Elemento[];
};

export type Carrossel = {
  id: string;
  tema: string;
  slides: Slide[];
  criadoEm: number;
};

export const DEFAULT_BRAND: BrandConfig = {
  nomeMarca: "FAMOSO.",
  url: "famosopedro.com.br",
  fonte: "Neue Haas Grotesk",
  fonteSerif: "Awesome Serif",
  logo: null,
  logos: [],
  tema: "dark",
  formato: "vertical",
  tituloTamanho: 96,
  corpoTamanho: 40,
  serifTamanho: 46,
  tituloPeso: 800,
  corpoPeso: 400,
  serifPeso: 500,
  tituloEntreLetras: -0.03,
  tituloEntreLinhas: 1.02,
  corpoEntreLinhas: 1.35,
  serifEntreLetras: 0,
  serifEntreLinhas: 1.25,
  rodapeTexto: "",
  assets: [],
};

export const SLIDE_DEFAULTS: Pick<Slide, "layout" | "splitRatio" | "tituloDecoracao" | "corpoDecoracao" | "serifDecoracao" | "imagem" | "imagemPos" | "imagemOpacidade"> = {
  layout: "normal",
  splitRatio: 0.58,
  tituloDecoracao: "none",
  corpoDecoracao: "none",
  serifDecoracao: "none",
  imagem: null,
  imagemPos: "fundo",
  imagemOpacidade: 0.35,
};

export const FONTES = [
  "Neue Haas Grotesk",
  "Inter",
  "Montserrat",
  "Space Grotesk",
  "DM Sans",
  "Archivo",
];

export const FONTES_SERIF = ["Awesome Serif"];

export const PESOS = [400, 500, 600, 700, 800, 900];

export function getMarca(): BrandConfig {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  try {
    const raw = localStorage.getItem("famoso_marca");
    return raw ? { ...DEFAULT_BRAND, ...JSON.parse(raw) } : DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

export function saveMarca(config: BrandConfig): void {
  localStorage.setItem("famoso_marca", JSON.stringify(config));
}

export function getCarrosseis(): Carrossel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("famoso_carrosseis");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCarrossel(c: Carrossel): void {
  const list = getCarrosseis();
  const idx = list.findIndex((x) => x.id === c.id);
  if (idx >= 0) list[idx] = c;
  else list.unshift(c);
  localStorage.setItem("famoso_carrosseis", JSON.stringify(list.slice(0, 50)));
}

export function deleteCarrossel(id: string): void {
  const list = getCarrosseis().filter((c) => c.id !== id);
  localStorage.setItem("famoso_carrosseis", JSON.stringify(list));
}
