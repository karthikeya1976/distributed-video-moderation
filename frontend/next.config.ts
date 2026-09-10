import type { NextConfig } from "next";

// Proxy all /api/backend/* requests to the FastAPI backend.
// - On Vercel (production): → https://redactor-api.duckdns.org
// - Locally:                → http://localhost:8088
// This means the browser always calls its own origin, eliminating mixed-content blocks.
const BACKEND =
  process.env.VERCEL
    ? "https://redactor-api.duckdns.org"
    : (process.env.BACKEND_URL ?? "http://localhost:8088");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND}/:path*`,
      },
    ];
  },
};

export default nextConfig;
