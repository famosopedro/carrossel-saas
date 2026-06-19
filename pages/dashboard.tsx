import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getCarrosseis, deleteCarrossel, saveCarrossel, type Carrossel } from "@/lib/storage";
import PromoRail from "@/components/PromoRail";
import { BG, FG, MUTED, LINE, CARD, eyebrow } from "@/lib/ui";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const router = useRouter();
  const [carrosseis, setCarrosseis] = useState<Carrossel[]>([]);
  const [undo, setUndo] = useState<Carrossel | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setCarrosseis(getCarrosseis()); }, []);

  function handleDelete(c: Carrossel) {
    deleteCarrossel(c.id);
    setCarrosseis((prev) => prev.filter((x) => x.id !== c.id));
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo(c);
    undoTimer.current = setTimeout(() => setUndo(null), 10000);
  }

  function desfazerDelete() {
    if (!undo) return;
    saveCarrossel(undo);
    setCarrosseis(getCarrosseis());
    setUndo(null);
  }

  return (
    <>
    <Head><title>Dashboard | FAMOSO®</title></Head>
    <div style={{ background: BG, height: "calc(100vh - 56px)", overflow: "hidden", color: FG, display: "flex" }}>
      <div style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "36px 28px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ ...eyebrow, fontSize: 14, color: MUTED, margin: "0 0 4px" }}>
              Dashboard
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Carrosséis salvos
            </h1>
          </div>
          <button
            onClick={() => router.push("/gerar?new=1")}
            style={{
              padding: "9px 18px",
              background: FG,
              color: BG,
              border: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Novo carrossel
          </button>
        </div>

        {carrosseis.length === 0 ? (
          <div style={{
            border: `1px dashed ${LINE}`,
            borderRadius: 8,
            padding: "60px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            color: MUTED,
          }}>
            <div style={{ fontSize: 24, opacity: 0.3 }}>▦</div>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Seus carrosséis aparecem aqui</p>
            <button
              onClick={() => router.push("/gerar?new=1")}
              style={{
                marginTop: 8,
                padding: "7px 16px",
                background: "transparent",
                border: `1px solid ${LINE}`,
                borderRadius: 5,
                fontSize: 12,
                fontWeight: 600,
                color: MUTED,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Gerar primeiro carrossel →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {carrosseis.map((c) => (
              <div
                key={c.id}
                style={{
                  background: CARD,
                  border: `1px solid ${LINE}`,
                  borderRadius: 8,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.tema || "Sem tema"}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: MUTED }}>
                    {c.slides.length} slides · {formatDate(c.criadoEm)}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {/* Slide count pills */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {c.slides.slice(0, 5).map((_, i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: LINE }} />
                    ))}
                    {c.slides.length > 5 && (
                      <span style={{ fontSize: 9, color: MUTED }}>+{c.slides.length - 5}</span>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/gerar?id=${c.id}`)}
                    style={{
                      padding: "5px 12px",
                      background: "transparent",
                      border: `1px solid ${LINE}`,
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      color: FG,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => handleDelete(c)}
                    title="Apagar carrossel"
                    style={{
                      padding: "5px 10px",
                      background: "transparent",
                      border: `1px solid ${LINE}`,
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      color: MUTED,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
      <PromoRail />

      {undo && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: CARD, border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 50, overflow: "hidden" }}>
          <span style={{ fontSize: 12, color: FG }}>Carrossel apagado</span>
          <button onClick={desfazerDelete} className="ed-btn" style={{ fontSize: 12, fontWeight: 700, color: FG, background: "transparent", border: `1px solid ${FG}`, borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>Desfazer</button>
          <span key={undo.id} className="undo-bar" aria-hidden="true" />
        </div>
      )}
    </div>
    </>
  );
}
