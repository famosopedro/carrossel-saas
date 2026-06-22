import { useState, useEffect } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth";
import { BG, SURFACE, CARD, FG, MUTED, LINE, LINE2, BRAND, SP, RADIUS, SANS } from "@/lib/ui";

type Theme = "dark" | "light" | "auto";

// ── Ícones (stroke, 18px, currentColor) ──────────────────────────────────
type IconProps = { size?: number };
const I = ({ size = 18, d, children }: IconProps & { d?: string; children?: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d ? <path d={d} /> : children}
  </svg>
);
const IconDashboard = () => <I><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></I>;
const IconNovo = () => <I><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M12 8v8M8 12h8"/></I>;
const IconConteudo = () => <I><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 15l4-4a2 2 0 0 1 2.8 0L15 16"/><circle cx="15.5" cy="8.5" r="1.5"/></I>;
const IconMarca = () => <I><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="12" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="13" r="2.5"/><path d="M12 22a3 3 0 0 0 0-6 2 2 0 0 1 0-4"/></I>;
const IconPiloto = () => <I d="M13 2 4.5 13.5H11l-1 8.5L19.5 10.5H13z"/>;
const IconRelatorios = () => <I><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="0.5"/><rect x="12" y="7" width="3" height="10" rx="0.5"/><rect x="17" y="13" width="3" height="4" rx="0.5"/></I>;
const IconConfig = () => <I><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 14H4.5a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V4.5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.4 1z"/></I>;

const IconMoon = () => <I d="M11.5 8A4.5 4.5 0 0 1 7 3.5c0-.46.07-.9.18-1.32A5.5 5.5 0 1 0 12.82 8.32 4.5 4.5 0 0 1 11.5 8z" size={15} />;
const IconSun = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><circle cx="7.5" cy="7.5" r="2.5" fill="currentColor"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.2 3.2l1.06 1.06M10.74 10.74l1.06 1.06M3.2 11.8l1.06-1.06M10.74 4.26l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const IconAuto = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><rect x="1.5" y="2.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M4.5 12.5h6M7.5 10.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const IconLogout = () => <I d="M5.5 2.5H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5M10 10.5 12.5 8 10 5.5M12.5 8H6" size={15} />;
const IconChevron = ({ dir }: { dir: "left" | "right" }) => <I d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} size={16} />;

export const NAV_ITEMS: { href: string; label: string; Icon: () => React.ReactElement }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/gerar", label: "Novo Carrossel", Icon: IconNovo },
  { href: "/conteudo", label: "Meu Conteúdo", Icon: IconConteudo },
  { href: "/marca", label: "DNA da Marca", Icon: IconMarca },
  { href: "/piloto", label: "Piloto Automático", Icon: IconPiloto },
  { href: "/relatorios", label: "Relatórios", Icon: IconRelatorios },
  { href: "/config", label: "Configurações", Icon: IconConfig },
];

const THEME_ORDER: Theme[] = ["dark", "light", "auto"];
const THEME_META: Record<Theme, { Icon: () => React.ReactElement; label: string }> = {
  dark: { Icon: IconMoon, label: "Escuro" },
  light: { Icon: IconSun, label: "Claro" },
  auto: { Icon: IconAuto, label: "Auto" },
};

function themeForHour(): "dark" | "light" {
  const h = new Date().getHours();
  return h >= 7 && h < 19 ? "light" : "dark";
}
function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t === "auto" ? themeForHour() : t);
}

