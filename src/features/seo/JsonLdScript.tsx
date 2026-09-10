"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";
import { serializeJsonLd, type JsonLd } from "@/features/seo/json-ld";

/**
 * Renders JSON-LD via the SSR HTML stream (outside the React tree) so React 19
 * does not warn about <script> tags in components.
 * Uses JSON.stringify + < escaping — never unsanitized CMS HTML.
 */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  const html = serializeJsonLd(data);
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  });

  return null;
}
