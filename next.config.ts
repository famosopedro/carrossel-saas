import type { NextConfig } from "next";

// Em produção (Vercel), defina NEXT_PUBLIC_APP_URL=https://<sua-url>.vercel.app
// Isso faz o assetPrefix apontar direto para o domínio do carrossel,
// evitando colisão de _next/static com o famoso-site (multi-zone Next.js).
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: "/maquina-de-carrosseis",
  assetPrefix: appUrl,
  async headers() {
    return [
      {
        source: "/_next/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
