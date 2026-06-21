import type React from "react";
import { CARD, FG, MUTED, LINE, BRAND, SP, RADIUS, SANS } from "@/lib/ui";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  accent?: boolean; // destaca o valor em verde da marca
};

export default function MetricCard({ label, value, hint, icon, accent }: Props) {
  return (
    <div className="lift" style={{
      background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg,
      padding: SP.lg, display: "flex", flexDirection: "column", gap: 6, minWidth: 0, fontFamily: SANS,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SP.sm }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        {icon && <span style={{ color: MUTED, display: "flex", flexShrink: 0 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: accent ? BRAND : FG, lineHeight: 1.05 }}>{value}</span>
      {hint && <span style={{ fontSize: 12, color: MUTED }}>{hint}</span>}
    </div>
  );
}
