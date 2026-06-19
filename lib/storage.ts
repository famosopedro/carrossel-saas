export type Formato = "vertical" | "quadrado";
export type Tema = "dark" | "light";
export type TextDec = "none" | "underline" | "line-through";
export type TextAlign = "left" | "center" | "right";
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

// As 6 estruturas-alvo do editor. `variante` é o eixo primário; `tipo`/`layout`
// continuam por compatibilidade com carrosséis antigos (migração os preenche).
export type SlideVariante =
  | "capa-imagem"      // 1. imagem de fundo (capa de impacto)
  | "tipografia"       // 2. só texto
  | "lista-icones"     // 3. lista com ícones em chip
  | "imagem-destaque"  // 4. imagem no topo + texto
  | "chat"             // 5. balões de conversa
  | "cta";             // 6. chamada final

export const VARIANTES: { v: SlideVariante; label: string }[] = [
  { v: "capa-imagem", label: "Capa" },
  { v: "tipografia", label: "Texto" },
  { v: "lista-icones", label: "Lista" },
  { v: "imagem-destaque", label: "Imagem" },
  { v: "chat", label: "Chat" },
  { v: "cta", label: "CTA" },
];

export type ListaItem = { icone: string; texto: string };
export type ChatMsg = { lado: "esq" | "dir"; autor: string; texto: string };

export type ImagemPos = "fundo" | "topo" | "base" | "direita";
export type Elemento = { src: string; x: number; y: number; tamanho: number; rotacao: number };

export type Slide = {
  tipo: SlideTipo;
  layout: SlideLayout;
  variante?: SlideVariante; // opcional p/ back-compat; migrarSlide preenche
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
  imagemAlt?: string;       // alt editável da imagem (a11y)
  textoClaro?: boolean;
  elementos?: Elemento[];
  itens?: ListaItem[];      // variante lista-icones
  mensagens?: ChatMsg[];    // variante chat
  // Formatação por campo (setada pela toolbar de rich text — 3.3)
  tituloAlign?: TextAlign;
  corpoAlign?: TextAlign;
  subtituloAlign?: TextAlign;
  tituloCor?: string;
  corpoCor?: string;
  subtituloCor?: string;
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

// ── Variantes: derivação (migração) + criação de slide novo ──

// Infere a variante de um slide antigo (sem campo `variante`) a partir
// de tipo/imagem/posição. Não destrói nada — só rotula.
export function deriveVariante(s: Slide): SlideVariante {
  if (s.variante && VARIANTES.some((x) => x.v === s.variante)) return s.variante;
  if (s.tipo === "cta") return "cta";
  if (s.imagem) return s.imagemPos === "topo" || s.imagemPos === "base" ? "imagem-destaque" : "capa-imagem";
  return "tipografia";
}

// Garante que um slide tem todos os campos das variantes (idempotente).
export function migrarSlide(s: Slide): Slide {
  return {
    ...SLIDE_DEFAULTS,
    ...s,
    variante: deriveVariante(s),
    itens: s.itens ?? [],
    mensagens: s.mensagens ?? [],
  };
}

// Cria um slide novo já no formato de uma variante, com conteúdo de exemplo.
export function novoSlide(variante: SlideVariante): Slide {
  const base: Slide = {
    tipo: variante === "cta" ? "cta" : variante === "capa-imagem" ? "capa" : "conteudo",
    variante,
    titulo: "Novo slide",
    corpo: "",
    subtitulo: "",
    itens: [],
    mensagens: [],
    ...SLIDE_DEFAULTS,
  };
  switch (variante) {
    case "capa-imagem":
      return { ...base, titulo: "Título de impacto", corpo: "Subtexto da capa", imagemPos: "fundo", imagemOpacidade: 0.5 };
    case "tipografia":
      return { ...base, titulo: "Uma ideia forte", corpo: "Desenvolva o raciocínio aqui em um parágrafo confortável de ler." };
    case "lista-icones":
      return { ...base, titulo: "Pontos-chave", itens: [{ icone: "check", texto: "Primeiro ponto" }, { icone: "star", texto: "Segundo ponto" }, { icone: "bolt", texto: "Terceiro ponto" }] };
    case "imagem-destaque":
      return { ...base, titulo: "Com imagem", corpo: "Texto que explica a imagem acima.", imagemPos: "topo", imagemOpacidade: 1 };
    case "chat":
      return { ...base, titulo: "A conversa", mensagens: [{ lado: "esq", autor: "Paciente", texto: "Tenho uma dúvida…" }, { lado: "dir", autor: "Você", texto: "Pode perguntar!" }] };
    case "cta":
      return { ...base, titulo: "Vamos conversar?", subtitulo: "Chame no link da bio." };
  }
}

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
    const list: Carrossel[] = raw ? JSON.parse(raw) : [];
    // migra slides antigos para o formato de variantes (idempotente)
    return list.map((c) => ({ ...c, slides: (c.slides || []).map(migrarSlide) }));
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
