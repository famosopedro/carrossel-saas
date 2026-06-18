import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Atualiza em mudanças futuras (refresh de token, signOut em outra aba).
    // NÃO controla loading inicial — quem manda nisso é o init() abaixo.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    async function init() {
      const hash = window.location.hash;
      // Callback do OAuth: token vem no hash. Processa de forma determinística.
      if (hash.includes("access_token")) {
        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          setSession(data.session);
          // Limpa o hash sem reload, preservando query string
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      } else {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
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
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
