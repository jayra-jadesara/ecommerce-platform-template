export type CleanupActionId =
  | "format_reset"
  | "clear_orders_payments"
  | "clear_activity_logs"
  | "clear_replace_photos";

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
};
