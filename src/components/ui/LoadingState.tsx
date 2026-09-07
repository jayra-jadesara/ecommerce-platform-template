import CircularProgress from "@mui/material/CircularProgress";
import { cn } from "@/lib/cn";

interface LoadingStateProps {
  label?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingState({
  label = "Loading…",
  className,
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-[var(--color-muted)]",
        fullPage ? "min-h-[40vh] py-16" : "py-8",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <CircularProgress size={28} thickness={4} color="primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
