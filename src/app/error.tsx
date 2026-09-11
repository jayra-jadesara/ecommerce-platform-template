"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import { useEffect, useState, startTransition } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { reportClientErrorAsync } from "@/features/error-monitoring/client/report";
import {
  CUSTOMER_SAFE_MESSAGE,
  CUSTOMER_SAFE_TITLE,
} from "@/features/error-monitoring/types";

/**
 * Fallback for routes outside storefront/admin segment error boundaries.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [referenceId, setReferenceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void reportClientErrorAsync({
      type: "PAGE",
      source: "CLIENT",
      message: error.message || "Application error",
      stack: error.stack ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      operation: "ROOT_PAGE_ERROR",
      errorCode: error.digest ?? null,
      clientFingerprint: `root:${error.digest ?? error.message.slice(0, 80)}`,
    }).then((ref) => {
      if (ref && !cancelled) {
        startTransition(() => setReferenceId(ref));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <ErrorState
        title={CUSTOMER_SAFE_TITLE}
        message={
          referenceId
            ? `${CUSTOMER_SAFE_MESSAGE} Reference: ${referenceId}`
            : CUSTOMER_SAFE_MESSAGE
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="contained" color="primary" onClick={reset}>
              Try Again
            </Button>
            <Button component={Link} href="/" variant="outlined">
              Back to Store
            </Button>
          </div>
        }
      />
    </main>
  );
}
