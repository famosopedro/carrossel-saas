import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Máquina de Carrosséis FAMOSO® — gere carrosséis de Instagram com IA no DNA da sua marca." />
        <meta name="theme-color" content="#1c1c1c" />
        <meta property="og:title" content="Máquina de Carrosséis | FAMOSO®" />
        <meta property="og:description" content="Gere carrosséis de Instagram com IA no DNA da sua marca." />
        <meta property="og:type" content="website" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=Archivo:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        {/* Aplica data-theme antes do React hidratar — evita flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('famoso_theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);})();` }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
