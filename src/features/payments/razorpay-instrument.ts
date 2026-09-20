/**
 * Razorpay payment instrument details — parsed from Payments API / webhooks.
 * Stored under payments.metadata.instrument (no dedicated columns).
 */

export type PaymentInstrument = {
  method: string;
  cardType: "credit" | "debit" | null;
  last4: string | null;
  network: string | null;
  vpa: string | null;
  bank: string | null;
  wallet: string | null;
  issuer: string | null;
};

export type ParsedRazorpayInstrument = {
  method: string | null;
  instrument: PaymentInstrument | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCardType(value: unknown): "credit" | "debit" | null {
  const raw = asNonEmptyString(value)?.toLowerCase();
  if (raw === "credit" || raw === "debit") return raw;
  return null;
}

function normalizeLast4(value: unknown): string | null {
  const raw = asNonEmptyString(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

/**
 * Extract coarse method + instrument fields from a Razorpay payment entity.
 * Missing nested fields are left null — partial capture is OK.
 */
export function parseRazorpayInstrument(
  payment: unknown,
): ParsedRazorpayInstrument {
  const entity = asRecord(payment);
  if (!entity) return { method: null, instrument: null };

  const method = asNonEmptyString(entity.method)?.toLowerCase() ?? null;
  if (!method) return { method: null, instrument: null };

  const card = asRecord(entity.card);
  const upi = asRecord(entity.upi);

  const bankFromEntity =
    asNonEmptyString(entity.bank) ??
    asNonEmptyString(asRecord(entity.bank)?.name) ??
    asNonEmptyString(asRecord(entity.bank)?.code);

  const walletFromEntity =
    asNonEmptyString(entity.wallet) ??
    asNonEmptyString(asRecord(entity.wallet)?.name) ??
    asNonEmptyString(asRecord(entity.wallet)?.type);

  const instrument: PaymentInstrument = {
    method,
    cardType: card ? normalizeCardType(card.type) : null,
    last4: card ? normalizeLast4(card.last4) : null,
    network: card ? asNonEmptyString(card.network) : null,
    vpa: upi ? asNonEmptyString(upi.vpa) : null,
    bank: bankFromEntity,
    wallet: walletFromEntity,
    issuer: card ? asNonEmptyString(card.issuer) : null,
  };

  const hasDetail =
    instrument.cardType ||
    instrument.last4 ||
    instrument.network ||
    instrument.vpa ||
    instrument.bank ||
    instrument.wallet ||
    instrument.issuer;

  return {
    method,
    instrument: hasDetail || method ? instrument : null,
  };
}

/** Read instrument from payments.metadata (tolerant of unknown shapes). */
export function coercePaymentInstrument(
  metadata: unknown,
): PaymentInstrument | null {
  const root = asRecord(metadata);
  const raw = asRecord(root?.instrument);
  if (!raw) return null;

  const method = asNonEmptyString(raw.method)?.toLowerCase();
  if (!method) return null;

  return {
    method,
    cardType: normalizeCardType(raw.cardType),
    last4: normalizeLast4(raw.last4),
    network: asNonEmptyString(raw.network),
    vpa: asNonEmptyString(raw.vpa),
    bank: asNonEmptyString(raw.bank),
    wallet: asNonEmptyString(raw.wallet),
    issuer: asNonEmptyString(raw.issuer),
  };
}

/** Human-readable instrument line for admin / account payment panels. */
export function formatPaymentInstrumentLabel(
  instrument: PaymentInstrument | null | undefined,
  fallbackMethod?: string | null,
): string | null {
  if (!instrument) {
    const method = asNonEmptyString(fallbackMethod)?.toLowerCase();
    if (!method || method === "cod") return null;
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  const method = instrument.method.toLowerCase();

  if (method === "card" || instrument.last4 || instrument.cardType) {
    const kind =
      instrument.cardType === "credit"
        ? "Credit card"
        : instrument.cardType === "debit"
          ? "Debit card"
          : "Card";
    const network = instrument.network
      ? ` ${instrument.network}`
      : "";
    const last4 = instrument.last4 ? ` · ****${instrument.last4}` : "";
    const issuer = instrument.issuer ? ` (${instrument.issuer})` : "";
    return `${kind}${network}${last4}${issuer}`.trim();
  }

  if (method === "upi" || instrument.vpa) {
    return instrument.vpa ? `UPI · ${instrument.vpa}` : "UPI";
  }

  if (method === "netbanking" || instrument.bank) {
    return instrument.bank
      ? `Netbanking · ${instrument.bank}`
      : "Netbanking";
  }

  if (method === "wallet" || instrument.wallet) {
    return instrument.wallet ? `Wallet · ${instrument.wallet}` : "Wallet";
  }

  return method.charAt(0).toUpperCase() + method.slice(1);
}
