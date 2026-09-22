/** Plain-language labels and insights for management PDFs. */

export const REPORT_LABELS = {
  ordersReceived: "Orders received",
  paidOrders: "Paid orders",
  delivered: "Delivered",
  avgOrderValue: "Average order value",
  paidShare: "Orders that got paid",
  deliveredShare: "Paid orders delivered",
  profit: "Profit (after product cost)",
  currency: "Currency",
  paymentReceived: "Payment received",
  waitingToShip: "Waiting to pack or ship",
  date: "Date",
  revenue: "Revenue",
  units: "Units sold",
  product: "Product",
  status: "Status",
  share: "Share",
  reviews: "Reviews",
  avgRating: "Avg rating",
} as const;

export function pct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function revenueInsights(input: {
  placed: number;
  paid: number;
  delivered: number;
  revenueLabel: string;
  profitLabel: string | null;
  aovLabel: string | null;
  topProduct: string | null;
  bestDay: string | null;
}): string[] {
  const out: string[] = [];
  if (input.paid > 0 && input.placed > 0) {
    out.push(
      `${input.paid} out of ${input.placed} orders were paid (${pct(input.paid / input.placed)}).`,
    );
  }
  if (input.aovLabel) {
    out.push(`Average paid order was ${input.aovLabel}.`);
  }
  if (input.paid > 0) {
    out.push(
      `${input.delivered} of ${input.paid} paid orders were delivered (${pct(input.delivered / input.paid)}).`,
    );
  }
  if (input.profitLabel) {
    out.push(`Profit after product cost: ${input.profitLabel}.`);
  }
  if (input.topProduct) {
    out.push(`Best seller: ${input.topProduct}.`);
  }
  if (input.bestDay) {
    out.push(`Best sales day: ${input.bestDay}.`);
  }
  if (!out.length) {
    out.push("No paid orders in this period yet.");
  }
  return out.slice(0, 6);
}

export function productsInsights(input: {
  topName: string | null;
  topUnits: number;
  topRevenue: string | null;
  secondName: string | null;
  secondUnits: number;
  topShare: string | null;
}): string[] {
  if (!input.topName) return ["No product sales in this period yet."];
  const out = [
    `${input.topName} sold the most — ${input.topUnits} units${input.topRevenue ? ` (${input.topRevenue})` : ""}.`,
  ];
  if (input.secondName) {
    out.push(
      `Next: ${input.secondName} with ${input.secondUnits} units.`,
    );
  }
  if (input.topShare) {
    out.push(`Top product is ${input.topShare} of listed sales revenue.`);
  }
  return out;
}

export function fulfillmentInsights(input: {
  inPipeline: number;
  cancelled: number;
  cancelPct: string;
  delivered: number;
}): string[] {
  return [
    input.inPipeline > 0
      ? `${input.inPipeline} orders still need packing or shipping.`
      : "Nothing waiting to pack or ship right now.",
    input.cancelled > 0
      ? `${input.cancelled} orders were cancelled (${input.cancelPct}).`
      : "No cancellations in this period.",
    input.delivered > 0
      ? `${input.delivered} orders were delivered.`
      : "No deliveries recorded in this period.",
  ];
}

export function inventoryInsights(input: {
  outOfStock: number;
  lowStock: number;
}): string[] {
  return [
    "This list shows current stock — not past sales.",
    input.outOfStock > 0
      ? `${input.outOfStock} item(s) are out of stock — restock to avoid lost sales.`
      : "Nothing is fully out of stock.",
    input.lowStock > 0
      ? `${input.lowStock} item(s) are running low.`
      : "No low-stock warnings.",
  ];
}

export function customersInsights(input: {
  paidBuyers: number;
  guestPaid: number;
  pending: number;
  avgRating: number | null;
  reviewTotal: number;
}): string[] {
  const totalCheckouts = input.paidBuyers + input.guestPaid;
  return [
    totalCheckouts > 0
      ? `${totalCheckouts} paid checkout(s) — ${input.paidBuyers} with accounts, ${input.guestPaid} as guest.`
      : "No paid orders in this period.",
    input.pending > 0
      ? `${input.pending} review(s) waiting to be approved.`
      : "No reviews waiting for approval.",
    input.avgRating != null
      ? `Average rating ${input.avgRating}★ from ${input.reviewTotal} review(s).`
      : "No reviews in this period.",
  ];
}
