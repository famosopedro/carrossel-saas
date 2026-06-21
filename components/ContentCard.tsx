import type React from "react";
import SlideRender, { DIM } from "@/components/SlideRender";
import type { Carrossel, BrandConfig } from "@/lib/storage";
import { CARD, FG, MUTED, LINE, LINE2, SP, RADIUS, SANS } from "@/lib/ui";

function fmtData(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const Btn = ({ label, onClick, children, danger }: { label: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) => (
  <button onClick={onClick} title={label} aria-label={label}
    style={{
      display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32,
      borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, background: "transparent",
      color: danger ? "var(--danger)" : MUTED, cursor: "pointer", fontFamily: SANS,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; e.currentTarget.style.color = danger ? "var(--danger)" : FG; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = danger ? "var(--danger)" : MUTED; }}>
    {children}
  </button>
);

const Ico = (d: string) => () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
const IcoEdit = Ico("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z");
const IcoCopy = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>;
const IcoDown = Ico("M12 3v12m0 0l-4-4m4 4l4-4M4 21h16");
const IcoTrash = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>;

type Props = {
  carrossel: Carrossel;
  marca: BrandConfig;
  larguraAlvo?: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
};

export default function ContentCard({ carrossel, marca, larguraAlvo = 280, onEdit, onDuplicate, onDelete, onExport }: Props) {
  const dim = DIM[marca.formato] || DIM.vertical;
  const escala = larguraAlvo / dim.w;
  const capa = carrossel.slides[0];

  return (
    <div className="lift" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: RADIUS.lg, overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: SANS }}>
      {/* Thumbnail (capa escalada) */}
      <button onClick={onEdit} aria-label={`Editar carrossel: ${carrossel.tema || "sem título"}`}
        style={{ width: "100%", height: dim.h * escala, overflow: "hidden", background: "var(--bg)", border: "none", padding: 0, cursor: "pointer", display: "block", position: "relative", borderBottom: `1px solid ${LINE}` }}>
        {capa ? (
          <div style={{ transform: `scale(${escala})`, transformOrigin: "top left", width: dim.w, height: dim.h }}>
            <SlideRender slide={capa} index={0} total={carrossel.slides.length} marca={marca} />
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, fontSize: 13 }}>Sem slides</div>
        )}
        <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.62)", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999 }}>
          {carrossel.slides.length} {carrossel.slides.length === 1 ? "slide" : "slides"}
        </span>
      </button>

      {/* Meta + ações */}
      <div style={{ padding: SP.md, display: "flex", flexDirection: "column", gap: SP.sm, flex: 1 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: FG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={carrossel.tema}>
            {carrossel.tema || "Sem título"}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{fmtData(carrossel.criadoEm)}</div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
          <Btn label="Editar" onClick={onEdit}><IcoEdit /></Btn>
          <Btn label="Duplicar" onClick={onDuplicate}><IcoCopy /></Btn>
          <Btn label="Exportar (ZIP)" onClick={onExport}><IcoDown /></Btn>
          <div style={{ flex: 1 }} />
          <Btn label="Excluir" onClick={onDelete} danger><IcoTrash /></Btn>
        </div>
      </div>
    </div>
  );
}
