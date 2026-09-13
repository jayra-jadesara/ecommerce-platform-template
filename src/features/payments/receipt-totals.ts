export type ReceiptTotals = {
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingAmount: number;
  gatewayFee: number;
  taxAmount: number;
  grandTotal: number;
};

export function receiptDiscountLabel(totals: ReceiptTotals): string {
  return totals.couponCode
    ? `Discount (${totals.couponCode})`
    : "Discount";
}

export function receiptTotalRows(
  totals: ReceiptTotals,
): Array<{ label: string; value: number }> {
  return [
    { label: "Subtotal", value: totals.subtotal },
    { label: receiptDiscountLabel(totals), value: totals.discountAmount },
    { label: "Shipping", value: totals.shippingAmount },
    { label: "Payment fee", value: totals.gatewayFee },
    { label: "Tax", value: totals.taxAmount },
  ];
}
