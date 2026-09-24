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
      // Chrome's PDF viewer inside iframe/embed is governed by object-src;
      // 'none' shows "This content is blocked" for blob: PDF previews.
      "object-src 'self' blob:",
      "frame-ancestors 'self'",
      "form-action 'self' mailto:",
      // Next.js + theme boot + Razorpay + Instagram embed.js
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.instagram.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // blob: for object URLs; 127.0.0.1:7429 for local debug ingest only
      "connect-src 'self' blob: http://127.0.0.1:7429 https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com https://fonts.googleapis.com https://fonts.gstatic.com https://www.instagram.com",
      // blob: PDF previews; Razorpay checkout; Instagram reel embeds; Google Maps (contact)
      "frame-src 'self' blob: https://api.razorpay.com https://checkout.razorpay.com https://www.instagram.com https://instagram.com https://www.google.com https://maps.google.com https://*.google.com",
      "worker-src 'self' blob:",
      // Hosted reel MP4s (Supabase Storage) + Instagram CDN fallbacks
      "media-src 'self' blob: https: https://*.supabase.co https://www.instagram.com https://*.cdninstagram.com",
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
