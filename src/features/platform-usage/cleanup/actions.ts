"use server";

import { getAdminPath } from "@/config/admin-route";
import type { CleanupActionId } from "@/features/platform-usage/cleanup/types";
import {
  DEFAULT_RETENTION_MONTHS,
  isValidRetentionMonths,
  type RetentionMonths,
} from "@/features/platform-usage/cleanup/retention";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

const HOSTING_ROUTE = getAdminPath("/platform-usage");

async function cleanupService() {
  return import("@/features/platform-usage/cleanup/execute");
}

async function previewService() {
  return import("@/features/platform-usage/cleanup/preview");
}

export async function previewCleanupAction(
  action: CleanupActionId,
  retentionMonths?: number,
) {
  const { getCurrentAdmin } = await import("@/features/auth/session");
  const { hasAnyRole } = await import("@/features/auth/permissions");
  const admin = await getCurrentAdmin();
  if (!admin || !hasAnyRole(admin.roles, ["SUPER_ADMIN"])) {
    return {
      ok: false as const,
      error: "Only a Super Admin can preview storage cleanup.",
    };
  }

  try {
    const { previewCleanup } = await previewService();
    const months =
      action === "purge_older_than"
        ? isValidRetentionMonths(retentionMonths)
          ? retentionMonths
          : DEFAULT_RETENTION_MONTHS
        : undefined;
    const preview = await previewCleanup(action, months);
    return { ok: true as const, preview };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Preview failed.",
    };
  }
}

export async function executeCleanupAction(input: {
  action: CleanupActionId;
  confirmPhrase: string;
  retentionMonths?: number;
}) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: `CLEANUP_${input.action.toUpperCase()}`,
      feature: "PLATFORM",
      route: HOSTING_ROUTE,
    },
    async () => {
      const { executeCleanup } = await cleanupService();
      return executeCleanup({
        action: input.action,
        confirmPhrase: input.confirmPhrase,
        retentionMonths: input.retentionMonths as RetentionMonths | undefined,
      });
    },
  );
}
