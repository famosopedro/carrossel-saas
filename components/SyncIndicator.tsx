import { useEffect, useState } from "react";
import { subscribeSync, type SyncState } from "@/lib/sync";
import { CARD, MUTED, LINE2, SANS } from "@/lib/ui";

const MAP: Record<SyncState, { txt: string; cor: string } | null> = {
  idle: null,
  saving: { txt: "Salvando…", cor: "#eab308" },
  saved: { txt: "Salvo na nuvem", cor: "var(--brand, #25d366)" },
  offline: { txt: "Sem conexão — salvo só neste aparelho", cor: "#f87171" },
  "local-only": { txt: "Salvo só neste aparelho", cor: "#f87171" },
};

export default function SyncIndicator() {
  const [state, setState] = useState<SyncState>("idle");
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    const unsub = subscribeSync(setState);
    const onConflict = () => { setConflict(true); setTimeout(() => setConflict(false), 4000); };
    window.addEventListener("famoso:sync-conflict", onConflict);
    return () => { unsub(); window.removeEventListener("famoso:sync-conflict", onConflict); };
  }, []);

  const info = MAP[state];
  if (!info && !conflict) return null;

  const shown = conflict
    ? { txt: "Atualizado de outro aparelho", cor: "#eab308" }
    : info!;

  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 14, right: 14, zIndex: 150,
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 11px", borderRadius: 999, fontFamily: SANS, fontSize: 11.5,
      background: CARD, border: `1px solid ${LINE2}`, color: MUTED,
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: shown.cor, flexShrink: 0 }} />
      {shown.txt}
    </div>
  );
}
