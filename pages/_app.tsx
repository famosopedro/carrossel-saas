import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
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
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Máquina de Carrosséis | FAMOSO®</title>
      </Head>
      {showNav ? (
        <>
          <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
          <AppLayout>
            <Component {...pageProps} />
          </AppLayout>
        </>
      ) : (
        <div id="conteudo">
          <Component {...pageProps} />
        </div>
      )}
    </ProtectedRoute>
  );
}

export default function App(props: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppInner {...props} />
      </AuthProvider>
    </ErrorBoundary>
  );
}
