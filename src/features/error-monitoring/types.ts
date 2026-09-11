/**
 * Phase 27 — error monitoring types & allow-lists.
 */

export const ERROR_TYPES = [
  "BROWSER",
  "REACT",
  "PAGE",
  "SERVER",
  "DATABASE",
  "API",
  "AUTH",
  "CART",
  "CHECKOUT",
  "PAYMENT",
  "WEBHOOK",
  "ORDER",
  "INVENTORY",
  "STORAGE",
  "CMS",
  "UNKNOWN",
] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export const ERROR_SOURCES = [
  "CLIENT",
  "SERVER",
  "DATABASE",
  "WEBHOOK",
  "PROVIDER",
] as const;
export type ErrorSource = (typeof ERROR_SOURCES)[number];

export const ERROR_SEVERITIES = ["INFO", "WARNING", "ERROR", "CRITICAL"] as const;
export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

export const ERROR_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "RESOLVED",
  "IGNORED",
] as const;
export type ErrorStatus = (typeof ERROR_STATUSES)[number];

/** Primary Admin tabs. */
export type ErrorLogTab = "browser" | "server";

export type LogErrorInput = {
  type: ErrorType;
  source: ErrorSource;
  severity?: ErrorSeverity;
  message: string;
  error?: unknown;
  safeMessage?: string;
  stack?: string | null;
  fileName?: string | null;
  lineNumber?: number | null;
  columnNumber?: number | null;
  functionName?: string | null;
  route?: string | null;
  pageName?: string | null;
  requestMethod?: string | null;
  requestPath?: string | null;
  httpStatus?: number | null;
  operation?: string | null;
  feature?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  storeId?: string | null;
  userId?: string | null;
  userLogin?: string | null;
  userRole?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  provider?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  webhookEventId?: string | null;
  errorCode?: string | null;
  databaseCode?: string | null;
  browserName?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  deviceType?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Skip fingerprint grouping (force new row). */
  forceNew?: boolean;
};

export type LogErrorResult = {
  referenceId: string;
  id: string | null;
  grouped: boolean;
};

export type ErrorLogRow = {
  id: string;
  reference_id: string;
  store_id: string | null;
  user_id: string | null;
  user_login: string | null;
  user_role: string | null;
  error_type: ErrorType;
  error_source: ErrorSource;
  severity: ErrorSeverity;
  status: ErrorStatus;
  message: string;
  safe_message: string;
  stack: string | null;
  file_name: string | null;
  line_number: number | null;
  column_number: number | null;
  function_name: string | null;
  route: string | null;
  page_name: string | null;
  request_method: string | null;
  request_path: string | null;
  http_status: number | null;
  operation: string | null;
  feature: string | null;
  entity_type: string | null;
  entity_id: string | null;
  order_id: string | null;
  payment_id: string | null;
  provider: string | null;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  webhook_event_id: string | null;
  error_code: string | null;
  database_code: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os: string | null;
  device_type: string | null;
  user_agent: string | null;
  metadata_json: Record<string, unknown>;
  fingerprint: string;
  first_seen_at: string;
  last_seen_at: string;
  occurrence_count: number;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export const LIMITS = {
  message: 2_000,
  stack: 12_000,
  route: 500,
  userAgent: 500,
  userLogin: 320,
  metadataJsonChars: 8_000,
  metadataKeys: 40,
  fileName: 400,
  operation: 120,
  feature: 80,
  pageName: 120,
  errorCode: 120,
  adminNote: 2_000,
} as const;

export const CUSTOMER_SAFE_MESSAGE =
  "We're looking into this issue. Please try again in a moment.";

export const CUSTOMER_SAFE_TITLE = "Something went wrong.";

export const PAYMENT_SAFE_MESSAGE =
  "Payment couldn't be completed. We're looking into this issue. Please try again.";
