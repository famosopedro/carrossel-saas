import type { CSSProperties } from "react";

// ── Tokens de UI — referências às CSS vars para suporte a tema claro/escuro.
// Definidos em globals.css sob :root / [data-theme="light"] / @media prefers-color-scheme.
// (As cores dos SLIDES vivem em SlideRender/TEMAS e são independentes destas.)

export const BG      = "var(--bg)";
export const SURFACE = "var(--surface)";
export const CARD    = "var(--card)";
export const FG      = "var(--fg)";
export const MUTED   = "var(--muted)";
export const FAINT   = "var(--faint)";
export const LINE    = "var(--line)";
export const LINE2   = "var(--line2)";
export const ACCENT  = "var(--accent)";
export const DANGER  = "var(--danger)";
export const OK      = "var(--ok)";
// Verde da marca FAMOSO. — fill verde + tinta de contraste sobre ele.
export const BRAND       = "var(--brand)";
export const BRAND_HOVER = "var(--brand-hover)";
export const BRAND_INK   = "var(--brand-ink)";
export const SUCCESS = "var(--success)";
export const WARNING = "var(--warning)";
export const ERROR   = "var(--error)";

// Tipografia
export const SERIF = "'Awesome Serif', Georgia, serif";
export const SANS = "'Neue Haas Grotesk', system-ui, -apple-system, sans-serif";

// Espaçamento (escala 4)
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 5, md: 8, lg: 12 } as const;

// ── Estilos compartilhados ──

// Eyebrow serif-itálico — a ASSINATURA. Cabeçalho de seção, mesma voz dos slides.
export const eyebrow: CSSProperties = {
  fontFamily: SERIF, fontStyle: "italic", fontWeight: 500,
  fontSize: 16, lineHeight: 1.1, color: FG, margin: 0, letterSpacing: "0.01em",
};

// Label de campo — caixa-alta discreta (sistema de apoio)
export const label: CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: MUTED,
  letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px",
};

export const card: CSSProperties = {
  background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg,
};

export const input: CSSProperties = {
  width: "100%", background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.md,
  padding: "9px 11px", fontSize: 13, color: FG, outline: "none", fontFamily: "inherit",
  boxSizing: "border-box",
};

export function btnPrimary(disabled = false): CSSProperties {
  return {
    width: "100%", padding: "11px 0", background: disabled ? "var(--btn-disabled)" : FG,
    color: disabled ? MUTED : BG, border: "none", borderRadius: RADIUS.md,
    fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
  };
}

export const btnGhost: CSSProperties = {
  width: "100%", padding: "9px 0", background: "transparent", color: FG,
  border: `1px solid ${LINE2}`, borderRadius: RADIUS.md, fontSize: 12, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};
