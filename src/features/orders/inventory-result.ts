import type { Json } from "@/types/database";

export type InventoryFinalizeResult = {
  ok: boolean;
  alreadyFinalized?: boolean;
  alreadyRestored?: boolean;
  nothingToRestore?: boolean;
  shortages?: Array<{
    variant_id: string;
    order_item_id: string;
    quantity: number;
  }>;
  error?: string;
};

export function parseInventoryRpcResult(
  data: Json | null,
): InventoryFinalizeResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "invalid_rpc_result" };
  }
  const raw = data as Record<string, unknown>;
  return {
    ok: Boolean(raw.ok),
    alreadyFinalized: Boolean(raw.already_finalized ?? raw.alreadyFinalized),
    alreadyRestored: Boolean(raw.already_restored ?? raw.alreadyRestored),
    nothingToRestore: Boolean(raw.nothing_to_restore ?? raw.nothingToRestore),
    shortages: Array.isArray(raw.shortages)
      ? (raw.shortages as InventoryFinalizeResult["shortages"])
      : [],
    error: typeof raw.error === "string" ? raw.error : undefined,
  };
}
