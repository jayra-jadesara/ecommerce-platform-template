"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateCareerApplicationStatusAction } from "@/features/career/actions";
import type { CareerApplication } from "@/features/career/types";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/cn";

const STATUS_OPTIONS = ["NEW", "REVIEWED", "ARCHIVED"] as const;

export function CareerApplicationsInbox({
  applications,
  canUpdate,
}: {
  applications: CareerApplication[];
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted)]">
        Text-only applications (no attachments). Ask candidates to email their CV
        to the careers address on the page.
      </p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        {applications.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
            No applications yet.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--color-surface)] text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Email</th>
                <th className="px-3 py-2.5 font-medium">Phone</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Location</th>
                <th className="px-3 py-2.5 font-medium">Message</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Applied</th>
                {canUpdate ? (
                  <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.id}
                  className="border-t border-[var(--color-border)] align-top"
                >
                  <td className="px-3 py-2.5 font-medium text-[var(--color-foreground)]">
                    {app.name}
                    {app.linkedinUrl ? (
                      <a
                        href={app.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block text-[0.7rem] font-normal text-[var(--color-primary)] underline-offset-2 hover:underline"
                      >
                        Portfolio
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <a
                      href={`mailto:${app.email}`}
                      className="text-[var(--color-foreground)] underline-offset-2 hover:underline"
                    >
                      {app.email}
                    </a>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--color-muted)]">
                    {app.phone || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-muted)]">
                    {[app.department, app.position].filter(Boolean).join(" · ") ||
                      "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--color-muted)]">
                    {[app.city, app.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="max-w-[12rem] px-3 py-2.5 text-[var(--color-muted)]">
                    <span className="line-clamp-2 whitespace-pre-wrap">
                      {app.message?.trim() || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide",
                        app.status === "NEW"
                          ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
                          : app.status === "REVIEWED"
                            ? "bg-[var(--color-surface)] text-[var(--color-foreground)]"
                            : "bg-[var(--color-surface)] text-[var(--color-muted)]",
                      )}
                    >
                      {app.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--color-muted)]">
                    {formatDateTime(app.createdAt)}
                  </td>
                  {canUpdate ? (
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {STATUS_OPTIONS.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={pending || app.status === status}
                            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[0.65rem] font-semibold disabled:opacity-40"
                            onClick={() => {
                              startTransition(async () => {
                                setError(null);
                                const result =
                                  await updateCareerApplicationStatusAction(
                                    app.id,
                                    status,
                                  );
                                if (!result.ok) {
                                  setError(result.error);
                                  return;
                                }
                                router.refresh();
                              });
                            }}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
