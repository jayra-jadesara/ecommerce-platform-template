"use client";

import Button from "@mui/material/Button";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { reportClientError } from "@/features/error-monitoring/client/report";
import {
  CUSTOMER_SAFE_MESSAGE,
  CUSTOMER_SAFE_TITLE,
} from "@/features/error-monitoring/types";

export default function AdminError({
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
      message: error.message || "Admin page error",
      stack: error.stack ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      operation: "ADMIN_PAGE_ERROR",
      errorCode: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="p-6">
      <ErrorState
        title={CUSTOMER_SAFE_TITLE}
        message={CUSTOMER_SAFE_MESSAGE}
        action={
          <Button variant="contained" color="primary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
