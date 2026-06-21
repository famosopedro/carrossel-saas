import type React from "react";
import Link from "next/link";
import { CARD, FG, MUTED, LINE, LINE2, BRAND, BRAND_INK, SP, RADIUS, SANS, SERIF } from "@/lib/ui";

type Step = { n: number; titulo: string; texto: string };
type Props = {
  icon?: React.ReactNode;
  titulo: string;
  texto: string;
  steps?: Step[];
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
};

export default function EmptyState({ icon, titulo, texto, steps, ctaLabel, ctaHref, onCta }: Props) {
  const cta = ctaLabel && (
    ctaHref ? (
      <Link href={ctaHref} style={btnCta}>{ctaLabel}</Link>
    ) : (
      <button onClick={onCta} style={btnCta as React.CSSProperties}>{ctaLabel}</button>
    )
  );

  return (
    <div style={{
      border: `1px dashed ${LINE2}`, borderRadius: RADIUS.lg, background: CARD,
      padding: "44px 28px", textAlign: "center", display: "flex", flexDirection: "column",
      alignItems: "center", gap: SP.md, fontFamily: SANS,
    }}>
      {icon && <div style={{ color: MUTED, marginBottom: 4 }}>{icon}</div>}
      <h3 style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 22, color: FG, margin: 0 }}>{titulo}</h3>
      <p style={{ fontSize: 14, color: MUTED, margin: 0, maxWidth: 440, lineHeight: 1.5 }}>{texto}</p>

      {steps && steps.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: SP.md, justifyContent: "center", margin: "8px 0 4px", maxWidth: 620 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ flex: "1 1 160px", minWidth: 150, maxWidth: 190, textAlign: "left", border: `1px solid ${LINE}`, borderRadius: RADIUS.md, padding: SP.md, background: "var(--bg)" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: BRAND, color: BRAND_INK, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>{s.n}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: FG, marginBottom: 3 }}>{s.titulo}</div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.45 }}>{s.texto}</div>
            </div>
          ))}
        </div>
      )}

      {cta}
    </div>
  );
}

const btnCta: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4,
  padding: "11px 20px", background: BRAND, color: BRAND_INK, border: "none",
  borderRadius: RADIUS.md, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
  fontFamily: SANS, textDecoration: "none",
};
