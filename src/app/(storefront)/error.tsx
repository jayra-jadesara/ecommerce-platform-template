"use client";

import Button from "@mui/material/Button";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageShell } from "@/components/layout";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <ErrorState
        title="Something went wrong"
        message={error.message || "An unexpected error occurred."}
        action={
          <Button variant="contained" color="primary" onClick={reset}>
            Try again
          </Button>
        }
      />
    </PageShell>
  );
}
