import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  // In development the Python API runs separately (`npm run dev:api`) and is
  // proxied here. On Vercel, vercel.json routes /api/* to the Python function.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [{ source: "/api/:path*", destination: `${process.env.API_DEV_URL ?? "http://127.0.0.1:8000"}/api/:path*` }];
  },
};

export default nextConfig;
