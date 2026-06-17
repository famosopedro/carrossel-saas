import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getCarrosseis, deleteCarrossel, type Carrossel } from "@/lib/storage";

const BG = "#1c1c1c";
const FG = "#ededed";
const MUTED = "rgba(237,237,237,0.45)";
const LINE = "rgba(237,237,237,0.1)";
const CARD = "#232323";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const router = useRouter();
  const [carrosseis, setCarrosseis] = useState<Carrossel[]>([]);

  useEffect(() => { setCarrosseis(getCarrosseis()); }, []);

  function handleDelete(id: string) {
    deleteCarrossel(id);
    setCarrosseis((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div style={{ background: BG, minHeight: "calc(100vh - 52px)", color: FG, padding: "36px 28px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
              Dashboard
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Carrosseis salvos
            </h1>
          </div>
          <button
            onClick={() => router.push("/gerar")}
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
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>Nenhum carrossel salvo ainda</p>
            <button
              onClick={() => router.push("/gerar")}
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
                    onClick={() => handleDelete(c.id)}
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
  );
}
