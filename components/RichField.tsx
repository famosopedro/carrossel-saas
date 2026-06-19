import { useRef } from "react";
import { CARD, LINE, LINE2, FG, MUTED, BG } from "@/lib/ui";
import type { TextAlign } from "@/lib/storage";

// Campo de texto com toolbar de formatação acessível.
// Formatação inline (negrito/itálico/sublinhado/riscado/realce) é inserida como
// marcadores no texto e renderizada pelo RichText do slide. Alinhamento e cor
// são por-campo (atributos do slide). Fonte e tamanho seguem no painel da marca.

type MarkBtn = { id: string; label: string; pre: string; post: string; render: React.ReactNode };
const MARKS: MarkBtn[] = [
  { id: "bold", label: "Negrito", pre: "**", post: "**", render: <strong>B</strong> },
  { id: "italic", label: "Itálico", pre: "*", post: "*", render: <em>I</em> },
  { id: "underline", label: "Sublinhado", pre: "__", post: "__", render: <span style={{ textDecoration: "underline" }}>U</span> },
  { id: "strike", label: "Riscado", pre: "~~", post: "~~", render: <span style={{ textDecoration: "line-through" }}>S</span> },
  { id: "highlight", label: "Realçar", pre: "==", post: "==", render: <span style={{ background: "var(--brand)", color: "#0a0a0a", padding: "0 3px", borderRadius: 2 }}>H</span> },
];

const ALIGNS: { v: TextAlign; label: string; glyph: string }[] = [
  { v: "left", label: "Alinhar à esquerda", glyph: "⇤" },
  { v: "center", label: "Centralizar", glyph: "↔" },
  { v: "right", label: "Alinhar à direita", glyph: "⇥" },
];

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  align?: TextAlign;
  onAlign?: (a: TextAlign) => void;
  cor?: string;
  onCor?: (c: string | undefined) => void;
};

export default function RichField({ id, label, value, onChange, rows = 2, hint, align, onAlign, cor, onCor }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(pre: string, post: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart ?? value.length;
    const e = ta.selectionEnd ?? value.length;
    const sel = value.slice(s, e) || "texto";
    const next = value.slice(0, s) + pre + sel + post + value.slice(e);
    onChange(next);
    // recoloca o cursor envolvendo o texto inserido
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + pre.length, s + pre.length + sel.length);
    });
  }

  const tbBtn: React.CSSProperties = { minWidth: 28, height: 28, borderRadius: 5, background: "transparent", color: FG, border: `1px solid ${LINE}`, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" };

  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}{hint && <span style={{ textTransform: "none", color: MUTED, fontWeight: 400 }}> — {hint}</span>}
      </label>

      <div role="toolbar" aria-label={`Formatação — ${label}`} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
        {MARKS.map((m) => (
          <button key={m.id} type="button" aria-label={m.label} title={m.label} onClick={() => wrap(m.pre, m.post)} className="ed-btn" style={tbBtn}>
            {m.render}
          </button>
        ))}
        {onAlign && (
          <span style={{ display: "inline-flex", gap: 4, marginLeft: 4, paddingLeft: 8, borderLeft: `1px solid ${LINE}` }}>
            {ALIGNS.map((a) => {
              const ativo = (align ?? "left") === a.v;
              return (
                <button key={a.v} type="button" aria-label={a.label} aria-pressed={ativo} title={a.label} onClick={() => onAlign(a.v)} className="ed-btn" style={{ ...tbBtn, background: ativo ? FG : "transparent", color: ativo ? BG : FG, borderColor: ativo ? FG : LINE }}>
                  {a.glyph}
                </button>
              );
            })}
          </span>
        )}
        {onCor && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4, paddingLeft: 8, borderLeft: `1px solid ${LINE}` }}>
            <label htmlFor={`${id}-cor`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Cor do texto — {label}</label>
            <input id={`${id}-cor`} type="color" value={cor || "#ededed"} onChange={(e) => onCor(e.target.value)} title="Cor do texto" style={{ width: 28, height: 28, padding: 0, border: `1px solid ${LINE}`, borderRadius: 5, background: CARD, cursor: "pointer" }} />
            {cor && <button type="button" aria-label="Remover cor personalizada" title="Cor automática" onClick={() => onCor(undefined)} className="ed-btn" style={{ ...tbBtn, fontSize: 11 }}>auto</button>}
          </span>
        )}
      </div>

      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{ width: "100%", background: CARD, border: `1px solid ${LINE}`, borderRadius: 6, padding: "9px 11px", fontSize: 12, color: FG, resize: "vertical", outline: "none", lineHeight: 1.55, fontFamily: "inherit", boxSizing: "border-box", textAlign: align ?? "left" }}
      />
    </div>
  );
}
