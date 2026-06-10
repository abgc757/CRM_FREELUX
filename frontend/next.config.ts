import type { NextConfig } from "next";

const rawBackend = process.env.BACKEND_URL ?? "localhost:8000";
const BACKEND_URL = rawBackend.startsWith("http")
  ? rawBackend
  : rawBackend.includes("localhost")
  ? `http://${rawBackend}`
  : `https://${rawBackend}`;

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/", destination: "/login", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: "/media/:path*",
        destination: `${BACKEND_URL}/media/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "*.freelux.mx" },
      { protocol: "https", hostname: "*.onrender.com" },
    ],
  },
};

export default nextConfig;
