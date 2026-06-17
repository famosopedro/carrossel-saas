import type { NextConfig } from "next";

// Em produção, assets são servidos via famoso-site em /carrossel-assets/_next/
// para evitar CORS (browser bloquearia dynamic imports de domínio diferente).
// Defina NEXT_PUBLIC_ASSET_PREFIX=https://www.famosopedro.com.br/carrossel-assets
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: "/maquina-de-carrosseis",
  assetPrefix,
};

export default nextConfig;
