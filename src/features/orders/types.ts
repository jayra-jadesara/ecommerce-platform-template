import type { OrderStatus, PaymentStatus } from "@/types/database";
import type { ShippingAddressSnapshot } from "@/features/addresses/types";
import type { PaymentInstrument } from "@/features/payments/razorpay-instrument";
import type {
  ReplaceRequestStatus,
  ReplaceStoreRules,
} from "@/features/shipping/policies";

export type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  currency: string;
  createdAt: string;
  itemCount: number;
  paymentStatus: PaymentStatus | null;
  /** razorpay | cod | … */
  paymentProvider?: string | null;
  /** Coarse method from provider (card, upi, cod, …). */
  paymentMethod?: string | null;
  /** Rich Razorpay instrument when captured. */
  paymentInstrument?: PaymentInstrument | null;
  customerEmail?: string | null;
  customerName?: string | null;
  /** True when an open or granted replace request exists for the order. */
  hasOpenReplace?: boolean;
  /** Open replace status (REQUESTED or APPROVED) for admin Progress column. */
  openReplaceStatus?: ReplaceRequestStatus | null;
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
  returnPolicy: "no_return_refund" | "no_replace" | "replace_only";
  /** Derived: false when cash refund is blocked. */
  returnsAllowed: boolean;
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
  instrument: PaymentInstrument | null;
};

export type OrderActivityView = {
  id: string;
  eventType: string;
  message: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type OrderReplaceRequestView = {
  id: string;
  orderId: string;
  orderItemId: string;
  productName: string;
  status: ReplaceRequestStatus;
  reason: string;
  reasonCode: string | null;
  customerNote: string | null;
  adminNote: string | null;
  photoUrl: string | null;
  quantity: number;
  createdAt: string;
  reviewedAt: string | null;
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
  courierProvider: string | null;
  courierShipmentId: string | null;
  trackingStatus: string | null;
  trackingSyncedAt: string | null;
  trackingPayload: {
    status?: string;
    awb?: string;
    provider?: string;
    events?: Array<{
      at: string | null;
      status: string;
      location?: string | null;
      detail?: string | null;
    }>;
    syncedAt?: string;
    rawSummary?: string | null;
  } | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReasonCode: string | null;
  cancelReason: string | null;
  inventoryFinalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemView[];
  payment: OrderPaymentView | null;
  activities: OrderActivityView[];
  replaceRequests: OrderReplaceRequestView[];
  /** @deprecated Prefer replaceRules.photoRequired */
  replacePhotoRequired: boolean;
  replaceRules: ReplaceStoreRules;
  /** Admin-configured COD cancel reason presets */
  cancelReasonOptions: string[];
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
