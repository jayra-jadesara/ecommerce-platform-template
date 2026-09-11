"use client";

import Button from "@mui/material/Button";
import Link from "next/link";
import { useEffect, useState, startTransition } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageShell } from "@/components/layout";
import { reportClientErrorAsync } from "@/features/error-monitoring/client/report";
import {
  CUSTOMER_SAFE_MESSAGE,
  CUSTOMER_SAFE_TITLE,
} from "@/features/error-monitoring/types";

export default function StorefrontError({
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
      message: error.message || "Page error",
      stack: error.stack ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      operation: "PAGE_ERROR",
      errorCode: error.digest ?? null,
      clientFingerprint: `page:${error.digest ?? error.message.slice(0, 80)}`,
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
    <PageShell>
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
    </PageShell>
  );
}
