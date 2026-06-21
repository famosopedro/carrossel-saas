import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { erro: boolean }

// Captura erros de render para a tela não ficar em branco. Quando houver Sentry
// (NEXT_PUBLIC_SENTRY_DSN), é aqui que o report deve ser enviado.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: false };

  static getDerivedStateFromError(): State {
    return { erro: true };
  }

  componentDidCatch(error: unknown) {
    console.error("ErrorBoundary:", error);
    // TODO: enviar para Sentry quando o DSN estiver configurado
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 14, padding: 24, textAlign: "center",
        background: "var(--bg, #1c1c1c)", color: "var(--fg, #f5f5f5)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Algo quebrou nesta tela</div>
        <div style={{ fontSize: 13.5, color: "var(--muted, #9a9a9a)", maxWidth: 360, lineHeight: 1.5 }}>
          Seus dados estão salvos. Recarregue a página para continuar.
        </div>
        <button onClick={() => location.reload()}
          style={{ marginTop: 6, padding: "9px 18px", borderRadius: 8, border: "none",
            background: "var(--brand, #25d366)", color: "#04210f", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Recarregar
        </button>
      </div>
    );
  }
}
