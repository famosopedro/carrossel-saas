import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { useRouter } from "next/router";
import Nav from "@/components/Nav";
import { getMarca } from "@/lib/storage";
import { registrarFontesCustom } from "@/lib/fonts";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

const NO_NAV = ["/login"];

function AppInner({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showNav = !NO_NAV.includes(router.pathname);

  useEffect(() => { registrarFontesCustom(getMarca()); }, []);

  return (
    <ProtectedRoute>
      {showNav && (
        <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      )}
      {showNav && <Nav />}
      <div id="conteudo">
        <Component {...pageProps} />
      </div>
    </ProtectedRoute>
  );
}

export default function App(props: AppProps) {
  return (
    <AuthProvider>
      <AppInner {...props} />
    </AuthProvider>
  );
}
