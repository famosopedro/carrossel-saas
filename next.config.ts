import type { NextConfig } from "next";

// Em produção, assets são servidos via famoso-site em /carrossel-assets/_next/
// para evitar CORS (browser bloquearia dynamic imports de domínio diferente).
// Defina NEXT_PUBLIC_ASSET_PREFIX=https://www.famosopedro.com.br/carrossel-assets
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

// Origem dos assets em produção (multi-zone) — precisa entrar na CSP.
const assetOrigin = (() => {
  try { return assetPrefix ? new URL(assetPrefix).origin : ""; } catch { return ""; }
})();

const csp = [
  `default-src 'self'`,
  // 'unsafe-inline' p/ o bootstrap de tema e scripts inline do Next (Pages Router
  // não usa nonce). assetOrigin serve os chunks _next no multi-zone.
  `script-src 'self' 'unsafe-inline'${assetOrigin ? " " + assetOrigin : ""}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com data:`,
  `img-src 'self' data: blob: https:`,
  // Supabase (REST + Realtime websocket) e a origem dos assets
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${assetOrigin ? " " + assetOrigin : ""}`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: "/maquina-de-carrosseis",
  assetPrefix,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
