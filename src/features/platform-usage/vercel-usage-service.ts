import "server-only";

import {
  formatCount,
  quotaLevel,
  VERCEL_HOBBY,
  type QuotaLevel,
} from "@/features/platform-usage/plan-limits";

export type VercelMeter = {
  id: string;
  label: string;
  tip: string;
  used: number | null;
  limit: number;
  unit: "bytes" | "count";
  level: QuotaLevel | null;
  live: boolean;
};

export type VercelUsageSnapshot = {
  ok: true;
  planLabel: string;
  liveConfigured: boolean;
  liveError: string | null;
  meters: VercelMeter[];
  tips: string[];
  dashboardUrl: string;
};

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

type FocusCharge = {
  ServiceName?: string;
  ConsumedQuantity?: number | null;
  ConsumedUnit?: string | null;
  Tags?: Record<string, string> | null;
};

function matchService(name: string, needles: string[]): boolean {
  const n = name.toLowerCase();
  return needles.some((needle) => n.includes(needle.toLowerCase()));
}

/**
 * Hobby plan limits always. Live usage when VERCEL_TOKEN + VERCEL_TEAM_ID are set.
 */
export async function getVercelUsageSnapshot(): Promise<VercelUsageSnapshot> {
  const tips = [
    "Hobby is for personal / non-commercial use. Shops usually need Pro.",
    "Going over a Hobby limit usually pauses that feature — it does not bill you extra.",
    "Watch Fast Data Transfer (site bandwidth) first — free plan includes 100 GB / month.",
    "Function calls and edge requests also have free caps (1M each).",
    "Open Vercel → Usage to see live numbers for your team.",
  ];

  const baseMeters: VercelMeter[] = [
    {
      id: "fast-data-transfer",
      label: "Site bandwidth (Fast Data Transfer)",
      tip: "Data sent to visitors from the CDN.",
      used: null,
      limit: VERCEL_HOBBY.fastDataTransferBytes,
      unit: "bytes",
      level: null,
      live: false,
    },
    {
      id: "fast-origin-transfer",
      label: "Origin transfer",
      tip: "Data between CDN and server functions.",
      used: null,
      limit: VERCEL_HOBBY.fastOriginTransferBytes,
      unit: "bytes",
      level: null,
      live: false,
    },
    {
      id: "edge-requests",
      label: "Edge requests",
      tip: "How many times the CDN handled a request.",
      used: null,
      limit: VERCEL_HOBBY.edgeRequests,
      unit: "count",
      level: null,
      live: false,
    },
    {
      id: "function-invocations",
      label: "Function calls",
      tip: "Serverless / server function runs.",
      used: null,
      limit: VERCEL_HOBBY.functionInvocations,
      unit: "count",
      level: null,
      live: false,
    },
    {
      id: "web-analytics",
      label: "Web Analytics events",
      tip: "Page views collected by Vercel Analytics.",
      used: null,
      limit: VERCEL_HOBBY.webAnalyticsEvents,
      unit: "count",
      level: null,
      live: false,
    },
  ];

  const token = env("VERCEL_TOKEN") ?? env("VERCEL_ACCESS_TOKEN");
  const teamId = env("VERCEL_TEAM_ID");
  const liveConfigured = Boolean(token && teamId);

  if (!liveConfigured) {
    return {
      ok: true,
      planLabel: VERCEL_HOBBY.planLabel,
      liveConfigured: false,
      liveError: null,
      meters: baseMeters,
      tips: [
        ...tips,
        "Optional: set VERCEL_TOKEN and VERCEL_TEAM_ID to pull live usage into this page.",
      ],
      dashboardUrl: "https://vercel.com/dashboard",
    };
  }

  try {
    const now = new Date();
    const from = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
    );
    const to = now;
    const params = new URLSearchParams({
      teamId: teamId!,
      from: from.toISOString(),
      to: to.toISOString(),
    });

    const res = await fetch(
      `https://api.vercel.com/v1/billing/charges?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/x-ndjson",
        },
        next: { revalidate: 0 },
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: true,
        planLabel: VERCEL_HOBBY.planLabel,
        liveConfigured: true,
        liveError:
          `Vercel API ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}. ` +
          "Hobby teams may not expose billing charges — use the Vercel Usage page.",
        meters: baseMeters,
        tips,
        dashboardUrl: "https://vercel.com/dashboard",
      };
    }

    const text = await res.text();
    const totals = {
      fastData: 0,
      fastOrigin: 0,
      edgeRequests: 0,
      functionInvocations: 0,
      analytics: 0,
    };

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let row: FocusCharge;
      try {
        row = JSON.parse(trimmed) as FocusCharge;
      } catch {
        continue;
      }
      const service = String(row.ServiceName ?? "");
      const qty = Number(row.ConsumedQuantity) || 0;
      if (!service || qty <= 0) continue;

      if (matchService(service, ["Fast Data Transfer", "Bandwidth", "Data Transfer"])) {
        // Prefer GB → bytes if unit looks like GB
        const unit = String(row.ConsumedUnit ?? "").toLowerCase();
        totals.fastData += unit.includes("gb")
          ? qty * 1024 * 1024 * 1024
          : unit.includes("mb")
            ? qty * 1024 * 1024
            : qty;
      } else if (matchService(service, ["Fast Origin Transfer", "Origin Transfer"])) {
        const unit = String(row.ConsumedUnit ?? "").toLowerCase();
        totals.fastOrigin += unit.includes("gb")
          ? qty * 1024 * 1024 * 1024
          : unit.includes("mb")
            ? qty * 1024 * 1024
            : qty;
      } else if (matchService(service, ["Edge Request", "CDN Request"])) {
        totals.edgeRequests += qty;
      } else if (
        matchService(service, ["Function Invocation", "Invocations", "Serverless Function"])
      ) {
        totals.functionInvocations += qty;
      } else if (matchService(service, ["Web Analytics", "Analytics Event"])) {
        totals.analytics += qty;
      }
    }

    const withLive = (meter: VercelMeter, used: number): VercelMeter => ({
      ...meter,
      used,
      live: true,
      level: quotaLevel(used, meter.limit),
    });

    return {
      ok: true,
      planLabel: VERCEL_HOBBY.planLabel,
      liveConfigured: true,
      liveError: null,
      meters: [
        withLive(baseMeters[0]!, totals.fastData),
        withLive(baseMeters[1]!, totals.fastOrigin),
        withLive(baseMeters[2]!, totals.edgeRequests),
        withLive(baseMeters[3]!, totals.functionInvocations),
        withLive(baseMeters[4]!, totals.analytics),
      ],
      tips: [
        ...tips,
        `Live totals use this month so far (${formatCount(totals.edgeRequests)} edge requests seen in billing data).`,
      ],
      dashboardUrl: "https://vercel.com/dashboard",
    };
  } catch (error) {
    return {
      ok: true,
      planLabel: VERCEL_HOBBY.planLabel,
      liveConfigured: true,
      liveError:
        error instanceof Error
          ? error.message
          : "Could not reach Vercel usage API.",
      meters: baseMeters,
      tips,
      dashboardUrl: "https://vercel.com/dashboard",
    };
  }
}
