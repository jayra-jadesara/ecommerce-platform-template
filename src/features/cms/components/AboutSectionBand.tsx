import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AboutSectionBandProps = {
  children: ReactNode;
  className?: string;
  /** Heritage train — no max-width clamp; shared vertical rhythm only. */
  fullBleed?: boolean;
  /** Bordered radial surface (Vision/Mission, chapter bands). */
  surface?: "plain" | "band";
};

/**
 * Shared About section shell — one width, one rhythm for /about + homepage highlights.
 */
export function AboutSectionBand({
  children,
  className,
  fullBleed = false,
  surface = "plain",
}: AboutSectionBandProps) {
  return (
    <section
      className={cn(
        "sf-about-band",
        fullBleed && "sf-about-band--bleed",
        surface === "band" && "sf-about-band--surface",
        className,
      )}
    >
      {children}
    </section>
  );
}
