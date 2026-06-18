export type Formato = "vertical" | "quadrado";
export type Tema = "dark" | "light";
export type TextDec = "none" | "underline" | "line-through";
export type SlideLayout = "normal" | "split";
export type NumeracaoPosicao = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type NumeracaoEstilo = "numero" | "seta" | "nenhum";

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
  tipoPerfil?: "pessoal" | "empresa";
  idioma?: string;
  descricao?: string;
  publicoAlvo?: string;
  conteudoPublico?: string;
  estiloComunicacao?: string;
  corFundo?: string;
  corTexto?: string;
  corAccent?: string;
  coresExtras?: { nome: string; hex: string }[];
  logoTamanho?: number;
  numeracaoPosicao?: NumeracaoPosicao;
  numeracaoEstilo?: NumeracaoEstilo;
  assets: string[];
  customFonts: CustomFont[];
};

export type CustomFont = { name: string; dataUrl: string; style: "normal" | "italic" };

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
  customFonts: [],
};

export const BLANK_BRAND: BrandConfig = {
  nomeMarca: "",
  url: "",
  fonte: "",
  fonteSerif: "",
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
  customFonts: [],
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

export type BrandProfile = { id: string; nome: string; config: BrandConfig };

const FAMOSO_DEFAULT_PROFILE: BrandProfile = { id: "famoso", nome: "FAMOSO.", config: DEFAULT_BRAND };

export function getPerfis(): BrandProfile[] {
  if (typeof window === "undefined") return [FAMOSO_DEFAULT_PROFILE];
  try {
    const raw = localStorage.getItem("famoso_perfis");
    if (raw) {
      const arr = JSON.parse(raw) as BrandProfile[];
      return arr.length ? arr : [FAMOSO_DEFAULT_PROFILE];
    }
    // migrate legacy key
    const legacyRaw = localStorage.getItem("famoso_marca");
    if (legacyRaw) {
      const config = { ...DEFAULT_BRAND, ...JSON.parse(legacyRaw) };
      return [{ id: "famoso", nome: config.nomeMarca || "FAMOSO.", config }];
    }
    return [FAMOSO_DEFAULT_PROFILE];
  } catch {
    return [FAMOSO_DEFAULT_PROFILE];
  }
}

export function savePerfis(perfis: BrandProfile[]): void {
  try { localStorage.setItem("famoso_perfis", JSON.stringify(perfis)); } catch {}
}

export function getPerfilAtivoId(): string {
  if (typeof window === "undefined") return "famoso";
  return localStorage.getItem("famoso_perfil_ativo") || "famoso";
}

export function setPerfilAtivoId(id: string): void {
  try { localStorage.setItem("famoso_perfil_ativo", id); } catch {}
}

export function getMarca(): BrandConfig {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  try {
    const perfis = getPerfis();
    const id = getPerfilAtivoId();
    const perfil = perfis.find(p => p.id === id) || perfis[0];
    return perfil ? { ...DEFAULT_BRAND, ...perfil.config } : DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

// true = salvou; false = falhou (ex: quota cheia)
export function saveMarca(config: BrandConfig): boolean {
  try {
    const perfis = getPerfis();
    const id = getPerfilAtivoId();
    const idx = perfis.findIndex(p => p.id === id);
    if (idx >= 0) {
      perfis[idx] = { ...perfis[idx], nome: config.nomeMarca || perfis[idx].nome, config };
    } else {
      perfis.push({ id: id || "famoso", nome: config.nomeMarca || "Sem nome", config });
    }
    savePerfis(perfis);
    localStorage.setItem("famoso_marca", JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export function isMarcaConfigurada(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("famoso_perfis") != null || localStorage.getItem("famoso_marca") != null;
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

export function getCarrossel(id: string): Carrossel | undefined {
  return getCarrosseis().find((c) => c.id === id);
}

export function saveCarrossel(c: Carrossel): boolean {
  const list = getCarrosseis();
  const idx = list.findIndex((x) => x.id === c.id);
  if (idx >= 0) list[idx] = c;
  else list.unshift(c);
  try {
    localStorage.setItem("famoso_carrosseis", JSON.stringify(list.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

export function deleteCarrossel(id: string): void {
  const list = getCarrosseis().filter((c) => c.id !== id);
  localStorage.setItem("famoso_carrosseis", JSON.stringify(list));
}

// id do último carrossel aberto/editado — pra retomar rascunho ao voltar pro /gerar
export function getUltimoId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("famoso_ultimo_id");
}

export function setUltimoId(id: string): void {
  try { localStorage.setItem("famoso_ultimo_id", id); } catch {}
}
