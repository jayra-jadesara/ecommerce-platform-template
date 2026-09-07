export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function availableQuantity(
  quantity: number,
  reservedQuantity: number,
): number {
  return Math.max(0, quantity - reservedQuantity);
}

export function deriveStockStatus(input: {
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  trackInventory?: boolean;
}): StockStatus {
  if (input.trackInventory === false) return "IN_STOCK";
  const available = availableQuantity(input.quantity, input.reservedQuantity);
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= input.lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

export function aggregateProductStockStatus(
  variants: Array<{
    is_active: boolean;
    track_inventory: boolean;
    inventory?: {
      quantity: number;
      reserved_quantity: number;
      low_stock_threshold: number;
    } | null;
  }>,
): StockStatus {
  const active = variants.filter((variant) => variant.is_active);
  if (!active.length) return "OUT_OF_STOCK";

  const statuses = active.map((variant) => {
    if (!variant.track_inventory) return "IN_STOCK" as const;
    const inv = variant.inventory;
    if (!inv) return "OUT_OF_STOCK" as const;
    return deriveStockStatus({
      quantity: inv.quantity,
      reservedQuantity: inv.reserved_quantity,
      lowStockThreshold: inv.low_stock_threshold,
      trackInventory: true,
    });
  });

  const allOut = statuses.every((status) => status === "OUT_OF_STOCK");
  if (allOut) return "OUT_OF_STOCK";

  const allIn = statuses.every((status) => status === "IN_STOCK");
  if (allIn) return "IN_STOCK";

  return "LOW_STOCK";
}
