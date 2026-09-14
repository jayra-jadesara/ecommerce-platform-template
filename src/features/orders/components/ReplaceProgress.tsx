import type { ReplaceRequestStatus } from "@/features/shipping/policies";
import { replaceRequestStatusLabel } from "@/features/shipping/policies";
import { cn } from "@/lib/cn";

const STEPS = [
  { status: "REQUESTED", label: "Requested" },
  { status: "APPROVED", label: "Granted" },
  { status: "FULFILLED", label: "Sent" },
] as const;

const RANK: Record<"REQUESTED" | "APPROVED" | "FULFILLED", number> = {
  REQUESTED: 0,
  APPROVED: 1,
  FULFILLED: 2,
};

/**
 * Labeled O—O—O for replacement: Requested → Granted → Sent.
 */
export function ReplaceProgress({
  status,
  className,
  size = "comfortable",
}: {
  status: ReplaceRequestStatus;
  className?: string;
  size?: "compact" | "comfortable";
}) {
  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <span
        className={cn(
          "inline-flex rounded-full bg-[color-mix(in_srgb,var(--color-error)_14%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-error)]",
          className,
        )}
      >
        {replaceRequestStatusLabel(status)}
      </span>
    );
  }

  const current =
    status === "REQUESTED" || status === "APPROVED" || status === "FULFILLED"
      ? RANK[status]
      : 0;
  const complete = status === "FULFILLED";
  const accent = complete ? "var(--color-success)" : "var(--color-primary)";
  const compact = size === "compact";

  return (
    <div
      className={cn(
        compact ? "min-w-[7.5rem]" : "w-full min-w-[12rem] max-w-sm",
        className,
      )}
      role="group"
      aria-label={replaceRequestStatusLabel(status)}
      title={replaceRequestStatusLabel(status)}
      style={{ ["--progress-accent" as string]: accent }}
    >
      <p className="sr-only">
        Replacement progress: {replaceRequestStatusLabel(status)}
      </p>
      <ol className="flex items-start justify-between gap-0.5">
        {STEPS.map((step, index) => {
          const done = index <= current;
          const active = index === current;
          const isLast = index === STEPS.length - 1;
          return (
            <li
              key={step.status}
              className="relative flex min-w-0 flex-1 flex-col items-center text-center"
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute h-0.5",
                    compact
                      ? "left-[calc(50%+0.45rem)] right-[calc(-50%+0.45rem)] top-[0.4rem]"
                      : "left-[calc(50%+0.55rem)] right-[calc(-50%+0.55rem)] top-[0.55rem]",
                    index < current
                      ? "bg-[var(--progress-accent)]"
                      : "bg-[var(--color-border)]",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] shrink-0 rounded-full border",
                  compact ? "h-2.5 w-2.5 border" : "h-4 w-4 border-2",
                  done
                    ? "border-[var(--progress-accent)] bg-[var(--progress-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)]",
                  active &&
                    !complete &&
                    (compact
                      ? "ring-2 ring-[color-mix(in_srgb,var(--progress-accent)_25%,transparent)]"
                      : "ring-4 ring-[color-mix(in_srgb,var(--progress-accent)_18%,transparent)]"),
                  complete &&
                    done &&
                    !compact &&
                    "ring-4 ring-[color-mix(in_srgb,var(--color-success)_18%,transparent)]",
                )}
                aria-current={active ? "step" : undefined}
              />
              <p
                className={cn(
                  "mt-1.5 font-semibold leading-tight",
                  compact ? "text-[9px]" : "text-[0.7rem] sm:text-xs",
                  complete && done
                    ? "text-[var(--color-success)]"
                    : active || done
                      ? "text-[var(--color-foreground)]"
                      : "text-[var(--color-muted)]",
                )}
              >
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
