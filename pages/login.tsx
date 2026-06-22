import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/lib/useIsMobile";
import { BG, FG, MUTED, FAINT, LINE, LINE2, SURFACE, CARD, ACCENT, BRAND, BRAND_INK, SERIF, SANS } from "@/lib/ui";

type Mode = "login" | "signup" | "reset";

export default function Login() {
  const { user, oauthError } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile(880);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(oauthError);
  const [ok, setOk] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);

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
        if (!aceito) { setErro("Aceite os Termos de Uso e a Política de Privacidade para criar a conta."); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({ email, password: senha });
        if (error) throw error;
        // Supabase silently "succeeds" para email já cadastrado — detectar via identities vazio
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          throw new Error("User already registered");
        }
        setOk("Conta criada! Você já pode entrar.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${router.basePath}/login`,
        });
        if (error) throw error;
        setOk("Link de redefinição enviado para seu e-mail.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Algo deu errado. Tente de novo.";
      setErro(translateError(msg));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErro(null);
    if (mode === "signup" && !aceito) { setErro("Aceite os Termos de Uso e a Política de Privacidade para criar a conta."); return; }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${router.basePath}/marca` },
    });
    if (error) setErro(error.message);
  }

  const titulo = mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Redefinir senha";
  const subtitulo = mode === "login" ? "Acesse sua Máquina de Carrosséis." : mode === "signup" ? "Comece com 7 dias grátis." : "Enviamos um link para redefinir.";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BG, color: FG, fontFamily: SANS }}>
      <style>{CSS}</style>

      {/* ── Painel de marca (esquerda) — oculto no mobile ── */}
      {!isMobile && (
        <aside style={painelMarca} aria-hidden="true">
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
            <Wordmark />

            <div style={{ marginTop: "auto", maxWidth: 460 }}>
              <p style={{ ...eyebrowSerif, marginBottom: 18 }}>Máquina de Carrosséis</p>
              <h2 style={{ fontSize: 44, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.03em", color: FG, margin: "0 0 22px" }}>
                Carrosséis que parecem<br />de agência. Em minutos.
              </h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.55, color: MUTED, margin: "0 0 34px", maxWidth: 400 }}>
                A IA escreve no DNA da sua marca. Você só revisa e publica.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  "Identidade aplicada em cada slide",
                  "Do tema ao post pronto, sem brief",
                  "Exporte em PNG ou ZIP e publique",
                ].map((b) => (
                  <li key={b} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 14.5, color: FG }}>
                    <span style={tick} aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={BRAND_INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <p style={{ marginTop: "auto", paddingTop: 40, fontSize: 12.5, color: FAINT, fontFamily: SERIF, fontStyle: "italic" }}>
              Marca que vende não improvisa. — FAMOSO®
            </p>
          </div>
        </aside>
      )}

      {/* ── Painel de autenticação (direita) ── */}
      <main style={painelAuth}>
        <div className="lg-rise" style={{ width: "100%", maxWidth: 380 }}>
          {/* Logo no mobile (no desktop fica no painel esquerdo) */}
          {isMobile && <div style={{ textAlign: "center", marginBottom: 28 }}><Wordmark /></div>}

          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: FG }}>{titulo}</h1>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: MUTED }}>{subtitulo}</p>

          {/* Google */}
          {mode !== "reset" && (
            <>
              <button type="button" onClick={handleGoogle} className="lg-google" style={googleBtn}>
                <GoogleIcon />
                Continuar com Google
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: LINE }} />
                <span style={{ fontSize: 11, color: FAINT, letterSpacing: "0.06em" }}>OU</span>
                <div style={{ flex: 1, height: 1, background: LINE }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="login-email" style={lblStyle}>E-mail</label>
              <input
                id="login-email" className="lg-input"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email" placeholder="seu@email.com"
                style={inputStyle}
              />
            </div>

            {mode !== "reset" && (
              <div>
                <label htmlFor="login-senha" style={lblStyle}>Senha</label>
                <input
                  id="login-senha" className="lg-input"
                  type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
                  required autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••" minLength={6}
                  style={inputStyle}
                />
              </div>
            )}

            {mode === "signup" && (
              <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12, color: MUTED, lineHeight: 1.5, cursor: "pointer" }}>
                <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)}
                  style={{ marginTop: 1, accentColor: BRAND, flexShrink: 0, width: 15, height: 15 }} />
                <span>
                  Li e aceito os{" "}
                  <a href="https://www.famosopedro.com.br/termos-de-uso" target="_blank" rel="noopener noreferrer" style={{ color: FG, textDecoration: "underline" }}>Termos de Uso</a>
                  {" "}e a{" "}
                  <a href="https://www.famosopedro.com.br/politica-de-privacidade" target="_blank" rel="noopener noreferrer" style={{ color: FG, textDecoration: "underline" }}>Política de Privacidade</a>.
                </span>
              </label>
            )}

            {erro && <p role="alert" aria-live="assertive" style={{ fontSize: 12.5, color: "#f87171", margin: 0, lineHeight: 1.45 }}>{erro}</p>}
            {ok && <p role="status" aria-live="polite" style={{ fontSize: 12.5, color: BRAND, margin: 0, lineHeight: 1.45 }}>{ok}</p>}

            <button type="submit" disabled={loading} className="lg-primary" style={primaryBtn(loading)}>
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta grátis" : "Enviar link"}
            </button>
          </form>

          {/* Troca de modo */}
          <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            {mode === "login" && (
              <>
                <button onClick={() => { setMode("signup"); setErro(null); setOk(null); }} className="lg-link" style={linkBtn}>
                  Não tem conta? <strong style={{ color: FG, fontWeight: 700 }}>Criar agora</strong>
                </button>
                <button onClick={() => { setMode("reset"); setErro(null); setOk(null); }} className="lg-link" style={{ ...linkBtn, color: FAINT }}>
                  Esqueci minha senha
                </button>
              </>
            )}
            {mode !== "login" && (
              <button onClick={() => { setMode("login"); setErro(null); setOk(null); }} className="lg-link" style={linkBtn}>
                ← Voltar para login
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Wordmark() {
  return (
    <p style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.03em", color: FG, margin: 0 }}>
      FAMOSO<span style={{ color: ACCENT, fontSize: 13, verticalAlign: "super", fontWeight: 700 }}>®</span>
    </p>
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

// ── Estilos ──
const painelMarca: React.CSSProperties = {
  position: "relative", flex: "1 1 0%", padding: "48px 56px", overflow: "hidden",
  borderRight: `1px solid ${LINE}`,
  // glow verde no topo + grade sutil sobre o fundo escuro (vibe editorial dark)
  backgroundColor: BG,
  backgroundImage: `radial-gradient(900px 500px at 12% -8%, rgba(37,211,102,0.12), transparent 60%),
    linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
  backgroundSize: "auto, 56px 56px, 56px 56px",
};
const painelAuth: React.CSSProperties = {
  flex: "1 1 0%", display: "flex", alignItems: "center", justifyContent: "center",
  padding: "40px 24px", background: SURFACE,
};
const eyebrowSerif: React.CSSProperties = {
  fontFamily: SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 17, color: BRAND, margin: 0, letterSpacing: "0.01em",
};
const tick: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "50%", background: BRAND, display: "inline-flex",
  alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const lblStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.08em",
  textTransform: "uppercase", marginBottom: 7,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 9, border: `1px solid ${LINE2}`,
  background: BG, color: FG, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const googleBtn: React.CSSProperties = {
  width: "100%", padding: "12px 0", borderRadius: 9, border: `1px solid ${LINE2}`, background: "transparent",
  color: FG, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", gap: 10, fontFamily: "inherit",
};
function primaryBtn(loading: boolean): React.CSSProperties {
  return {
    marginTop: 2, padding: "13px 0", borderRadius: 9, border: "none",
    background: loading ? "var(--btn-disabled)" : BRAND, color: loading ? MUTED : BRAND_INK,
    fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
  };
}
const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};

const CSS = `
.lg-input{transition:border-color .15s ease, box-shadow .15s ease;}
.lg-input:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(37,211,102,0.16);}
.lg-google:hover{background:var(--card);border-color:var(--muted);}
.lg-primary:hover:not(:disabled){background:var(--brand-hover);}
.lg-primary:active:not(:disabled){transform:translateY(1px);}
.lg-link:hover{color:var(--fg);}
.lg-rise{animation:lgRise .55s cubic-bezier(.2,.7,.3,1) both;}
@keyframes lgRise{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion: reduce){.lg-rise{animation:none;}}
`;
