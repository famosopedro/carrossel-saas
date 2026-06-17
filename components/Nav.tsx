import Link from "next/link";
import { useRouter } from "next/router";

const BG = "#1c1c1c";
const FG = "#ededed";
const MUTED = "rgba(237,237,237,0.45)";
const LINE = "rgba(237,237,237,0.1)";

const LINKS = [
  { href: "/marca", label: "Marca" },
  { href: "/gerar", label: "Gerar" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Nav() {
  const { pathname } = useRouter();

  return (
    <header style={{
      background: BG,
      borderBottom: `1px solid ${LINE}`,
      height: 52,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      <Link href="/gerar" style={{ textDecoration: "none" }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: FG }}>
          FAMOSO.<span style={{ color: MUTED }}>®</span>
        </span>
      </Link>

      <nav style={{ display: "flex", gap: 4 }}>
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: 5,
                color: active ? BG : MUTED,
                background: active ? FG : "transparent",
                transition: "all 0.1s",
                display: "inline-block",
              }}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
