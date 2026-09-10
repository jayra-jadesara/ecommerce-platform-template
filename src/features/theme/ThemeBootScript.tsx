"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

/**
 * Injects the theme FOUC boot script into the SSR HTML stream without
 * rendering a <script> inside the React tree (avoids React 19 warning).
 */
export function ThemeBootScript({ script }: { script: string }) {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return (
      <script
        id="platform-theme-boot"
        dangerouslySetInnerHTML={{ __html: script }}
      />
    );
  });

  return null;
}
