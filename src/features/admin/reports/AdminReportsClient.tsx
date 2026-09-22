"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import { getAdminPath } from "@/config/admin-route";
import { AdminCard } from "@/features/admin/ui/AdminCard";
import { AdminSelect } from "@/features/admin/ui/AdminSelect";
import { AdminMetricGrid } from "@/features/admin/ui/AdminMetricGrid";
import { AdminMetricTile } from "@/features/admin/ui/AdminMetricTile";
import {
  buildReportPdf,
  MANAGEMENT_REPORT_OPTIONS,
  type ManagementReportKey,
} from "@/features/admin/reports/build-report-pdf";
import {
  REPORT_RANGE_OPTIONS,
  reportRangeSearchParams,
  type ReportRangeKey,
} from "@/features/admin/reports/report-range";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { usePlatformConfig } from "@/providers";
import { cn } from "@/lib/cn";
import type {
  AdminReportBundle,
  ReportPdfBrand,
} from "@/features/admin/reports/types";
import { formatMoney } from "@/features/catalog/money";

const AdminPdfViewer = dynamic(
  () =>
    import("@/features/admin/ui/AdminPdfViewer").then((m) => m.AdminPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(75vh,48rem)] min-h-[22rem] items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-muted)]">
        Loading viewer…
      </div>
    ),
  },
);

export function AdminReportsClient({
  bundle,
  range,
  report,
}: {
  bundle: AdminReportBundle;
  range: ReportRangeKey;
  /** Empty string = user has not chosen a report yet. */
  report: ManagementReportKey | "";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { brand, theme } = usePlatformConfig();

  /** Local selection so the viewer mounts immediately (no wait for RSC). */
  const [selectedReport, setSelectedReport] = useState(report);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState("report.pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const genId = useRef(0);
  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;

  useEffect(() => {
    setSelectedReport(report);
  }, [report]);

  function brandInput(): ReportPdfBrand {
    return {
      brandName: brand.name,
      brandTagline: brand.tagline,
      logoUrl: brand.logoUrl || brand.logoDarkUrl,
      colors: theme.light,
    };
  }

  function navigate(
    nextReport: ManagementReportKey | "",
    nextRange: ReportRangeKey,
  ) {
    const params = reportRangeSearchParams(
      nextRange,
      nextReport || undefined,
    );
    startTransition(() => {
      router.push(`${getAdminPath("/reports")}?${params.toString()}`);
    });
  }

  // Regenerate only when report/period identity changes — not on every new bundle object.
  const rangeFrom = bundle.range.from;
  const rangeTo = bundle.range.to;

  useEffect(() => {
    if (!selectedReport) {
      setBlob(null);
      setFilename("report.pdf");
      setLoading(false);
      setError(null);
      return;
    }

    const id = ++genId.current;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const result = await buildReportPdf(
          selectedReport,
          brandInput(),
          bundleRef.current,
        );
        if (genId.current !== id) return;
        setBlob(result.blob);
        setFilename(result.filename);
      } catch (err) {
        if (genId.current !== id) return;
        setBlob(null);
        setError(
          err instanceof Error ? err.message : "Could not generate this report.",
        );
      } finally {
        if (genId.current === id) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- brand read at generate time
  }, [selectedReport, range, rangeFrom, rangeTo]);

  function download() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <AdminCard className="!p-3 sm:!p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <AdminSelect
              label="Management report"
              value={selectedReport}
              disabled={pending || loading}
              allowEmpty
              emptyLabel="Select report"
              options={MANAGEMENT_REPORT_OPTIONS}
              onChange={(value) => {
                if (!value) {
                  setSelectedReport("");
                  setBlob(null);
                  navigate("", range);
                  return;
                }
                const next = value as ManagementReportKey;
                setSelectedReport(next);
                navigate(next, range);
              }}
            />
            <AdminSelect
              label="Period"
              value={range}
              disabled={
                pending || loading || selectedReport === "inventory"
              }
              options={REPORT_RANGE_OPTIONS}
              onChange={(value) =>
                navigate(selectedReport, value as ReportRangeKey)
              }
            />
          </div>
          <button
            type="button"
            disabled={!blob || loading}
            onClick={download}
            className={cn(
              adminBtn("primary"),
              "w-full shrink-0 !min-h-10 sm:w-auto lg:mb-0.5",
            )}
          >
            <DownloadOutlinedIcon sx={{ fontSize: 18 }} />
            Download PDF
          </button>
        </div>

        <p className="mt-2 text-[12px] text-[var(--color-muted)]">
          {!selectedReport
            ? "Choose a management report to load the PDF preview."
            : selectedReport === "inventory"
              ? "Inventory risk is current stock (live) — period does not apply. Preview below; download saves only to your device."
              : `${bundle.range.label}. Preview below — download saves only to your device.`}
        </p>

        <AdminMetricGrid
          columns={5}
          className="mt-3"
          aria-label="Period snapshot"
        >
          <AdminMetricTile
            compact
            label="Paid orders"
            value={String(bundle.revenue.paid)}
            tone="primary"
            icon={<ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Revenue"
            value={formatMoney(bundle.revenue.revenue, bundle.currency)}
            tone="success"
            icon={<PaymentsOutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Profit"
            value={
              bundle.revenue.profitHasCostData
                ? formatMoney(bundle.revenue.profit, bundle.currency)
                : "—"
            }
            hint={
              bundle.revenue.profitHasCostData
                ? "Revenue − product cost"
                : "Set cost price on products"
            }
            tone="primary"
            icon={<TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Delivered"
            value={String(bundle.revenue.delivered)}
            tone="secondary"
            icon={<LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />}
          />
          <AdminMetricTile
            compact
            label="Reviews"
            value={String(bundle.customersReviews.reviews.total)}
            tone="neutral"
            icon={<RateReviewOutlinedIcon sx={{ fontSize: 18 }} />}
          />
        </AdminMetricGrid>
      </AdminCard>

      {selectedReport ? (
        <AdminPdfViewer
          blob={blob}
          filename={filename}
          loading={loading}
          error={error}
          showDownload={false}
        />
      ) : null}
    </div>
  );
}
