/**
 * Bypass Next.js `/_next/image` proxy entirely.
 *
 * The default optimizer fetches remote Supabase files server-side with a short
 * timeout; on slow disks/networks that returns TimeoutError 500s and stalls
 * the page. The browser (and Supabase CDN / optional transforms) load images
 * directly instead — permanent and works in prod + local.
 */
export default function imageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return src;
}
