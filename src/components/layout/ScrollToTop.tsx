"use client";

import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useEffect, useState } from "react";

/** Britannia-style pennant “Back to top” — compact on mobile, full on desktop. */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="sf-back-to-top group fixed bottom-5 right-3 z-50 flex flex-col items-center justify-center px-1.5 pb-2 pt-1.5 text-[var(--color-button-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] md:bottom-12 md:right-7 md:justify-start md:px-2.5 md:pb-3 md:pt-2"
    >
      <KeyboardArrowUpIcon
        className="!text-[1rem] transition-transform motion-safe:group-hover:-translate-y-0.5 md:!text-[1.15rem]"
        aria-hidden
      />
      <span className="sf-back-to-top__label mt-0.5 flex-col items-center text-center font-bold uppercase leading-[1.05] tracking-[0.04em]">
        <span className="text-[0.52rem]">Back to</span>
        <span className="text-[0.72rem]">Top</span>
      </span>
    </button>
  );
}
