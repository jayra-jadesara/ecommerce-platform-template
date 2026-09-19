/**
 * Custom Next.js image loader (see next.config.ts `images.loaderFile`).
 *
 * Root cause of `next-image-missing-loader-width`: the previous loader returned
 * `src` unchanged, so Next.js saw identical URLs for every width and warned.
 *
 * Architecture (unchanged):
 * - Bypass `/_next/image` (remote Supabase fetches timed out via the default optimizer).
 * - When `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM` is enabled, rewrite public object
 *   URLs to Supabase `/storage/v1/render/image/public/…` with real width/quality.
 * - Otherwise still embed width/quality in the URL query so srcset candidates
 *   differ (object storage ignores unknown params; images keep loading).
 */

type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

function clampWidth(width: number): number {
  return Math.min(2500, Math.max(1, Math.floor(width)));
}

function clampQuality(quality: number | undefined): number {
  const q = quality ?? 75;
  return Math.min(100, Math.max(20, Math.floor(q)));
}

function transformsEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM;
  return flag === "1" || flag === "true";
}

/** Rewrite a Supabase public object URL to the image transform endpoint. */
function toSupabaseRenderUrl(
  src: string,
  width: number,
  quality: number,
): string | null {
  try {
    const url = new URL(src);
    const { pathname } = url;

    if (pathname.includes(RENDER_PUBLIC)) {
      url.searchParams.set("width", String(width));
      url.searchParams.set("quality", String(quality));
      if (!url.searchParams.has("resize")) {
        url.searchParams.set("resize", "contain");
      }
      return url.toString();
    }

    const idx = pathname.indexOf(OBJECT_PUBLIC);
    if (idx === -1) return null;

    const objectPath = pathname.slice(idx + OBJECT_PUBLIC.length);
    url.pathname = `${RENDER_PUBLIC}${objectPath}`;
    url.search = "";
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality));
    url.searchParams.set("resize", "contain");
    return url.toString();
  } catch {
    return null;
  }
}

/** Ensure width appears in the URL (satisfies Next.js loader-width check). */
function withWidthQuery(src: string, width: number, quality: number): string {
  try {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality));
    return url.toString();
  } catch {
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}width=${width}&quality=${quality}`;
  }
}

export default function imageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const w = clampWidth(width);
  const q = clampQuality(quality);

  if (transformsEnabled()) {
    const rendered = toSupabaseRenderUrl(src, w, q);
    if (rendered) return rendered;
  }

  return withWidthQuery(src, w, q);
}
