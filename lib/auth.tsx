import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { hydrate, clearSyncUser } from "./sync";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  oauthError: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({ user: null, session: null, loading: true, oauthError: null, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    // Atualiza em mudanças futuras (refresh de token, signOut em outra aba).
    // NÃO controla loading inicial — quem manda nisso é o init() abaixo.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_OUT") clearSyncUser();
    });

    async function init() {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.slice(1));

      // Supabase devolveu erro no hash (#error=...&error_description=...)
      if (hash.includes("error=") && !hash.includes("access_token")) {
        const desc = params.get("error_description") ?? params.get("error") ?? "Erro ao autenticar com Google.";
        setOauthError(decodeURIComponent(desc.replace(/\+/g, " ")));
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setLoading(false);
        return;
      }

      // Callback do OAuth: token vem no hash. Processa de forma determinística.
      if (hash.includes("access_token")) {
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setOauthError(error.message);
          } else {
            setSession(data.session);
            if (data.session?.user) await hydrate(data.session.user.id);
          }
        } else {
          setOauthError("Token incompleto recebido do provedor. Tente novamente.");
        }
        // Limpa o hash sem reload, preservando query string
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        // Carrega o workspace da nuvem ANTES de liberar — evita que as páginas
        // leiam o localStorage antes da hidratação (tolerante a falha).
        if (data.session?.user) await hydrate(data.session.user.id);
      }
      // Só libera DEPOIS de resolver — garante que loading=false já tem o user certo
      setLoading(false);
    }

    init();
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, oauthError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
