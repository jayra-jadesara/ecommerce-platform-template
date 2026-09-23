"use client";

import { useState } from "react";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import {
  AdminChartCard,
  AdminHorizontalBarChart,
  AdminQuotaChart,
} from "@/features/admin/ui/charts";
import { adminCard } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import {
  formatBytes,
  formatCount,
  quotaStatusLabel,
  type QuotaLevel,
} from "@/features/platform-usage/plan-limits";
import type { SupabaseUsageResult } from "@/features/platform-usage/supabase-usage-service";
import type { VercelUsageSnapshot } from "@/features/platform-usage/vercel-usage-service";

function levelTone(level: QuotaLevel): string {
  switch (level) {
    case "ok":
      return "border-[color-mix(in_srgb,var(--color-success)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--color-card))] text-[var(--color-success)]";
    case "warn":
      return "border-[color-mix(in_srgb,var(--color-warning)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-card))] text-[var(--color-warning)]";
    case "critical":
    case "over":
      return "border-[color-mix(in_srgb,var(--color-error)_40%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_10%,var(--color-card))] text-[var(--color-error)]";
  }
}

function StatusBanner({
  title,
  detail,
  level,
}: {
  title: string;
  detail: string;
  level: QuotaLevel;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        levelTone(level),
      )}
    >
      <p className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
        {title}
      </p>
      <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
        {detail}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide">
        {quotaStatusLabel(level)}
      </p>
    </div>
  );
}

function TipList({ tips }: { tips: string[] }) {
  return (
    <ul className="space-y-2">
      {tips.map((tip) => (
        <li
          key={tip}
          className="rounded-lg border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-card))] px-3 py-2 text-[12px] leading-snug text-[var(--color-foreground)]"
        >
          {tip}
        </li>
      ))}
    </ul>
  );
}

export function PlatformUsageClient({
  supabase,
  vercel,
}: {
  supabase: SupabaseUsageResult;
  vercel: VercelUsageSnapshot;
}) {
  const [tab, setTab] = useState(0);

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onChange={(_, next: number) => setTab(next)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          "& .MuiTab-root": {
            minHeight: 40,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8125rem",
          },
        }}
      >
        <Tab label="Supabase" />
        <Tab label="Vercel" />
      </Tabs>

      {tab === 0 ? <SupabasePanel data={supabase} /> : null}
      {tab === 1 ? <VercelPanel data={vercel} /> : null}
    </div>
  );
}

