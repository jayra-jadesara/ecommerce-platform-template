"use client";

import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useHasHydrated } from "@/lib/use-has-hydrated";
import { cn } from "@/lib/cn";

type FloatingWhatsAppButtonProps = {
  href: string;
};

/**
 * Fixed bottom-left WhatsApp chat button (storefront).
 * Success color, pulse ring, hover lift — left side so it clears ScrollToTop.
 */
export function FloatingWhatsAppButton({ href }: FloatingWhatsAppButtonProps) {
  const hydrated = useHasHydrated();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  if (!hydrated || !href.trim()) return null;

  return createPortal(
    <a
      href={href.trim()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className={cn(
        "sf-wa-float",
        ready ? "sf-wa-float--in" : "sf-wa-float--out",
      )}
    >
      <span aria-hidden className="sf-wa-float__ping" />
      <WhatsAppIcon sx={{ fontSize: 28, position: "relative", zIndex: 1 }} />
    </a>,
    document.body,
  );
}
