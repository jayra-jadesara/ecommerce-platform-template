import "server-only";

import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeErrorAudit } from "@/features/error-monitoring/audit";
import { persistErrorLog } from "@/features/error-monitoring/persist";
import type { LogErrorInput, LogErrorResult } from "@/features/error-monitoring/types";
import {
  CUSTOMER_SAFE_MESSAGE,
  PAYMENT_SAFE_MESSAGE,
} from "@/features/error-monitoring/types";

/**
 * Central server logger. Never throws. Never recursively logs logger failures.
 */
export async function logError(input: LogErrorInput): Promise<LogErrorResult> {
  let storeId = input.storeId ?? null;
  let userId = input.userId ?? null;
  let userLogin = input.userLogin ?? null;

  try {
    if (!storeId) {
      storeId = await resolveActiveStoreId();
    }
  } catch {
    // ignore
  }

  try {
    if (!userId || !userLogin) {
      const user = await getCurrentUser();
      if (user) {
        userId = userId ?? user.id;
        userLogin = userLogin ?? user.email ?? null;
      }
    }
  } catch {
    // ignore
  }

  const result = await persistErrorLog({
    ...input,
    storeId,
    userId,
    userLogin,
  });

  if (result.id && !result.grouped) {
    await writeErrorAudit({
      storeId,
      userId,
      action: "ERROR_LOG_CREATED",
      entityId: result.id,
      referenceId: result.referenceId,
    });
  }

  return result;
}

/** Convenience for payment pipeline failures. */
export async function logPaymentError(
  input: Omit<LogErrorInput, "type" | "source" | "safeMessage"> & {
    type?: LogErrorInput["type"];
    source?: LogErrorInput["source"];
    severity?: LogErrorInput["severity"];
    feature?: string | null;
  },
): Promise<LogErrorResult> {
  return logError({
    ...input,
    type: input.type ?? "PAYMENT",
    source: input.source ?? "PROVIDER",
    feature: input.feature ?? "PAYMENT",
    provider: input.provider ?? "razorpay",
    severity: input.severity ?? "ERROR",
    safeMessage: PAYMENT_SAFE_MESSAGE,
  });
}

export function customerFacingError(
  referenceId?: string | null,
  payment = false,
): { error: string; referenceId?: string } {
  const base = payment ? PAYMENT_SAFE_MESSAGE : CUSTOMER_SAFE_MESSAGE;
  if (referenceId) {
    return {
      error: `${base} Reference: ${referenceId}`,
      referenceId,
    };
  }
  return { error: base };
}