function SupabasePanel({ data }: { data: SupabaseUsageResult }) {
  if (!data.ok) {
    return (
      <div className={cn(adminCard(), "p-4")}>
        <p className="text-[14px] font-semibold text-[var(--color-foreground)]">
          Could not load Supabase usage
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">{data.error}</p>
        <p className="mt-3 text-[12px] text-[var(--color-muted)]">
          Make sure <code className="text-[11px]">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          is set and the latest database migration is applied.
        </p>
      </div>
    );
  }

  const worst: QuotaLevel =
    data.databaseLevel === "over" || data.fileLevel === "over"
      ? "over"
      : data.databaseLevel === "critical" || data.fileLevel === "critical"
        ? "critical"
        : data.databaseLevel === "warn" || data.fileLevel === "warn"
          ? "warn"
          : "ok";

  const statusTitle =
    worst === "ok"
      ? "Storage looks fine for the Free plan"
      : worst === "warn"
        ? "You are using a good chunk of Free plan space"
        : worst === "critical"
          ? "Close to Free plan limits — plan an upgrade"
          : "Over Free plan limits — upgrade soon";

  const statusDetail = `Database ${formatBytes(data.databaseBytes)} of ${formatBytes(data.databaseLimitBytes)} · Files ${formatBytes(data.fileBytes)} of ${formatBytes(data.fileLimitBytes)} (images + videos).`;

  return (
    <div className="space-y-4">
      <StatusBanner title={statusTitle} detail={statusDetail} level={worst} />

      <div className="grid gap-3 md:grid-cols-3">
        <AdminChartCard
          title="Image files"
          tip="Product photos, branding, CMS, and media library. Shares the 1 GB Free file limit."
        >
          <AdminQuotaChart
            used={data.imageBytes}
            limit={data.fileLimitBytes}
            usedLabel="Images"
          />
        </AdminChartCard>
        <AdminChartCard
          title="Video files (reels)"
          tip="Hosted reel MP4 / WebM. Shares the same 1 GB Free file limit."
        >
          <AdminQuotaChart
            used={data.videoBytes}
            limit={data.fileLimitBytes}
            usedLabel="Videos"
          />
        </AdminChartCard>
        <AdminChartCard
          title="Database"
          tip="All store data in Postgres. Free plan: 500 MB. Going over can block writes."
        >
          <AdminQuotaChart
            used={data.databaseBytes}
            limit={data.databaseLimitBytes}
            usedLabel="Database"
          />
        </AdminChartCard>
      </div>

      <AdminChartCard
        title="Storage folders"
        tip="Each bar is one folder in Supabase Storage. Longer bar = more space used. Sizes are shown in MB/GB (not raw numbers)."
        empty={
          data.buckets.length === 0 ? "No uploaded files yet." : null
        }
      >
        <AdminHorizontalBarChart
          data={data.buckets.map((b) => ({
            name: b.label,
            value: b.bytes,
          }))}
          valueLabel="Size"
          formatValue={formatBytes}
          height={Math.max(180, data.buckets.length * 36)}
          labelMaxChars={18}
          yAxisWidth={120}
        />
        <ul className="mt-3 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] pt-2">
          {data.buckets.map((b) => (
            <li
              key={b.bucketId}
              className="flex items-center justify-between gap-3 py-1.5 text-[12px]"
            >
              <span className="min-w-0 truncate text-[var(--color-foreground)]">
                {b.label}
                <span className="ml-1.5 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                  {b.kind === "video"
                    ? "video"
                    : b.kind === "image"
                      ? "images"
                      : "other"}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[var(--color-foreground)]">
                {formatBytes(b.bytes)}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 py-1.5 text-[12px]">
            <span className="font-semibold text-[var(--color-foreground)]">
              All folders total
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-[var(--color-foreground)]">
              {formatBytes(data.fileBytes)} / {formatBytes(data.fileLimitBytes)}{" "}
              free
            </span>
          </li>
        </ul>
      </AdminChartCard>

      <div className={cn(adminCard(), "p-4")}>
        <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
          Good to know (Supabase Free)
        </h3>
        <p className="mt-1 text-[12px] text-[var(--color-muted)]">
          Plan: <span className="font-medium text-[var(--color-foreground)]">{data.planLabel}</span>
          {" · "}
          Monthly transfer allowance:{" "}
          {formatBytes(data.egressUncachedLimitBytes)} uncached +{" "}
          {formatBytes(data.egressCachedLimitBytes)} cached (check usage in
          Supabase dashboard).
        </p>
        <div className="mt-3">
          <TipList tips={data.tips} />
        </div>
      </div>
    </div>
  );
}

function VercelPanel({ data }: { data: VercelUsageSnapshot }) {
  const liveMeters = data.meters.filter((m) => m.live && m.used != null);
  const worstLive: QuotaLevel =
    liveMeters.reduce<QuotaLevel>((acc, m) => {
      const level = m.level ?? "ok";
      const rank = { ok: 0, warn: 1, critical: 2, over: 3 } as const;
      return rank[level] > rank[acc] ? level : acc;
    }, "ok");

  return (
    <div className="space-y-4">
      <StatusBanner
        title={
          data.liveConfigured && !data.liveError
            ? liveMeters.some((m) => (m.level ?? "ok") !== "ok")
              ? "Some Vercel limits are getting close"
              : "Vercel Hobby limits look fine so far"
            : "Vercel Hobby — know your free limits"
        }
        detail={
          data.liveError
            ? data.liveError
            : data.liveConfigured
              ? "Live numbers are from this month’s Vercel billing usage (when available)."
              : "Limits below are for the Hobby (free) plan. Add VERCEL_TOKEN + VERCEL_TEAM_ID for live meters, or open the Vercel Usage page."
        }
        level={data.liveConfigured && !data.liveError ? worstLive : "ok"}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {data.meters.map((meter) => (
          <AdminChartCard
            key={meter.id}
            title={meter.label}
            tip={meter.tip}
          >
            {meter.used != null ? (
              <AdminQuotaChart
                used={meter.used}
                limit={meter.limit}
                asBytes={meter.unit === "bytes"}
                formatValue={
                  meter.unit === "bytes" ? formatBytes : formatCount
                }
                usedLabel="Used"
              />
            ) : (
              <div className="space-y-2 py-2">
                <p className="text-[12px] text-[var(--color-muted)]">
                  Free limit:{" "}
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {meter.unit === "bytes"
                      ? formatBytes(meter.limit)
                      : formatCount(meter.limit)}
                  </span>
                  {meter.unit === "count" ? " / month" : " / month"}
                </p>
                <p className="text-[11px] leading-snug text-[var(--color-muted)]">
                  Live used amount is not connected yet. Check{" "}
                  <a
                    href={data.dashboardUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                  >
                    Vercel → Usage
                  </a>
                  .
                </p>
              </div>
            )}
          </AdminChartCard>
        ))}
      </div>

      <div className={cn(adminCard(), "p-4")}>
        <h3 className="text-[13px] font-semibold text-[var(--color-foreground)]">
          Good to know (Vercel {data.planLabel})
        </h3>
        <div className="mt-3">
          <TipList tips={data.tips} />
        </div>
        <p className="mt-3 text-[12px]">
          <a
            href={data.dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Open Vercel dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
