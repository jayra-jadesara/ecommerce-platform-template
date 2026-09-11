import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isBrowserTabError,
  isPaymentRelated,
} from "@/features/error-monitoring/classify";
import type {
  ErrorLogRow,
  ErrorLogTab,
  ErrorSeverity,
  ErrorStatus,
} from "@/features/error-monitoring/types";

export type ErrorLogListFilters = {
  storeId: string;
  tab: ErrorLogTab;
  page?: number;
  pageSize?: number;
  q?: string;
  severity?: ErrorSeverity | "ALL";
  status?: ErrorStatus | "ALL";
  paymentOnly?: boolean;
  feature?: string;
  todayOnly?: boolean;
};

export type ErrorLogCounts = {
  open: number;
  critical: number;
  today: number;
  payment: number;
};

function mapRow(row: Record<string, unknown>): ErrorLogRow {
  return {
    ...(row as unknown as ErrorLogRow),
    metadata_json:
      (row.metadata_json as Record<string, unknown> | null) ?? {},
  };
}

export async function listErrorLogs(
  filters: ErrorLogListFilters,
): Promise<{ items: ErrorLogRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("error_logs")
    .select("*", { count: "exact" })
    .eq("store_id", filters.storeId)
    .order("last_seen_at", { ascending: false })
    .range(from, to);

  if (filters.tab === "browser") {
    query = query.or(
      "error_source.eq.CLIENT,error_type.in.(BROWSER,REACT,PAGE)",
    );
  } else {
    query = query.in("error_source", [
      "SERVER",
      "DATABASE",
      "WEBHOOK",
      "PROVIDER",
    ]);
  }

  if (filters.severity && filters.severity !== "ALL") {
    query = query.eq("severity", filters.severity);
  }
  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.paymentOnly) {
    query = query.or(
      "error_type.eq.PAYMENT,error_type.eq.WEBHOOK,feature.eq.PAYMENT,feature.eq.CHECKOUT,payment_id.not.is.null",
    );
  }
  if (filters.feature) {
    query = query.eq("feature", filters.feature);
  }
  if (filters.todayOnly) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    query = query.gte("created_at", start.toISOString());
  }
  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,.()]/g, "").slice(0, 120);
    const like = `%${safe}%`;
    const uuidLike =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        q,
      );
    if (uuidLike) {
      query = query.or(
        `reference_id.ilike.${like},message.ilike.${like},route.ilike.${like},user_login.ilike.${like},order_id.eq.${q},payment_id.eq.${q}`,
      );
    } else {
      query = query.or(
        `reference_id.ilike.${like},message.ilike.${like},route.ilike.${like},user_login.ilike.${like}`,
      );
    }
  }

  const { data, count, error } = await query;
  if (error) {
    return { items: [], total: 0, page, pageSize };
  }

  let items = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));

  // Extra client-side tab safety if PostgREST or() is ambiguous for mixed rows.
  items = items.filter((row) =>
    filters.tab === "browser"
      ? isBrowserTabError(row)
      : !isBrowserTabError(row),
  );

  if (filters.paymentOnly) {
    items = items.filter((row) => isPaymentRelated(row));
  }

  return { items, total: count ?? items.length, page, pageSize };
}

export async function getErrorLogById(input: {
  storeId: string;
  id: string;
}): Promise<ErrorLogRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("error_logs")
    .select("*")
    .eq("id", input.id)
    .eq("store_id", input.storeId)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getErrorLogCounts(
  storeId: string,
): Promise<ErrorLogCounts> {
  const supabase = await createSupabaseServerClient();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const iso = start.toISOString();

  const [openRes, criticalRes, todayRes, paymentRes] = await Promise.all([
    supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "OPEN"),
    supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("severity", "CRITICAL")
      .in("status", ["OPEN", "INVESTIGATING"]),
    supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("created_at", iso),
    supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .or(
        "error_type.eq.PAYMENT,error_type.eq.WEBHOOK,feature.eq.PAYMENT,payment_id.not.is.null",
      ),
  ]);

  return {
    open: openRes.count ?? 0,
    critical: criticalRes.count ?? 0,
    today: todayRes.count ?? 0,
    payment: paymentRes.count ?? 0,
  };
}
