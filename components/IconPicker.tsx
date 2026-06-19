import { useState, useRef, useEffect } from "react";
import { ICONES, getIcone } from "@/lib/icons";
import { CARD, LINE, LINE2, FG, MUTED, BG, BRAND } from "@/lib/ui";

// Seletor de ícone acessível: botão que abre uma grade de opções.
// Cada opção é um <button> com aria-label = nome do ícone; Esc fecha.
export default function IconPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const atual = getIcone(value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={wrap} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label={`Ícone: ${atual.label}. Trocar`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="ed-btn"
        style={{ width: 40, height: 40, borderRadius: 8, background: CARD, border: `1px solid ${LINE2}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={atual.path} />
        </svg>
      </button>
      {open && (
        <div role="listbox" aria-label="Escolher ícone" style={{ position: "absolute", top: 46, left: 0, zIndex: 30, background: BG, border: `1px solid ${LINE2}`, borderRadius: 10, padding: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, width: 200, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
          {ICONES.map((ic) => {
            const ativo = ic.id === value;
            return (
              <button
                key={ic.id}
                type="button"
                role="option"
                aria-selected={ativo}
                aria-label={ic.label}
                title={ic.label}
                onClick={() => { onChange(ic.id); setOpen(false); }}
                className="ed-btn"
                style={{ width: 40, height: 40, borderRadius: 8, background: ativo ? FG : "transparent", border: `1px solid ${ativo ? FG : LINE}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={ativo ? BG : FG} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={ic.path} />
                </svg>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
