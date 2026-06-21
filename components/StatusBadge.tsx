import type { AgendamentoStatus } from "@/lib/storage";
import { SANS } from "@/lib/ui";

const MAP: Record<AgendamentoStatus, { label: string; fg: string; bg: string }> = {
  rascunho:  { label: "Rascunho",  fg: "var(--muted)",   bg: "rgba(237,237,237,0.08)" },
  agendado:  { label: "Agendado",  fg: "var(--warning)", bg: "rgba(224,169,59,0.14)" },
  publicado: { label: "Publicado", fg: "var(--brand)",   bg: "rgba(37,211,102,0.14)" },
  erro:      { label: "Erro",      fg: "var(--danger)",  bg: "rgba(220,80,80,0.14)" },
};

export default function StatusBadge({ status }: { status: AgendamentoStatus }) {
  const s = MAP[status];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS,
      fontSize: 11.5, fontWeight: 600, color: s.fg, background: s.bg,
      padding: "3px 9px", borderRadius: 999, lineHeight: 1.4, whiteSpace: "nowrap",
    }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: s.fg }} />
      {s.label}
    </span>
  );
}
