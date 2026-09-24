/** Shared Google Maps embed helpers (admin + storefront). */

/** Accept raw embed `src` or a full iframe snippet from Google Maps. */
export function extractGoogleMapsEmbedSrc(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fromIframe = trimmed.match(/src=["']([^"']+)["']/i)?.[1]?.trim();
  return fromIframe || trimmed;
}

export function isAllowedGoogleMapsEmbed(raw: string): boolean {
  const candidate = extractGoogleMapsEmbedSrc(raw);
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    const googleHost =
      host === "google.com" ||
      host === "www.google.com" ||
      host === "maps.google.com" ||
      host.endsWith(".google.com");
    if (!googleHost) return false;
    return (
      url.pathname.includes("/maps") ||
      url.searchParams.has("pb") ||
      url.searchParams.has("q")
    );
  } catch {
    return false;
  }
}

export function buildAddressMapsEmbed(parts: string[]): string | null {
  const query = parts.filter(Boolean).join(", ").trim();
  if (!query) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

export function resolveContactMapsEmbedUrl(input: {
  mapEnabled: boolean;
  embedUrl?: string | null;
  addressParts: string[];
}): string | null {
  if (!input.mapEnabled) return null;
  const raw = input.embedUrl?.trim();
  if (raw && isAllowedGoogleMapsEmbed(raw)) {
    return extractGoogleMapsEmbedSrc(raw);
  }
  return buildAddressMapsEmbed(input.addressParts);
}
