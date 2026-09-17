"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  publishPageAction,
  unpublishPageAction,
  updatePageAction,
  updateSectionAction,
} from "@/features/cms/actions";
import {
  CareerSectionFields,
  validateCareersEmail,
  type CareerEditableConfig,
} from "@/features/career/components/CareerSectionFields";
import { JobPostsManager } from "@/features/career/components/JobPostsManager";
import { CareerApplicationsInbox } from "@/features/career/components/CareerApplicationsInbox";
import { defaultConfigForType } from "@/features/cms/schemas";
import type { ContentPage, ContentSection } from "@/features/cms/types";
import type { CareerApplication, JobPost } from "@/features/career/types";
import { focusFirstFieldError } from "@/features/admin/validation/form-errors";
import { AdminSaveBar } from "@/features/admin/ui/AdminSaveBar";
import type { FieldErrors } from "@/lib/validation";
import { cn } from "@/lib/cn";

type CareerPageFormProps = {
  page: ContentPage;
  section: ContentSection;
  jobs: JobPost[];
  applications: CareerApplication[];
  canUpdate: boolean;
  canPublish: boolean;
};

type TabId = "content" | "jobs" | "applications";

function buildInitialConfig(
  defaults: CareerEditableConfig,
  section: ContentSection,
): CareerEditableConfig {
  const merged: CareerEditableConfig = {
    ...defaults,
    ...section.config,
    motionSource: "global",
    threeSource: "global",
  };
  const paras = (merged.introParagraphs as unknown[]) ?? [];
  if (paras.length === 0) {
    merged.introParagraphs = [""];
  }
  return merged;
}

export function CareerPageForm({
  page,
  section,
  jobs,
  applications,
  canUpdate,
  canPublish,
}: CareerPageFormProps) {
  const router = useRouter();
  const defaults = useMemo(
    () => defaultConfigForType("career") as CareerEditableConfig,
    [],
  );
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(buildInitialConfig(defaults, section)),
  );
  const [config, setConfig] = useState<CareerEditableConfig>(() =>
    buildInitialConfig(defaults, section),
  );
  const [status, setStatus] = useState(page.status);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("content");

  const isDirty = JSON.stringify(config) !== baseline;
  const emailError = validateCareersEmail(
    String(config.careersEmail ?? ""),
  );
  const pageLabel =
    String(config.heading ?? "").trim() || page.title || "Career";

  function setField(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function refresh() {
    router.refresh();
  }

  function save() {
    const heading = String(config.heading ?? "").trim();
    if (!heading) {
      setError("Enter a heading — it becomes the page name everywhere.");
      setTab("content");
      return;
    }
    const emailIssue = validateCareersEmail(
      String(config.careersEmail ?? ""),
    );
    if (emailIssue) {
      setError(emailIssue);
      setTab("content");
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);

      const sectionResult = await updateSectionAction({
        sectionId: section.id,
        title: heading,
        isActive: true,
        config: {
          ...config,
          heading,
          careersEmail: String(config.careersEmail ?? "").trim(),
          motionSource: "global",
          threeSource: "global",
          enable3d: false,
          scene3dPreset: "NONE",
        },
      });
      if (!sectionResult.ok) {
        const fieldErrors =
          "fieldErrors" in sectionResult && sectionResult.fieldErrors
            ? (sectionResult.fieldErrors as FieldErrors)
            : undefined;
        setError(
          fieldErrors
            ? "Please check the Career settings."
            : sectionResult.error,
        );
        if (fieldErrors) focusFirstFieldError({ fieldErrors });
        return;
      }

      // Keep CMS page title in sync with heading (nav label / SEO fallback).
      const pageResult = await updatePageAction(page.id, {
        title: heading,
        slug: page.slug,
        content: page.content,
        featuredImagePath: page.featuredImagePath,
        seoTitle: heading,
        seoDescription: page.seoDescription,
        ogImagePath: page.ogImagePath,
        status: page.status,
      });
      if (!pageResult.ok) {
        setError(pageResult.error);
        return;
      }

      setBaseline(JSON.stringify({ ...config, heading }));
      setConfig((prev) => ({ ...prev, heading }));
      setMessage("Saved. Heading is now the page name everywhere.");
      refresh();
    });
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "content", label: "Page content" },
    { id: "jobs", label: `Job posts (${jobs.length})` },
    { id: "applications", label: `Applications (${applications.length})` },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_4%,transparent)]">
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            {pageLabel}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            Storefront{" "}
            <Link
              href="/career"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              target="_blank"
            >
              /career
            </Link>
            {" · "}
            Status:{" "}
            <span className="font-medium capitalize text-[var(--color-foreground)]">
              {status}
            </span>
            {status !== "published"
              ? " — hidden on store (no roles or form)"
              : " · No CV uploads"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPublish ? (
            status === "published" ? (
              <button
                type="button"
                disabled={pending}
                className="rounded-xl border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium"
                onClick={() => {
                  startTransition(async () => {
                    const result = await unpublishPageAction(page.id);
                    if (result.ok) {
                      setStatus("draft");
                      setMessage(
                        "Unpublished — /career no longer shows roles or the form.",
                      );
                      refresh();
                    } else {
                      setError(result.error);
                    }
                  });
                }}
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                className="rounded-xl bg-[var(--color-button-background)] px-3 py-1.5 text-sm font-medium text-[var(--color-button-foreground)]"
                onClick={() => {
                  startTransition(async () => {
                    if (isDirty) {
                      setError("Save page content before publishing.");
                      return;
                    }
                    if (emailError) {
                      setError(emailError);
                      return;
                    }
                    const result = await publishPageAction(page.id);
                    if (result.ok) {
                      setStatus("published");
                      setMessage("Published on /career.");
                      refresh();
                    } else {
                      setError(result.error);
                    }
                  });
                }}
              >
                Publish
              </button>
            )
          ) : null}
        </div>
      </div>

      {error && tab !== "content" ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message && tab !== "content" ? (
        <p className="text-sm text-[var(--color-muted)]" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "content" ? (
        <>
          <CareerSectionFields
            config={config}
            setField={setField}
            disabled={!canUpdate || pending}
            emailError={
              String(config.careersEmail ?? "").trim() ? emailError : null
            }
          />
          {canUpdate ? (
            <AdminSaveBar
              position="bottom"
              isDirty={isDirty}
              canUpdate={canUpdate}
              pending={pending}
              error={error}
              success={message}
              onSave={save}
              onCancel={() => {
                setConfig(JSON.parse(baseline) as CareerEditableConfig);
                setError(null);
                setMessage(null);
              }}
            />
          ) : null}
        </>
      ) : null}

      {tab === "jobs" ? (
        <JobPostsManager jobs={jobs} canUpdate={canUpdate} />
      ) : null}

      {tab === "applications" ? (
        <CareerApplicationsInbox
          applications={applications}
          canUpdate={canUpdate}
        />
      ) : null}
    </div>
  );
}
