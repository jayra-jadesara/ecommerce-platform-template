"use client";

import { StorefrontLoaderMark } from "@/components/ui/StorefrontLoaderMark";
import { usePlatformConfig } from "@/providers/PlatformConfigProvider";
import { cn } from "@/lib/cn";

interface LoadingStateProps {
  label?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingState({
  label,
  className,
  fullPage = false,
}: LoadingStateProps) {
  const { ui } = usePlatformConfig();
  const text = (label ?? ui?.loaderLabel ?? "Loading…").trim() || "Loading…";
  const style = ui?.loaderStyle ?? "spinner";

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
      aria-label={text}
    >
      <StorefrontLoaderMark style={style} size={fullPage ? 32 : 28} />
      <span className="text-sm">{text}</span>
    </div>
  );
}
