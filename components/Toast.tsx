import { useState, useCallback, useRef } from "react";
import type React from "react";
import { CARD, FG, LINE2, BRAND, SP, RADIUS, SANS } from "@/lib/ui";

type ToastKind = "ok" | "erro" | "info";
type ToastMsg = { id: number; texto: string; kind: ToastKind };

// Hook auto-contido: `toast("...")` empilha; `ToastHost` é o elemento a renderizar.
export function useToast() {
  const [msgs, setMsgs] = useState<ToastMsg[]>([]);
  const seq = useRef(0);

  const toast = useCallback((texto: string, kind: ToastKind = "ok") => {
    const id = ++seq.current;
    setMsgs((m) => [...m, { id, texto, kind }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 4000);
  }, []);

  const ToastHost: React.ReactElement = (
    <div aria-live="polite" aria-atomic="false" style={{
      position: "fixed", right: 16, bottom: 16, zIndex: 200,
      display: "flex", flexDirection: "column", gap: 8, maxWidth: "calc(100vw - 32px)", fontFamily: SANS,
    }}>
      {msgs.map((m) => (
        <div key={m.id} role="status" style={{
          display: "flex", alignItems: "center", gap: 10, background: CARD,
          border: `1px solid ${m.kind === "erro" ? "var(--danger)" : LINE2}`,
          borderLeft: `3px solid ${m.kind === "erro" ? "var(--danger)" : m.kind === "info" ? "var(--muted)" : BRAND}`,
          color: FG, padding: "11px 14px", borderRadius: RADIUS.md, fontSize: 13, fontWeight: 500,
          boxShadow: "0 8px 28px rgba(0,0,0,0.35)", minWidth: 220,
        }}>
          {m.texto}
        </div>
      ))}
    </div>
  );

  return { toast, ToastHost };
}
