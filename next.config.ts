import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
  // Self-contained server bundle, so the Docker image needs no node_modules.
  output: "standalone",
};

export default nextConfig;
