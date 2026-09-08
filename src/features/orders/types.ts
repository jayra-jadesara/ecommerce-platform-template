import type { OrderStatus, PaymentStatus } from "@/types/database";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  createdAt: string;
  itemCount: number;
  paymentStatus: PaymentStatus | null;
  customerEmail?: string | null;
  customerName?: string | null;
};

export type OrderItemView = {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
};

export type OrderPaymentView = {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  failureReason: string | null;
};

export type OrderActivityView = {
  id: string;
  eventType: string;
  message: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type OrderDetail = {
  id: string;
  storeId: string;
  orderNumber: string;
  userId: string | null;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingAmount: number;
  gatewayFee: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  shippingAddress: ShippingAddressSnapshot;
  billingAddress: ShippingAddressSnapshot;
  shippingProvider: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  inventoryFinalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemView[];
  payment: OrderPaymentView | null;
  activities: OrderActivityView[];
  customerEmail?: string | null;
  customerName?: string | null;
};

export type OrderListQuery = {
  page?: number;
  pageSize?: number;
  status?: OrderStatus | "ALL";
  paymentStatus?: PaymentStatus | "ALL";
  search?: string;
  storeId?: string | null;
};

export type OrderListResult = {
  items: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type OrderMutationResult =
  | { ok: true; order: OrderDetail; message?: string }
  | { ok: false; error: string };
