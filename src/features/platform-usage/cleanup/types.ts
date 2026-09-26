export type CleanupActionId =
  | "format_reset"
  | "clear_orders_payments"
  | "clear_activity_logs"
  | "clear_replace_photos"
  | "purge_older_than";

export type CleanupTableCount = {
  table: string;
  label: string;
  count: number;
};

export type CleanupPreview = {
  action: CleanupActionId;
  title: string;
  description: string;
  confirmPhrase: string;
  tables: CleanupTableCount[];
  storageBuckets: Array<{ bucket: string; label: string }>;
  notes: string[];
  /** Present for purge_older_than */
  retentionMonths?: number;
  cutoffIso?: string;
};

export type CleanupResult = {
  ok: boolean;
  error?: string;
  action?: CleanupActionId;
  deletedRows?: Record<string, number>;
  deletedFiles?: number;
  deletedShoppers?: number;
  warnings?: string[];
  message?: string;
  retentionMonths?: number;
  cutoffIso?: string;
};
