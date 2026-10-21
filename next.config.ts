import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Konva tente d'importer le module natif "canvas" côté serveur : on l'ignore.
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), { canvas: "commonjs canvas" }];
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
