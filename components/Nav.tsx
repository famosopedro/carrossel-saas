import { useState, useEffect } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { BG, SURFACE, FG, MUTED, LINE, ACCENT } from "@/lib/ui";

type Theme = "dark" | "light" | "auto";

const LINKS = [
  { href: "/marca", label: "Marca" },
  { href: "/gerar", label: "Gerar" },
  { href: "/dashboard", label: "Dashboard" },
];

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.5 8A4.5 4.5 0 0 1 7 3.5c0-.46.07-.9.18-1.32A5.5 5.5 0 1 0 12.82 8.32 4.5 4.5 0 0 1 11.5 8z" fill="currentColor"/>
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="7.5" r="2.5" fill="currentColor"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.2 3.2l1.06 1.06M10.74 10.74l1.06 1.06M3.2 11.8l1.06-1.06M10.74 4.26l1.06-1.06" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconAuto() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4.5 12.5h6M7.5 10.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function applyTheme(t: Theme) {
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}

export default function Nav() {
  const { pathname } = useRouter();
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("famoso_theme") as Theme) || "dark";
    setThemeState(saved);
    applyTheme(saved);
  }, []);

  function handleTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("famoso_theme", t);
    applyTheme(t);
  }

  const ICONS: { t: Theme; Icon: () => React.ReactElement; label: string }[] = [
    { t: "dark", Icon: IconMoon, label: "Escuro" },
    { t: "light", Icon: IconSun, label: "Claro" },
    { t: "auto", Icon: IconAuto, label: "Auto" },
  ];

  return (
    <header style={{
      background: SURFACE,
      borderBottom: `1px solid ${LINE}`,
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <Link href="/gerar" style={{ textDecoration: "none" }}>
        <div style={{
          height: 16,
          width: 104,
          backgroundColor: FG,
          WebkitMaskImage: "url(/logo-horizontal.svg)",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          WebkitMaskPosition: "left center",
          maskImage: "url(/logo-horizontal.svg)",
          maskRepeat: "no-repeat",
          maskSize: "contain",
          maskPosition: "left center",
        }} />
      </Link>

      <nav style={{ display: "flex", gap: 4 }}>
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                padding: "18px 12px",
                color: active ? FG : MUTED,
                borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                transition: "color 0.12s",
                display: "inline-block",
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div style={{ display: "flex", gap: 2, background: BG, border: `1px solid ${LINE}`, borderRadius: 8, padding: 3 }}>
        {ICONS.map(({ t, Icon, label }) => {
          const active = theme === t;
          return (
            <button
              key={t}
              onClick={() => handleTheme(t)}
              title={label}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 6,
                border: "none", cursor: "pointer",
                background: active ? SURFACE : "transparent",
                color: active ? FG : MUTED,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <Icon />
            </button>
          );
        })}
      </div>
    </header>
  );
}
