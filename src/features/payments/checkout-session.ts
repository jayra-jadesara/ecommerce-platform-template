import "server-only";

import { getPlatformConfigAsync } from "@/config/site.server";
import { getCurrentUser } from "@/features/auth/session";
import {
  customerFacingError,
  logPaymentError,
} from "@/features/error-monitoring/logger";
import { writePaymentAudit } from "@/features/payments/audit";
import { getPaymentProvider } from "@/features/payments/providers";
import { getRazorpayEnvOptional } from "@/features/payments/env";
import type { StartCheckoutPaymentResult } from "@/features/payments/types";
import { getCheckoutSummary } from "@/features/checkout/service";
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

function buildReceipt(): string {
  return `rcpt_${randomBytes(8).toString("hex")}`.slice(0, 40);
}

/**
 * Create pending order + payment, then Razorpay Order (server-side).
 * Amounts come only from the centralized pricing engine.
 */
export async function createCheckoutPaymentSession(input: {
  addressId: string;
  couponCode?: string | null;
}): Promise<StartCheckoutPaymentResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to continue to payment.", code: "UNAUTHORIZED" };
  }

  const razorpayEnv = getRazorpayEnvOptional();
  if (!razorpayEnv) {
    return {
      ok: false,
      error: "Online payment is not configured yet.",
      code: "PROVIDER_NOT_CONFIGURED",
    };
  }

  const summary = await getCheckoutSummary({
    selectedAddressId: input.addressId,
    couponCode: input.couponCode,
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
      error: "Resolve cart and address issues before paying.",
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

  const supabaseUser = await createSupabaseServerClient();
  const { data: paymentSettings } = await supabaseUser
    .from("payment_settings")
    .select("provider")
    .eq("store_id", summary.storeId)
    .maybeSingle();

  if ((paymentSettings?.provider ?? "none") !== "razorpay") {
    return {
      ok: false,
      error: "Online payment is disabled for this store.",
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

  const supabase = createSupabaseServiceClient();

  // Fail any other open payment attempts for this user/store (retry safety).
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
    await supabase
      .from("payments")
      .update({
        status: "FAILED",
        failure_reason: "Superseded by a new payment attempt.",
      })
      .eq("id", row.id)
      .in("status", ["CREATED", "PENDING"]);
    if (orderMeta.status === "PENDING") {
      await supabase
        .from("orders")
        .update({ status: "CANCELLED" })
        .eq("id", row.order_id)
        .eq("status", "PENDING");
    }
  }

  const orderNumber = buildOrderNumber();
  const receipt = buildReceipt();
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
      gateway_fee: summary.pricing.paymentFee.major,
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
      message: orderError?.message || "Order create failed before payment",
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
      provider: "razorpay",
      amount: summary.pricing.grandTotal.major,
      amount_minor: amountMinor,
      currency,
      status: "CREATED",
      pricing_version: summary.pricing.version,
      receipt,
      metadata: {
        addressId: input.addressId,
        lineCount: summary.lines.length,
      } as Json,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    await supabase.from("orders").update({ status: "CANCELLED" }).eq("id", order.id);
    const logged = await logPaymentError({
      message: paymentError?.message || "Payment row create failed",
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

  let providerOrder;
  try {
    const provider = getPaymentProvider("razorpay");
    providerOrder = await provider.createOrder({
      amountMinor,
      currency,
      receipt,
      notes: {
        payment_id: payment.id,
        order_id: order.id,
        store_id: summary.storeId,
      },
    });
  } catch (providerError) {
    await supabase
      .from("payments")
      .update({
        status: "FAILED",
        failure_reason: "Provider order creation failed.",
      })
      .eq("id", payment.id);
    await supabase.from("orders").update({ status: "CANCELLED" }).eq("id", order.id);
    const logged = await logPaymentError({
      message:
        providerError instanceof Error
          ? providerError.message
          : "Razorpay order creation failed",
      error: providerError,
      source: "PROVIDER",
      severity: "ERROR",
      operation: "CREATE_PAYMENT",
      storeId: summary.storeId,
      userId: user.id,
      userLogin: user.email,
      orderId: order.id,
      paymentId: payment.id,
      errorCode: "PROVIDER_ORDER_FAILED",
      route: "/checkout",
      metadata: { currency, amountMinor },
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "PROVIDER_ORDER_FAILED",
      referenceId: logged.referenceId,
    };
  }

  if (
    providerOrder.amountMinor !== amountMinor ||
    providerOrder.currency.toUpperCase() !== currency
  ) {
    await supabase
      .from("payments")
      .update({
        status: "FAILED",
        failure_reason: "Provider amount mismatch.",
      })
      .eq("id", payment.id);
    await supabase.from("orders").update({ status: "CANCELLED" }).eq("id", order.id);
    const logged = await logPaymentError({
      message: "Provider amount or currency mismatch on order create",
      source: "PROVIDER",
      severity: "CRITICAL",
      operation: "CREATE_PAYMENT",
      storeId: summary.storeId,
      userId: user.id,
      userLogin: user.email,
      orderId: order.id,
      paymentId: payment.id,
      providerOrderId: providerOrder.providerOrderId,
      errorCode: "PROVIDER_AMOUNT_MISMATCH",
      route: "/checkout",
      metadata: {
        expectedMinor: amountMinor,
        actualMinor: providerOrder.amountMinor,
        currency,
        providerCurrency: providerOrder.currency,
      },
    });
    return {
      ok: false,
      ...customerFacingError(logged.referenceId, true),
      code: "PROVIDER_AMOUNT_MISMATCH",
      referenceId: logged.referenceId,
    };
  }

  await supabase
    .from("payments")
    .update({
      provider_order_id: providerOrder.providerOrderId,
      status: "PENDING",
    })
    .eq("id", payment.id);

  await writePaymentAudit({
    storeId: summary.storeId,
    userId: user.id,
    action: "PAYMENT_INTENT_CREATED",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      orderId: order.id,
      amountMinor,
      currency,
      providerOrderId: providerOrder.providerOrderId,
    },
  });

  const config = await getPlatformConfigAsync();
  const profileClient = await createSupabaseServerClient();
  const { data: profile } = await profileClient
    .from("user_profiles")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const name = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const themeColor = toRazorpayHex(
    config.theme.light.buttonBackground || config.theme.light.primary,
  );

  return {
    ok: true,
    session: {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.order_number,
      provider: "razorpay",
      keyId: razorpayEnv.keyId,
      razorpayOrderId: providerOrder.providerOrderId,
      amountMinor,
      currency,
      brandName: config.brand.name,
      brandLogoUrl: config.brand.logoUrl || undefined,
      themeColor,
      description: `Order ${order.order_number}`,
      prefill: {
        name: name || undefined,
        email: user.email ?? undefined,
        contact: profile?.phone ?? undefined,
      },
    },
  };
}

/** Razorpay checkout only accepts solid hex accents (not CSS vars / rgb()). */
function toRazorpayHex(color: string, fallback = "#9f1239"): string {
  const value = color.trim();
  const hex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hex) {
    const body = hex[1];
    if (body.length === 3) {
      return `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`.toLowerCase();
    }
    return `#${body}`.toLowerCase();
  }
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+\s*)?\)$/i,
  );
  if (rgb) {
    const channel = (n: string) =>
      Math.max(0, Math.min(255, Math.round(Number(n))))
        .toString(16)
        .padStart(2, "0");
    return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
  }
  return fallback;
}
