"use client";

import { useEffect } from "react";
import { reportClientError } from "@/features/error-monitoring/client/report";
import {
  CUSTOMER_SAFE_MESSAGE,
  CUSTOMER_SAFE_TITLE,
} from "@/features/error-monitoring/types";

/**
 * Root layout crash boundary — must define its own html/body.
 * Uses the shared client reporter (15s dedupe) so we do not double-insert
 * alongside segment error.tsx / AppErrorBoundary when fingerprints align.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      type: "PAGE",
      source: "CLIENT",
      message: error.message || "Global application error",
      stack: error.stack ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      operation: "GLOBAL_ERROR",
      errorCode: error.digest ?? null,
      clientFingerprint: `global:${error.digest ?? error.message.slice(0, 80)}`,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#111",
        }}
      >
        <main
          style={{
            maxWidth: 480,
            margin: "4rem auto",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem" }}>{CUSTOMER_SAFE_TITLE}</h1>
          <p style={{ color: "#555" }}>{CUSTOMER_SAFE_MESSAGE}</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: 8,
              border: "none",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}
