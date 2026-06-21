import type React from "react";
import { FG, MUTED, SP, SANS, eyebrow } from "@/lib/ui";

type Props = {
  eyebrow?: string;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
};

export default function PageContainer({ eyebrow: eb, titulo, descricao, acao, maxWidth = 1080, children }: Props) {
  return (
    <div style={{ padding: "clamp(20px, 4vw, 40px)", fontFamily: SANS }}>
      <div style={{ maxWidth, margin: "0 auto" }}>
        <header className="fade-up fade-up-1" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: SP.lg, flexWrap: "wrap", marginBottom: SP.xl }}>
          <div style={{ minWidth: 0 }}>
            {eb && <p style={{ ...eyebrow, color: MUTED, marginBottom: 6 }}>{eb}</p>}
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: FG, margin: 0 }}>{titulo}</h1>
            {descricao && <p style={{ fontSize: 14, color: MUTED, margin: "8px 0 0", maxWidth: 560, lineHeight: 1.5 }}>{descricao}</p>}
          </div>
          {acao && <div style={{ flexShrink: 0 }}>{acao}</div>}
        </header>
        <div className="fade-up fade-up-2">{children}</div>
      </div>
    </div>
  );
}
