import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Kontent statik — sahifalar build vaqtida generatsiya qilinadi.
  experimental: { optimizePackageImports: ["zustand"] },
};

export default config;
