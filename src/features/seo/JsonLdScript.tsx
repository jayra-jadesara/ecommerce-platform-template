import type { ReactNode } from "react";
import { serializeJsonLd, type JsonLd } from "@/features/seo/json-ld";

/**
 * Renders JSON-LD from a server-built object.
 * Uses JSON.stringify + < escaping — never unsanitized CMS HTML.
 */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }): ReactNode {
  return (
    <script
      type="application/ld+json"
      // Safe: serializeJsonLd escapes <; data is structured from validated fields only.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
