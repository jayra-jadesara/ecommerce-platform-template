import { normalizeCarrierStatus } from "@/features/shipping/courier/normalize";
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  TrackResult,
  TrackingEvent,
} from "@/features/shipping/courier/types";

function gatewayBase(sandbox: boolean): string {
  return sandbox
    ? "https://apigateway-sandbox.bluedart.com/in/transportation"
    : "https://apigateway.bluedart.com/in/transportation";
}

type TokenCache = { token: string; expiresAt: number };
const tokenCache = new Map<string, TokenCache>();

async function bluedartJwt(input: {
  sandbox: boolean;
  apiKey: string;
  apiSecret: string;
}): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const cacheKey = `${input.sandbox}:${input.apiKey}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return { ok: true, token: cached.token };
  }

  if (!input.apiKey.trim() || !input.apiSecret.trim()) {
    return {
      ok: false,
      error: "Blue Dart API key and secret are not configured.",
    };
  }

  let res: Response;
  try {
    res = await fetch(`${gatewayBase(input.sandbox)}/token/v1/login`, {
      method: "GET",
      headers: {
        ClientID: input.apiKey,
        clientSecret: input.apiSecret,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach Blue Dart authenticator." };
  }

  const body = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const token = String(
    body?.JWTToken ?? body?.jwtToken ?? body?.token ?? "",
  ).trim();
  if (!res.ok || !token) {
    return {
      ok: false,
      error:
        (typeof body?.message === "string" && body.message) ||
        "Blue Dart authentication failed.",
    };
  }

  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  });
  return { ok: true, token };
}

export async function bluedartTrack(input: {
  sandbox: boolean;
  loginId: string;
  licenceKey: string;
  apiKey: string;
  apiSecret: string;
  awb: string;
}): Promise<TrackResult> {
  const awb = input.awb.trim();
  if (!awb) return { ok: false, error: "Tracking number is required." };
  if (!input.loginId.trim() || !input.licenceKey.trim()) {
    return {
      ok: false,
      error: "Blue Dart login ID and licence key are not configured.",
    };
  }

  const auth = await bluedartJwt({
    sandbox: input.sandbox,
    apiKey: input.apiKey,
    apiSecret: input.apiSecret,
  });
  if (!auth.ok) return auth;

  const params = new URLSearchParams({
    handler: "tnt",
    action: "custawbquery",
    loginid: input.loginId,
    awb: "awb",
    numbers: awb,
    format: "json",
    lickey: input.licenceKey,
    verno: "1",
    scan: "1",
  });

  let res: Response;
  try {
    res = await fetch(
      `${gatewayBase(input.sandbox)}/tracking/v1?${params.toString()}`,
      {
        method: "GET",
        headers: {
          JWTToken: auth.token,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, error: "Could not reach Blue Dart tracking API." };
  }

  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    return {
      ok: false,
      error: `Blue Dart tracking failed (${res.status}).`,
    };
  }

  const root = body as Record<string, unknown>;
  const shipment = (root?.Shipment ??
    root?.shipment ??
    (Array.isArray(root?.Shipments) ? root.Shipments[0] : null) ??
    root) as Record<string, unknown>;

  const statusRaw = String(
    shipment?.Status ??
      shipment?.CurrentStatus ??
      shipment?.StatusType ??
      "",
  );

  const scanList = Array.isArray(shipment?.Scans)
    ? (shipment.Scans as unknown[])
    : Array.isArray(shipment?.ScanDetail)
      ? (shipment.ScanDetail as unknown[])
      : [];

  const events: TrackingEvent[] = scanList
    .map((row) => {
      const detail = (row ?? {}) as Record<string, unknown>;
      return {
        at: String(detail.ScanDate ?? detail.ScanDateTime ?? "") || null,
        status: String(
          detail.ScanCodeDescription ??
            detail.Scan ??
            detail.Status ??
            "Update",
        ),
        location: String(detail.ScannedLocation ?? detail.City ?? "") || null,
        detail: String(detail.ScanGroupType ?? detail.Remarks ?? "") || null,
      };
    })
    .filter((e) => e.status);

  return {
    ok: true,
    awb,
    status: normalizeCarrierStatus(events[0]?.status || statusRaw || "Pending"),
    events,
    rawSummary: statusRaw || events[0]?.status || null,
  };
}

export async function bluedartCreateShipment(input: {
  sandbox: boolean;
  loginId: string;
  licenceKey: string;
  apiKey: string;
  apiSecret: string;
  originArea: string;
  shipment: CreateShipmentInput;
}): Promise<CreateShipmentResult> {
  if (!input.originArea.trim()) {
    return {
      ok: false,
      error: "Blue Dart origin area is not configured.",
    };
  }

  const auth = await bluedartJwt({
    sandbox: input.sandbox,
    apiKey: input.apiKey,
    apiSecret: input.apiSecret,
  });
  if (!auth.ok) return auth;

  const c = input.shipment.consignee;
  const phone = c.phone.replace(/\D/g, "").slice(-10);
  if (phone.length < 10) {
    return { ok: false, error: "Consignee phone must be a valid 10-digit number." };
  }

  const isCod = input.shipment.paymentMode === "COD";
  const payload = {
    Request: {
      Consignee: {
        ConsigneeName: c.name,
        ConsigneeAddress1: c.address.slice(0, 30),
        ConsigneeAddress2: c.address.slice(30, 60) || ".",
        ConsigneeAddress3: c.city,
        ConsigneePincode: c.postalCode,
        ConsigneeMobile: phone,
        ConsigneeAttention: c.name,
      },
      Services: {
        ProductCode: "A",
        ProductType: isCod ? "C" : "P",
        ActualWeight: Math.max(0.1, (input.shipment.weightGrams ?? 500) / 1000),
        CollectableAmount: isCod ? input.shipment.collectAmount : 0,
        CreditReferenceNo: input.shipment.orderNumber,
        DeclaredValue: input.shipment.collectAmount,
        PDFOutputNotRequired: true,
        PickupDate: `/Date(${Date.now()})/`,
        PickupTime: "1600",
        PieceCount: "1",
      },
      Shipper: {
        CustomerCode: input.loginId,
        CustomerName: input.loginId,
        OriginArea: input.originArea.trim(),
      },
    },
    Profile: {
      LoginID: input.loginId,
      LicenceKey: input.licenceKey,
      Api_type: "S",
    },
  };

  let res: Response;
  try {
    res = await fetch(`${gatewayBase(input.sandbox)}/waybill/v1/GenerateWayBill`, {
      method: "POST",
      headers: {
        JWTToken: auth.token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach Blue Dart waybill API." };
  }

  const body = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const generate =
    (body?.GenerateWayBillResult as Record<string, unknown> | undefined) ??
    body;
  const awb = String(
    generate?.AWBNo ?? generate?.AwbNo ?? generate?.WayBillNo ?? "",
  ).trim();

  if (!awb) {
    const status = generate?.Status as Array<Record<string, unknown>> | undefined;
    const info =
      status?.[0]?.StatusInformation ??
      generate?.StatusInformation ??
      "Blue Dart did not return an AWB.";
    return { ok: false, error: String(info) };
  }

  return { ok: true, awb, shipmentId: awb };
}
