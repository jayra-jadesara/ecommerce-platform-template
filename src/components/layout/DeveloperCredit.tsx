"use client";

import CodeIcon from "@mui/icons-material/Code";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { useEffect, useId, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import creditJson from "@/data/developer-credit.json";
import { useHasHydrated } from "@/lib/use-has-hydrated";

type DeveloperCreditData = {
  enabled: boolean;
  label: string;
  company: string;
  tagline: string;
  email: string;
  phone: string;
  phoneHref: string;
  website: string | null;
  ctaLabel: string;
};

const credit = creditJson as DeveloperCreditData;

const tabStyle: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  margin: 0,
  border: "none",
  background: "var(--color-primary)",
  color: "var(--color-button-foreground, #fff)",
  cursor: "pointer",
  WebkitAppearance: "none",
  appearance: "none",
};

function subscribeCoarsePointer(onStoreChange: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getCoarsePointerSnapshot() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function getCoarsePointerServerSnapshot() {
  return false;
}

/**
 * Fixed right-edge developer marketing strip (storefront only).
 * Collapsed by default; expands on hover / focus / tap.
 * Content is static — edit `src/data/developer-credit.json`.
 */
export function DeveloperCredit() {
  const panelId = useId();
  const hydrated = useHasHydrated();
  const [open, setOpen] = useState(false);
  const coarsePointer = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
    getCoarsePointerServerSnapshot,
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!credit.enabled || !hydrated) return null;

  const phoneHref = credit.phoneHref || credit.phone.replace(/\s+/g, "");

  return createPortal(
    <aside
      className={`sf-dev-credit${open ? " is-open" : ""}`}
      aria-label={`${credit.company} — site developer`}
      style={{
        position: "fixed",
        top: "50%",
        right: 0,
        zIndex: 80,
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "stretch",
        transform: "translateY(-50%)",
      }}
      onMouseEnter={() => {
        if (!coarsePointer) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!coarsePointer) setOpen(false);
      }}
    >
      <button
        type="button"
        className="sf-dev-credit__tab"
        aria-expanded={open}
        aria-controls={panelId}
        style={tabStyle}
        onClick={() => {
          if (coarsePointer) setOpen((value) => !value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!event.currentTarget.parentElement?.contains(next)) {
            setOpen(false);
          }
        }}
      >
        <CodeIcon aria-hidden className="sf-dev-credit__icon" />
        <span className="sf-dev-credit__label">{credit.label}</span>
      </button>

      <div
        id={panelId}
        className="sf-dev-credit__panel"
        style={{
          boxSizing: "border-box",
          width: open ? "var(--sf-dev-panel-width)" : 0,
          maxWidth: open ? "var(--sf-dev-panel-width)" : 0,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          overflow: "hidden",
          pointerEvents: open ? "auto" : "none",
          transform: open ? "translateX(0)" : "translateX(8px)",
          borderTopWidth: open ? 1 : 0,
          borderBottomWidth: open ? 1 : 0,
          borderLeftWidth: open ? 1 : 0,
          borderRightWidth: 0,
          borderStyle: "solid",
          borderColor:
            "color-mix(in srgb, var(--color-primary) 55%, #000)",
          borderRadius: "0.65rem 0 0 0.65rem",
          background: "var(--color-primary)",
          color: "var(--color-button-foreground, #fff)",
          boxShadow: open
            ? "-8px 10px 28px color-mix(in srgb, var(--color-foreground) 18%, transparent)"
            : "none",
          transition:
            "width 0.28s ease, max-width 0.28s ease, opacity 0.2s ease, transform 0.28s ease, visibility 0.2s ease",
        }}
        aria-hidden={!open}
      >
        <div
          style={{
            boxSizing: "border-box",
            width: "var(--sf-dev-panel-width)",
            padding: "0.95rem 1rem 1.05rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.55rem",
                fontWeight: 650,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                opacity: 0.78,
              }}
            >
              Built by
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.88rem",
                fontWeight: 700,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
              }}
            >
              {credit.company}
            </p>
            {credit.tagline ? (
              <p
                style={{
                  margin: "0.15rem 0 0",
                  fontSize: "0.62rem",
                  lineHeight: 1.45,
                  opacity: 0.82,
                }}
              >
                {credit.tagline}
              </p>
            ) : null}
          </div>

          <div
            aria-hidden
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, color-mix(in srgb, #fff 45%, transparent), transparent)",
            }}
          />

          <ul
            style={{
              display: "grid",
              gap: "0.5rem",
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            <li>
              <a
                href={`mailto:${credit.email}`}
                tabIndex={open ? 0 : -1}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.4rem",
                  fontSize: "0.62rem",
                  lineHeight: 1.4,
                  color: "inherit",
                  textDecoration: "none",
                  wordBreak: "break-word",
                  opacity: 0.95,
                }}
              >
                <EmailOutlinedIcon
                  aria-hidden
                  style={{ fontSize: "0.85rem", marginTop: 1, flexShrink: 0 }}
                />
                <span>{credit.email}</span>
              </a>
            </li>
            <li>
              <a
                href={`tel:${phoneHref}`}
                tabIndex={open ? 0 : -1}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.4rem",
                  fontSize: "0.62rem",
                  lineHeight: 1.4,
                  color: "inherit",
                  textDecoration: "none",
                  wordBreak: "break-word",
                  opacity: 0.95,
                }}
              >
                <PhoneOutlinedIcon
                  aria-hidden
                  style={{ fontSize: "0.85rem", marginTop: 1, flexShrink: 0 }}
                />
                <span>{credit.phone}</span>
              </a>
            </li>
            {credit.website ? (
              <li>
                <a
                  href={credit.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={open ? 0 : -1}
                  style={{
                    display: "block",
                    fontSize: "0.62rem",
                    lineHeight: 1.4,
                    color: "inherit",
                    textDecoration: "none",
                    wordBreak: "break-word",
                    opacity: 0.95,
                  }}
                >
                  {credit.website.replace(/^https?:\/\//, "")}
                </a>
              </li>
            ) : null}
          </ul>

          <a
            href={`mailto:${credit.email}?subject=${encodeURIComponent(`Inquiry via ${credit.company}`)}`}
            tabIndex={open ? 0 : -1}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              alignSelf: "flex-start",
              marginTop: "0.15rem",
              minHeight: "1.7rem",
              padding: "0.28rem 0.7rem",
              borderRadius: 999,
              background: "color-mix(in srgb, #fff 92%, transparent)",
              color: "var(--color-primary)",
              fontSize: "0.58rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textDecoration: "none",
            }}
          >
            {credit.ctaLabel}
          </a>
        </div>
      </div>
    </aside>,
    document.body,
  );
}
