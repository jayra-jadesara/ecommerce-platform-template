"use client";

import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useHasHydrated } from "@/lib/use-has-hydrated";

function readScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function measureDevTabClearance(): number {
  const tab = document.querySelector<HTMLElement>(".sf-dev-credit__tab");
  if (!tab) return 12;
  const style = window.getComputedStyle(tab);
  if (style.display === "none" || style.visibility === "hidden") return 12;
  const width = tab.getBoundingClientRect().width;
  if (width < 4) return 12;
  return Math.ceil(width + 14);
}

/** Britannia-style pennant “Back to top” — clears developer edge tab only. */
export function ScrollToTop() {
  const hydrated = useHasHydrated();
  const [visible, setVisible] = useState(false);
  const [right, setRight] = useState(12);
  const [bottom, setBottom] = useState(20);

  useEffect(() => {
    const onScroll = () => setVisible(readScrollY() > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sync = () => {
      setRight(Math.max(measureDevTabClearance(), 12));
      setBottom(window.matchMedia("(min-width: 768px)").matches ? 40 : 20);
    };
    sync();
    window.addEventListener("resize", sync);
    const tab = document.querySelector(".sf-dev-credit__tab");
    const ro = tab ? new ResizeObserver(sync) : null;
    if (tab && ro) ro.observe(tab);
    return () => {
      window.removeEventListener("resize", sync);
      ro?.disconnect();
    };
  }, []);

  if (!hydrated || !visible) return null;

  const style: CSSProperties = {
    position: "fixed",
    top: "auto",
    left: "auto",
    right,
    bottom,
    zIndex: 70,
  };

  return createPortal(
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="sf-back-to-top group"
      style={style}
    >
      <KeyboardArrowUpIcon
        className="sf-back-to-top__icon transition-transform motion-safe:group-hover:-translate-y-0.5"
        aria-hidden
      />
      <span className="sf-back-to-top__label">
        <span>Back to</span>
        <span>Top</span>
      </span>
    </button>,
    document.body,
  );
}
