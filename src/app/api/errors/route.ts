import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveActiveStoreId } from "@/features/admin/settings/store-context";
import { getCurrentUser } from "@/features/auth/session";
import { writeErrorAudit } from "@/features/error-monitoring/audit";
import { persistErrorLog } from "@/features/error-monitoring/persist";
import {
  ERROR_SOURCES,
  ERROR_TYPES,
  LIMITS,
} from "@/features/error-monitoring/types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).max(LIMITS.message),
  stack: z.string().max(LIMITS.stack).optional().nullable(),
  route: z.string().max(LIMITS.route).optional().nullable(),
  pageName: z.string().max(LIMITS.pageName).optional().nullable(),
  source: z.enum(ERROR_SOURCES).optional(),
  type: z.enum(ERROR_TYPES).optional(),
  fileName: z.string().max(LIMITS.fileName).optional().nullable(),
  lineNumber: z.number().int().min(0).max(1_000_000).optional().nullable(),
  columnNumber: z.number().int().min(0).max(1_000_000).optional().nullable(),
  operation: z.string().max(LIMITS.operation).optional().nullable(),
  feature: z.string().max(LIMITS.feature).optional().nullable(),
  errorCode: z.string().max(LIMITS.errorCode).optional().nullable(),
  browserName: z.string().max(80).optional().nullable(),
  browserVersion: z.string().max(40).optional().nullable(),
  os: z.string().max(80).optional().nullable(),
  deviceType: z.string().max(40).optional().nullable(),
  userAgent: z.string().max(LIMITS.userAgent).optional().nullable(),
  clientFingerprint: z.string().max(200).optional().nullable(),
});

/**
 * Browser error ingestion — validates, rate-limits, sanitizes, and inserts
 * via service role. Never trusts client identity fields.
 */
export async function POST(request: Request) {
  try {
    const forwarded = request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();
    const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
    const limited = checkRateLimit({
      key: `errors:${ip}`,
      limit: RATE_LIMITS.errors.limit,
      windowMs: RATE_LIMITS.errors.windowMs,
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(1, Math.ceil(limited.retryAfterMs / 1000)),
            ),
          },
        },
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 32_000) {
      return NextResponse.json({ error: "Payload too large." }, { status: 413 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const data = parsed.data;
    const type = data.type ?? "BROWSER";
    // Clients may only report client-side categories.
    const allowedClientTypes = new Set([
      "BROWSER",
      "REACT",
      "PAGE",
      "CART",
      "CHECKOUT",
      "UNKNOWN",
    ]);
    const safeType = allowedClientTypes.has(type) ? type : "BROWSER";

    let storeId: string | null = null;
    let userId: string | null = null;
    let userLogin: string | null = null;
    try {
      storeId = await resolveActiveStoreId();
    } catch {
      /* ignore */
    }
    try {
      const user = await getCurrentUser();
      if (user) {
        userId = user.id;
        userLogin = user.email ?? null;
      }
    } catch {
      /* ignore */
    }

    const result = await persistErrorLog({
      type: safeType,
      source: "CLIENT",
      severity: "ERROR",
      message: data.message,
      stack: data.stack,
      route: data.route,
      pageName: data.pageName,
      fileName: data.fileName,
      lineNumber: data.lineNumber ?? null,
      columnNumber: data.columnNumber ?? null,
      operation: data.operation,
      feature: data.feature,
      errorCode: data.errorCode,
      browserName: data.browserName,
      browserVersion: data.browserVersion,
      os: data.os,
      deviceType: data.deviceType,
      userAgent: data.userAgent ?? request.headers.get("user-agent"),
      storeId,
      userId,
      userLogin,
      metadata: data.clientFingerprint
        ? { clientFingerprint: data.clientFingerprint }
        : null,
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

    return NextResponse.json({
      ok: true,
      referenceId: result.referenceId,
    });
  } catch {
    // Logging must never break the client.
    return NextResponse.json({ ok: true });
  }
}
