import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth";
import { BG, FG, MUTED } from "@/lib/ui";

const PUBLIC = ["/login"];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const hasAuthHash = typeof window !== "undefined" && window.location.hash.includes("access_token");
    if (!loading && !user && !PUBLIC.includes(router.pathname) && !hasAuthHash) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BG }}>
        <span style={{ fontSize: 13, color: MUTED }}>Carregando…</span>
      </div>
    );
  }

  if (!user && !PUBLIC.includes(router.pathname)) return null;

  return <>{children}</>;
}
