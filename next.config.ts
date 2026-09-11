import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security/headers";

const adminRoute = process.env.ADMIN_ROUTE?.trim() || "manage-store";

function supabaseHostname(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  // Allow LAN device access to Turbopack HMR during local development.
  allowedDevOrigins: ["192.168.31.106", "localhost", "127.0.0.1"],
  // Makes ADMIN_ROUTE available to client bundles for link building only.
  // This is not a security boundary — RBAC still runs on the server.
  env: {
    ADMIN_ROUTE: adminRoute,
  },
  // Product / media uploads (UI allows up to 10 MB per file).
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
          {
            protocol: "http",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/render/image/public/**",
          },
          {
            protocol: "http",
            hostname: supabaseHost,
            pathname: "/storage/v1/render/image/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      ...buildSecurityHeaders(),
      // Note: do not set Cache-Control on /_next/static — Next.js owns hashed
      // asset caching. A custom immutable header can interfere with `next dev`.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/offline",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
