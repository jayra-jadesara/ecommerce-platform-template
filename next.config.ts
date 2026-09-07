import type { NextConfig } from "next";

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
  allowedDevOrigins: ["192.168.31.106", "localhost"],
  // Makes ADMIN_ROUTE available to client bundles for link building only.
  // This is not a security boundary — RBAC still runs on the server.
  env: {
    ADMIN_ROUTE: adminRoute,
  },
  images: {
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
        ]
      : [],
  },
};

export default nextConfig;
