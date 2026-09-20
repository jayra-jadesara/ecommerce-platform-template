import "server-only";

import { getCurrentUser } from "@/features/auth/session";
import {
  customerFacingError,
  logPaymentError,
} from "@/features/error-monitoring/logger";
import { writePaymentAudit } from "@/features/payments/audit";
import type { PaymentActionResult } from "@/features/payments/types";
import { getCheckoutSummary } from "@/features/checkout/service";
import { finalizeCodOrder } from "@/features/orders/finalize";
import { createSupabaseServiceClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveReturnPolicy } from "@/features/shipping/policies";
import type { Json } from "@/types/database";
import { randomBytes } from "node:crypto";

function buildOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${stamp}-${rand}`;
}

/**
 * Place a Cash on Delivery order: confirm stock, no online payment, fee off.
 */
export async function createCodCheckoutOrder(input: {
  addressId: string;
  couponCode?: string | null;
}): Promise<PaymentActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to place your order.", code: "UNAUTHORIZED" };
  }

  const summary = await getCheckoutSummary({
    selectedAddressId: input.addressId,
    couponCode: input.couponCode,
    paymentMethod: "cod",
  });

  if (input.couponCode?.trim() && summary.couponMessage && !summary.couponCode) {
    return {
      ok: false,
      error: summary.couponMessage,
      code: "COUPON_INVALID",
    };
  }

  if (summary.step !== "READY_FOR_PAYMENT" || !summary.canProceed) {
    return {
      ok: false,
      error: "Resolve cart and address issues before placing the order.",
      code: "NOT_READY",
    };
  }

  if (!summary.storeId || !summary.pricing || !summary.shippingSnapshot) {
    return {
      ok: false,
      error: "Buy it now is incomplete.",
      code: "INCOMPLETE",
    };
  }

  if (!summary.enabledPaymentMethods.includes("cod")) {
    return {
      ok: false,
      error: "Cash on Delivery is not available for this store.",
      code: "PROVIDER_DISABLED",
    };
  }

  const amountMinor = summary.pricing.grandTotal.minor;
  const currency = summary.pricing.currency.toUpperCase();
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return {
      ok: false,
      error: "Invalid order total.",
      code: "INVALID_AMOUNT",
    };
  }

  // COD totals must never include a payment/gateway fee.
  if (summary.pricing.paymentFee.minor !== 0) {
    return {
      ok: false,
      error: "Could not price Cash on Delivery order.",
      code: "INVALID_FEE",
    };
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: paymentSettings } = await supabaseUser
    .from("payment_settings")
    .select("cod_enabled")
    .eq("store_id", summary.storeId)
    .maybeSingle();

  if (!paymentSettings?.cod_enabled) {
    return {
      ok: false,
      error: "Cash on Delivery is disabled for this store.",
      code: "PROVIDER_DISABLED",
    };
  }

  const supabase = createSupabaseServiceClient();

  const { data: openPayments } = await supabase
    .from("payments")
    .select("id, order_id, status, orders!inner(store_id, user_id, status)")
    .eq("user_id", user.id)
    .in("status", ["CREATED", "PENDING"]);

  for (const row of openPayments ?? []) {
    const orderMeta = row.orders as unknown as {
      store_id: string;
      user_id: string | null;
      status: string;
    };
    if (orderMeta.store_id !== summary.storeId) continue;
    // Never touch payments on already-confirmed orders (e.g. prior COD).
    if (orderMeta.status !== "PENDING") continue;
    await supabase
      .from("payments")
      .update({
        status: "FAILED",
        failure_reason: "Superseded by a new order attempt.",
      })
      .eq("id", row.id)
      .in("status", ["CREATED", "PENDING"]);
    await supabase
      .from("orders")
      .update({ status: "CANCELLED" })
      .eq("id", row.order_id)
      .eq("status", "PENDING");
  }

  const orderNumber = buildOrderNumber();
  const addressJson = summary.shippingSnapshot as unknown as Json;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      store_id: summary.storeId,
      order_number: orderNumber,
      user_id: user.id,
      status: "PENDING",
      subtotal: summary.pricing.subtotal.major,
      discount_amount: summary.pricing.discount.major,
      shipping_amount: summary.pricing.shipping.major,
      gateway_fee: 0,
      tax_amount: summary.pricing.tax.major,
      grand_total: summary.pricing.grandTotal.major,
      currency,
      shipping_address: addressJson,
      billing_address: addressJson,
      notes: null,
      coupon_code: summary.pricing.discountInfo.code ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    const logged = await logPaymentError({
      message: orderError?.message || "COD order create failed",
      error: orderError,
      type: "ORDER",
      source: "DATABASE",
      severity: "ERROR",
      operation: "CHECKOUT",
      storeId: summary.storeId,
      userId: user.id,
      userLogin: user.email,
      errorCode: "ORDER_CREATE_FAILED",
      route: "/checkout",
      databaseCode: orderError?.code ?? null,
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "ORDER_CREATE_FAILED",
      referenceId: logged.referenceId,
    };
  }

  const productIds = [
    ...new Set(summary.lines.map((line) => line.productId).filter(Boolean)),
  ];
  const returnsByProduct = new Map<
    string,
    "no_return_refund" | "no_replace" | "replace_only"
  >();
  let storeReturnPolicy: "no_return_refund" | "no_replace" | "replace_only" =
    "no_return_refund";
  if (productIds.length > 0) {
    const [{ data: productPolicies }, { data: shipping }] = await Promise.all([
      supabase
        .from("products")
        .select("id, store_id, returns_allowed, return_policy")
        .in("id", productIds),
      supabase
        .from("shipping_settings")
        .select("return_policy")
        .eq("store_id", summary.storeId)
        .maybeSingle(),
    ]);
    if (
      shipping?.return_policy === "no_replace" ||
      shipping?.return_policy === "replace_only" ||
      shipping?.return_policy === "no_return_refund"
    ) {
      storeReturnPolicy = shipping.return_policy;
    }
    for (const row of productPolicies ?? []) {
      returnsByProduct.set(
        row.id,
        resolveReturnPolicy(row.return_policy, storeReturnPolicy),
      );
    }
  }

  const lineRows = summary.lines.map((line) => {
    const policy = returnsByProduct.get(line.productId) ?? storeReturnPolicy;
    return {
      order_id: order.id,
      product_id: line.productId,
      variant_id: line.variantId,
      product_name_snapshot: line.productName,
      variant_name_snapshot: line.variantName,
      sku_snapshot: line.variantId.replace(/-/g, "").slice(0, 16).toUpperCase(),
      unit_price: line.currentUnitPrice,
      quantity: line.quantity,
      line_total: line.currentUnitPrice * line.quantity,
      return_policy: policy,
      returns_allowed: policy === "no_replace",
    };
  });

  const { error: itemsError } = await supabase.from("order_items").insert(lineRows);
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", order.id);
    return {
      ok: false,
      error: "Unable to prepare order items.",
      code: "ORDER_ITEMS_FAILED",
    };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      user_id: user.id,
      provider: "cod",
      amount: summary.pricing.grandTotal.major,
      amount_minor: amountMinor,
      currency,
      status: "PENDING",
      pricing_version: summary.pricing.version,
      payment_method: "cod",
      metadata: {
        addressId: input.addressId,
        lineCount: summary.lines.length,
        method: "cod",
      } as Json,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    await supabase.from("orders").update({ status: "CANCELLED" }).eq("id", order.id);
    const logged = await logPaymentError({
      message: paymentError?.message || "COD payment row create failed",
      error: paymentError,
      source: "DATABASE",
      type: "PAYMENT",
      severity: "ERROR",
      operation: "CREATE_PAYMENT",
      storeId: summary.storeId,
      userId: user.id,
      userLogin: user.email,
      orderId: order.id,
      errorCode: "PAYMENT_CREATE_FAILED",
      route: "/checkout",
      databaseCode: paymentError?.code ?? null,
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "PAYMENT_CREATE_FAILED",
      referenceId: logged.referenceId,
    };
  }

  const finalized = await finalizeCodOrder({
    paymentId: payment.id,
    orderId: order.id,
    storeId: summary.storeId,
    userId: user.id,
  });

  if (!finalized.ok) {
    await supabase
      .from("payments")
      .update({
        status: "FAILED",
        failure_reason: finalized.error.slice(0, 500),
      })
      .eq("id", payment.id);
    await supabase
      .from("orders")
      .update({ status: "CANCELLED" })
      .eq("id", order.id)
      .eq("status", "PENDING");
    return {
      ok: false,
      error: finalized.error,
      code: "FINALIZE_FAILED",
    };
  }

  await writePaymentAudit({
    storeId: summary.storeId,
    userId: user.id,
    action: "COD_ORDER_PLACED",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      orderId: order.id,
      orderNumber: order.order_number,
      amountMinor,
    },
  });

  return {
    ok: true,
    paymentId: payment.id,
    orderId: order.id,
    orderNumber: order.order_number,
    status: "PENDING",
  };
}
