import { useState } from "react";
import type React from "react";
import Sidebar from "./Sidebar";
import { useIsMobile } from "@/lib/useIsMobile";
import { BG, SURFACE, FG, MUTED, LINE, SP } from "@/lib/ui";

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile(900);
  const [open, setOpen] = useState(false);

  // ── Desktop: sidebar fixa + conteúdo rolável ──
  if (!isMobile) {
    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: BG, color: FG }}>
        <Sidebar />
        <main id="conteudo" className="app-main" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>{children}</main>
      </div>
    );
  }

  // ── Mobile/tablet: topbar + drawer deslizante ──
  return (
    <div style={{ minHeight: "100vh", background: BG, color: FG }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 30, height: 54, display: "flex", alignItems: "center",
        gap: SP.md, padding: "0 14px", background: SURFACE, borderBottom: `1px solid ${LINE}`,
      }}>
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38,
            borderRadius: 8, border: `1px solid ${LINE}`, background: BG, color: FG, cursor: "pointer" }}>
          <IconMenu />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>FAMOSO · Máquina de Carrosséis</span>
      </header>

      {open && (
        <>
          <div onClick={() => setOpen(false)} aria-hidden="true"
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40 }} />
          <div role="dialog" aria-label="Menu" style={{ position: "fixed", inset: "0 auto 0 0", zIndex: 50, width: 240, height: "100%", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}>
            <button onClick={() => setOpen(false)} aria-label="Fechar menu"
              style={{ position: "absolute", top: 12, right: 12, zIndex: 2, width: 34, height: 34, borderRadius: 8,
                border: `1px solid ${LINE}`, background: BG, color: FG, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconClose />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </>
      )}

      <main id="conteudo" className="app-main">{children}</main>
    </div>
  );
}
