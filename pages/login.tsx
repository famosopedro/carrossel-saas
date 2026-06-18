import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { BG, FG, MUTED, FAINT, LINE, SURFACE, CARD, ACCENT } from "@/lib/ui";

type Mode = "login" | "signup" | "reset";

export default function Login() {
  const { user, oauthError } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(oauthError);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/marca");
  }, [user, router]);

  useEffect(() => {
    if (oauthError) setErro(oauthError);
  }, [oauthError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        router.replace("/marca");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        // Supabase silently "succeeds" para email já cadastrado — detectar via identities vazio
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          throw new Error("User already registered");
        }
        setOk("Conta criada! Você já pode entrar.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/maquina-de-carrosseis/login`,
        });
        if (error) throw error;
        setOk("Link de redefinição enviado para seu e-mail.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setErro(translateError(msg));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErro(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/maquina-de-carrosseis/marca` },
    });
    if (error) setErro(error.message);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <p style={{ textAlign: "center", fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: FG, marginBottom: 32 }}>
          FAMOSO<span style={{ color: ACCENT, fontSize: 14, verticalAlign: "super", fontWeight: 700 }}>®</span>
        </p>

        <div style={{ background: SURFACE, border: `1px solid ${LINE}`, borderRadius: 14, padding: "32px 28px" }}>
          <h1 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: FG, letterSpacing: "-0.02em" }}>
            {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Redefinir senha"}
          </h1>

          {/* Google */}
          {mode !== "reset" && (
            <>
              <button
                onClick={handleGoogle}
                style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: `1px solid ${LINE}`, background: CARD, color: FG, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "inherit", marginBottom: 20 }}
              >
                <GoogleIcon />
                Continuar com Google
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: LINE }} />
                <span style={{ fontSize: 11, color: FAINT }}>ou</span>
                <div style={{ flex: 1, height: 1, background: LINE }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={lblStyle}>E-mail</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" placeholder="seu@email.com"
                style={inputStyle}
              />
            </div>

            {mode !== "reset" && (
              <div>
                <label style={lblStyle}>Senha</label>
                <input
                  type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                  required autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••" minLength={6}
                  style={inputStyle}
                />
              </div>
            )}

            {erro && <p style={{ fontSize: 12, color: "#f87171", margin: 0 }}>{erro}</p>}
            {ok && <p style={{ fontSize: 12, color: "#4ade80", margin: 0 }}>{ok}</p>}

            <button
              type="submit" disabled={loading}
              style={{ marginTop: 4, padding: "11px 0", borderRadius: 8, border: "none", background: loading ? "#444" : FG, color: BG, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
            </button>
          </form>

          {/* Troca de modo */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {mode === "login" && (
              <>
                <button onClick={() => { setMode("signup"); setErro(null); setOk(null); }} style={linkBtn}>
                  Não tem conta? Criar agora
                </button>
                <button onClick={() => { setMode("reset"); setErro(null); setOk(null); }} style={{ ...linkBtn, color: FAINT }}>
                  Esqueci minha senha
                </button>
              </>
            )}
            {mode !== "login" && (
              <button onClick={() => { setMode("login"); setErro(null); setOk(null); }} style={linkBtn}>
                ← Voltar para login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("Email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado.";
  if (msg.includes("Password should be")) return "Senha deve ter no mínimo 6 caracteres.";
  return msg;
}

const lblStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 7, border: `1px solid ${LINE}`, background: BG, color: FG, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" };
