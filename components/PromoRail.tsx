import { useState, useEffect, useRef } from "react";
import { SURFACE, CARD, FG, MUTED, FAINT, LINE, LINE2, ACCENT, BG } from "@/lib/ui";

type Oferta = {
  eyebrow: string;
  titulo: string;
  bullets: string[];
  preco: string;
  precoNota?: string;
  nota?: string;
  cta: string;
  href: string;
  destaque?: boolean;
};

// Dados reais — famosopedro.com.br · ordem de valor (grátis → R$97 → R$697)
const OFERTAS: Oferta[] = [
  {
    eyebrow: "Diagnóstico gratuito",
    titulo: "Descubra onde sua marca perde dinheiro",
    bullets: [
      "Percepção de valor auditada",
      "As 3 prioridades da sua marca",
      "Resultado na hora · 3 minutos",
    ],
    preco: "Grátis",
    cta: "Fazer diagnóstico grátis",
    href: "https://www.famosopedro.com.br/diagnostico",
  },
  {
    eyebrow: "Agente FAMOSO.®",
    titulo: "Seu estrategista de marca 24/7",
    bullets: [
      "Treinado no método FAMOSO.®",
      "Posicionamento, identidade e preço",
      "Acesso permanente · resposta na hora",
    ],
    preco: "R$ 97",
    precoNota: "acesso vitalício",
    cta: "Destravar o Agente",
    href: "https://pay.kiwify.com.br/8K0uRhK",
  },
  {
    eyebrow: "Diagnóstico FAMOSO.®",
    titulo: "Pare de ser comparado por preço",
    bullets: [
      "Auditoria conduzida em 5 blocos",
      "Apresentação executiva de 25 páginas",
      "Call estratégica de 30 min com Pedro",
    ],
    preco: "R$ 697",
    precoNota: "valor volta abatido no projeto",
    nota: "Primeira turma · 10 vagas/mês",
    cta: "Garantir minha vaga",
    href: "https://pay.kiwify.com.br/VeGCIOz",
    destaque: true,
  },
];

const INTERVALO = 5000;

export default function PromoRail() {
  const [idx, setIdx] = useState(0);
  const pausado = useRef(false);

  useEffect(() => {
    const reduz = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return;
    const t = setInterval(() => {
      if (!pausado.current) setIdx((i) => (i + 1) % OFERTAS.length);
    }, INTERVALO);
    return () => clearInterval(t);
  }, []);

  const o = OFERTAS[idx];

  return (
    <aside
      className="promo-rail"
      style={{ width: 320, flexShrink: 0, borderLeft: `1px solid ${LINE}`, background: SURFACE, height: "100%", padding: "24px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}
      onMouseEnter={() => { pausado.current = true; }}
      onMouseLeave={() => { pausado.current = false; }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color: FG, margin: "0 0 14px", letterSpacing: "-0.01em" }}>
        Como o FAMOSO<span style={{ color: ACCENT, fontSize: 11, verticalAlign: "super" }}>®</span> me ajuda
      </p>

      <div style={{ position: "relative", flex: 1, minHeight: 0, background: CARD, border: `1px solid ${o.destaque ? LINE2 : LINE}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {o.destaque && <div style={{ height: 3, background: ACCENT, flexShrink: 0 }} />}

        <div key={idx} className="promo-fade" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "26px 22px 28px" }}>
          {/* topo: eyebrow + título + bullets */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, margin: "0 0 12px" }}>
              {o.eyebrow}
            </p>
            <h3 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: FG, margin: "0 0 20px" }}>
              {o.titulo}
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {o.bullets.map((b, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.4, color: MUTED }}>
                  <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* base: preço + CTA + assinatura */}
          <div style={{ marginTop: 28 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: FG, lineHeight: 1 }}>{o.preco}</div>
              {o.precoNota && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{o.precoNota}</div>}
              {o.nota && <div style={{ fontSize: 11, color: FAINT, marginTop: 6 }}>{o.nota}</div>}
            </div>

            <a
              href={o.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", textAlign: "center", textDecoration: "none",
                padding: "12px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: "#25D366", color: "#1c1c1c", fontFamily: "inherit",
              }}
            >
              {o.cta} ↗
            </a>

            <p style={{ fontSize: 11, color: FAINT, textAlign: "center", margin: "18px 0 0", lineHeight: 1.5 }}>
              Marca desalinhada derruba percepção.<br />Percepção baixa pressiona preço.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
