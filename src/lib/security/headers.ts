/**
 * Compatible production security headers for Next.js + Razorpay + Supabase + optional 3D.
 * CSP is intentionally pragmatic — tighten further per-deploy after measuring.
 */

export const SECURITY_HEADER_ENTRIES: Array<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      // Next.js + theme boot + Razorpay checkout script
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com",
      "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
    ].join("; "),
  },
];

/** Paths that should not inherit long-lived caching semantics from other header blocks. */
export function buildSecurityHeaders(): Array<{
  source: string;
  headers: Array<{ key: string; value: string }>;
}> {
  return [
    {
      source: "/:path*",
      headers: SECURITY_HEADER_ENTRIES,
    },
  ];
}