export default function Sidebar({ onNavigate, collapsible = true }: { onNavigate?: () => void; collapsible?: boolean }) {
  const { pathname, basePath, push } = useRouter();
  const { user, signOut } = useAuth();
  const [theme, setThemeState] = useState<Theme>("dark");
  const [confirmSair, setConfirmSair] = useState(false);
  const [logoOk, setLogoOk] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // Detecta se o SVG do logo existe; senão cai pro wordmark de texto.
  useEffect(() => {
    const img = new Image();
    img.onerror = () => setLogoOk(false);
    img.src = `${basePath}/logo-horizontal.svg`;
  }, [basePath]);

  useEffect(() => {
    const saved = (localStorage.getItem("famoso_theme") as Theme) || "dark";
    setThemeState(saved);
    applyTheme(saved);
    if (collapsible) setCollapsed(localStorage.getItem("famoso_sidebar_collapsed") === "1");
    const interval = setInterval(() => {
      const current = (localStorage.getItem("famoso_theme") as Theme) || "dark";
      if (current === "auto") applyTheme("auto");
    }, 60_000);
    return () => clearInterval(interval);
  }, [collapsible]);

  function handleTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("famoso_theme", t);
    applyTheme(t);
  }
  function cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    handleTheme(next);
  }
  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("famoso_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  async function handleSignOut() {
    if (!confirmSair) { setConfirmSair(true); setTimeout(() => setConfirmSair(false), 3000); return; }
    await signOut();
    push("/login");
  }

  const email = user?.email || "";
  const inicial = (email[0] || "F").toUpperCase();
  const col = collapsible && collapsed; // recolhido só vale fora do drawer

  return (
    <aside style={{
      width: col ? 64 : 240, flexShrink: 0, height: "100%", background: SURFACE,
      borderRight: `1px solid ${LINE}`, display: "flex", flexDirection: "column",
      fontFamily: SANS, transition: "width 0.18s ease",
    }}>
      {/* Logo + toggle */}
      <div style={{ padding: col ? "18px 0 14px" : "20px 14px 14px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: col ? "center" : "space-between", gap: 8 }}>
        {!col && (
          <Link href="/dashboard" onClick={onNavigate} style={{ display: "inline-block" }} aria-label="FAMOSO — início">
            {logoOk ? (
              <div style={{
                height: 16, width: 104, backgroundColor: FG,
                WebkitMaskImage: `url(${basePath}/logo-horizontal.svg)`, WebkitMaskRepeat: "no-repeat",
                WebkitMaskSize: "contain", WebkitMaskPosition: "left center",
                maskImage: `url(${basePath}/logo-horizontal.svg)`, maskRepeat: "no-repeat",
                maskSize: "contain", maskPosition: "left center",
              }} />
            ) : (
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: FG }}>FAMOSO<span style={{ color: BRAND }}>.</span></span>
            )}
          </Link>
        )}
        {collapsible && (
          <button onClick={toggleCollapsed} title={col ? "Expandir menu" : "Recolher menu"}
            aria-label={col ? "Expandir menu" : "Recolher menu"} aria-expanded={!col}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30,
              borderRadius: RADIUS.sm, border: `1px solid ${LINE2}`, background: "transparent",
              color: MUTED, cursor: "pointer", flexShrink: 0,
            }}>
            <IconChevron dir={col ? "right" : "left"} />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav className="nav-scroll" style={{ flex: 1, overflowY: "auto", padding: SP.md, display: "flex", flexDirection: "column", gap: 2 }} aria-label="Navegação principal">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              title={col ? label : undefined} aria-label={col ? label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: col ? 0 : 11, padding: col ? "10px 0" : "10px 12px",
                justifyContent: col ? "center" : "flex-start",
                borderRadius: RADIUS.md, fontSize: 13.5, fontWeight: active ? 600 : 500,
                color: active ? FG : MUTED, background: active ? CARD : "transparent",
                position: "relative", transition: "background 0.12s, color 0.12s", whiteSpace: "nowrap", overflow: "hidden",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = BG; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              {active && <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: BRAND }} />}
              <span style={{ color: active ? BRAND : MUTED, display: "flex" }}><Icon /></span>
              {!col && label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé: tema + usuário */}
      <div style={{ borderTop: `1px solid ${LINE}`, padding: SP.md, display: "flex", flexDirection: "column", gap: SP.md, alignItems: col ? "center" : "stretch" }}>
        {col ? (
          // Recolhido: botão único que cicla o tema
          <button onClick={cycleTheme} title={`Tema: ${THEME_META[theme].label} (clique p/ trocar)`} aria-label={`Tema atual ${THEME_META[theme].label}, clique para trocar`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 30, borderRadius: 7, border: `1px solid ${LINE}`, background: BG, color: FG, cursor: "pointer" }}>
            {(() => { const Ic = THEME_META[theme].Icon; return <Ic />; })()}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 2, background: BG, border: `1px solid ${LINE}`, borderRadius: 8, padding: 3 }} role="group" aria-label="Tema">
            {THEME_ORDER.map((t) => {
              const active = theme === t;
              const { Icon, label } = THEME_META[t];
              return (
                <button key={t} onClick={() => handleTheme(t)} title={label}
                  aria-label={`Tema ${label.toLowerCase()}`} aria-pressed={active}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                    background: active ? SURFACE : "transparent", color: active ? FG : MUTED,
                    transition: "background 0.15s, color 0.15s",
                  }}>
                  <Icon />
                </button>
              );
            })}
          </div>
        )}

        {col ? (
          <>
            <div aria-hidden="true" title={email} style={{
              width: 34, height: 34, borderRadius: "50%", background: CARD, border: `1px solid ${LINE2}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: FG,
            }}>{inicial}</div>
            <button onClick={handleSignOut} title={confirmSair ? "Confirmar saída" : "Sair"}
              aria-label={confirmSair ? "Clique novamente para sair" : "Sair"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 30, borderRadius: 7,
                background: confirmSair ? "var(--danger)" : "transparent",
                border: `1px solid ${confirmSair ? "var(--danger)" : LINE2}`,
                color: confirmSair ? "#fff" : MUTED, cursor: "pointer",
              }}>
              <IconLogout />
            </button>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div aria-hidden="true" style={{
              width: 30, height: 30, borderRadius: "50%", background: CARD, border: `1px solid ${LINE2}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: FG, flexShrink: 0,
            }}>{inicial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={email}>
                {email || "Conta"}
              </div>
            </div>
            <button onClick={handleSignOut} title={confirmSair ? "Confirmar saída" : "Sair"}
              aria-label={confirmSair ? "Clique novamente para sair" : "Sair"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                height: 30, padding: "0 10px", borderRadius: 7, flexShrink: 0,
                background: confirmSair ? "var(--danger)" : "transparent",
                border: `1px solid ${confirmSair ? "var(--danger)" : LINE2}`,
                color: confirmSair ? "#fff" : MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
              }}>
              <IconLogout />{confirmSair ? "Confirmar" : ""}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
