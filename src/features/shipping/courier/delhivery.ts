import { normalizeCarrierStatus } from "@/features/shipping/courier/normalize";
import type {
  CreateShipmentInput,
  CreateShipmentResult,
  TrackResult,
  TrackingEvent,
} from "@/features/shipping/courier/types";

function baseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://staging-express.delhivery.com"
    : "https://track.delhivery.com";
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Token ${token}`,
    Accept: "application/json",
  };
}

export async function delhiveryTrack(input: {
  token: string;
  sandbox: boolean;
  awb: string;
}): Promise<TrackResult> {
  const awb = input.awb.trim();
  if (!awb) return { ok: false, error: "Tracking number is required." };
  if (!input.token.trim()) {
    return { ok: false, error: "Delhivery API token is not configured." };
  }

  const url = `${baseUrl(input.sandbox)}/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: authHeaders(input.token),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach Delhivery tracking API." };
  }

  const body = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!res.ok) {
    const msg =
      (body && typeof body.Error === "string" && body.Error) ||
      (body && typeof body.message === "string" && body.message) ||
      `Delhivery tracking failed (${res.status}).`;
    return { ok: false, error: msg };
  }

  const shipmentData = Array.isArray(body?.ShipmentData)
    ? (body!.ShipmentData as Array<Record<string, unknown>>)
    : [];
  const first = shipmentData[0]?.Shipment as Record<string, unknown> | undefined;
  if (!first) {
    return { ok: false, error: "No Delhivery shipment found for this AWB." };
  }

  const statusObj = first.Status;
  const statusRaw = String(
    (statusObj &&
    typeof statusObj === "object" &&
    "Status" in statusObj
      ? (statusObj as { Status?: unknown }).Status
      : null) ??
      first.Status ??
      first.StatusType ??
      "",
  );
  const scans = Array.isArray(first.Scans)
    ? (first.Scans as Array<Record<string, unknown>>)
    : [];

  const events: TrackingEvent[] = scans
    .map((row) => {
      const detail = (row.ScanDetail ?? row) as Record<string, unknown>;
      return {
        at: String(detail.ScanDateTime ?? detail.StatusDateTime ?? "") || null,
        status: String(detail.Scan ?? detail.Status ?? detail.Instructions ?? "Update"),
        location: String(detail.ScannedLocation ?? detail.City ?? "") || null,
        detail: String(detail.Instructions ?? detail.StatusCode ?? "") || null,
      };
    })
    .filter((e) => e.status);

  const latest =
    events[0]?.status ||
    statusRaw ||
    String(first.StatusType ?? "Pending");

  return {
    ok: true,
    awb,
    status: normalizeCarrierStatus(latest),
    events,
    rawSummary: statusRaw || latest,
  };
}

export async function delhiveryCreateShipment(input: {
  token: string;
  sandbox: boolean;
  clientName: string;
  shipment: CreateShipmentInput;
}): Promise<CreateShipmentResult> {
  if (!input.token.trim()) {
    return { ok: false, error: "Delhivery API token is not configured." };
  }
  if (!input.clientName.trim()) {
    return {
      ok: false,
      error: "Delhivery client / warehouse name is not configured.",
    };
  }

  const c = input.shipment.consignee;
  const phone = c.phone.replace(/\D/g, "").slice(-10);
  if (phone.length < 10) {
    return { ok: false, error: "Consignee phone must be a valid 10-digit number." };
  }

  const payload = {
    shipments: [
      {
        name: c.name,
        add: c.address,
        pin: c.postalCode,
        city: c.city,
        state: c.state ?? "",
        country: c.country || "India",
        phone,
        order: input.shipment.orderNumber,
        payment_mode: input.shipment.paymentMode === "COD" ? "COD" : "Prepaid",
        cod_amount:
          input.shipment.paymentMode === "COD"
            ? String(input.shipment.collectAmount)
            : "0",
        total_amount: String(input.shipment.collectAmount),
        weight: String(Math.max(100, input.shipment.weightGrams ?? 500)),
      },
    ],
    pickup_location: {
      name: input.clientName.trim(),
    },
  };

  const form = new URLSearchParams();
  form.set("format", "json");
  form.set("data", JSON.stringify(payload));

  let res: Response;
  try {
    res = await fetch(`${baseUrl(input.sandbox)}/api/cmu/create.json`, {
      method: "POST",
      headers: {
        ...authHeaders(input.token),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach Delhivery create API." };
  }

  const body = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  const packages = Array.isArray(body?.packages)
    ? (body!.packages as Array<Record<string, unknown>>)
    : [];
  const pkg = packages[0];
  const awb = String(pkg?.waybill ?? pkg?.Waybill ?? "").trim();
  if (!awb) {
    const remark = String(
      pkg?.remarks ?? body?.rmk ?? body?.Error ?? "Delhivery did not return a waybill.",
    );
    return { ok: false, error: remark };
  }

  return {
    ok: true,
    awb,
    shipmentId: String(pkg?.refnum ?? input.shipment.orderNumber),
  };
}
