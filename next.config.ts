import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security/headers";

const adminRoute = process.env.ADMIN_ROUTE?.trim() || "manage-store";
const projectRoot = process.cwd();

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
  // Pin Turbopack root so it does not walk parent folders looking for lockfiles.
  turbopack: {
    root: projectRoot,
  },
  // Allow LAN device access to Turbopack HMR during local development.
  allowedDevOrigins: ["192.168.31.106", "localhost", "127.0.0.1"],
  // Makes ADMIN_ROUTE available to client bundles for link building only.
  // This is not a security boundary — RBAC still runs on the server.
  env: {
    ADMIN_ROUTE: adminRoute,
  },
  // Admin uploads: images up to 10 MB; reel videos up to 50 MB (+ multipart overhead).
  // proxyClientMaxBodySize is required because `src/proxy.ts` buffers the request —
  // the default 10 MB truncates large FormData and causes "Unexpected end of form".
  // Security headers (CSP media-src) come from buildSecurityHeaders() — restart
  // `next dev` after changing src/lib/security/headers.ts so reel MP4s can play.
  experimental: {
    serverActions: {
      bodySizeLimit: "52mb",
    },
    proxyClientMaxBodySize: "52mb",
    optimizePackageImports: ["@mui/icons-material", "@mui/material"],
  },
  // Serve Supabase/CDN URLs directly — never proxy through /_next/image.
  // The default optimizer times out fetching remote storage on slow networks
  // (TimeoutError 500s). Custom loader must use `width` (see image-loader.ts);
  // optional Supabase Image Transforms apply when NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM is set.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    // ProductCard uses 70; default Next quality is 75.
    qualities: [70, 75],
    minimumCacheTTL: 86400,
    // Local/Windows DNS often resolves *.supabase.co via NAT64 (64:ff9b::…) which
    // Next treats as a private IP and blocks. remotePatterns still limit hosts.
    dangerouslyAllowLocalIP: true,
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
  // PackFileCacheStrategy rename (*.pack.gz_ → *.pack.gz) often ENOENTs on
  // Windows HDD / Defender locks. Memory cache avoids that pack write.
  // Cap parallelism hard so huge vendor-chunks/next.js (~15MB) is not
  // half-written when another request evaluates it
  // (SyntaxError / TypeError reading 'call').
  // Prefer `npm run dev` (Turbopack) on HDD — these knobs only apply to
  // `npm run dev:webpack`.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
      config.parallelism = 1;
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 800,
        ignored: config.watchOptions?.ignored,
      };
    }
    return config;
  },
};

export default nextConfig;
