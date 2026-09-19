"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  publishPageAction,
  unpublishPageAction,
  updateSectionAction,
} from "@/features/cms/actions";
import {
  AboutSectionFields,
  type AboutEditableConfig,
} from "@/features/cms/components/AboutSectionFields";
import { SectionEditorPreview } from "@/features/cms/components/SectionEditorPreview";
import {
  defaultConfigForType,
  migrateAboutConfigInput,
} from "@/features/cms/schemas";
import type { ContentPage, ContentSection } from "@/features/cms/types";
import { MediaPicker } from "@/features/media";
import { focusFirstFieldError } from "@/features/admin/validation/form-errors";
import { AdminSaveBar } from "@/features/admin/ui/AdminSaveBar";
import type { FieldErrors } from "@/lib/validation";

type AboutPageFormProps = {
  page: ContentPage;
  section: ContentSection;
  canUpdate: boolean;
  canPublish: boolean;
};

function buildInitialConfig(
  defaults: AboutEditableConfig,
  section: ContentSection,
): AboutEditableConfig {
  const migrated = migrateAboutConfigInput({
    ...defaults,
    ...(section.config as Record<string, unknown>),
  });
  const merged: AboutEditableConfig = {
    ...defaults,
    ...migrated,
    motionSource: "global",
    threeSource: "global",
  };
  const items = (merged.timelineItems as unknown[]) ?? [];
  if (items.length === 0) {
    merged.timelineItems = [
      { label: "", year: "", description: "", logoPath: null },
    ];
  }
  return merged;
}

export function AboutPageForm({
  page,
  section,
  canUpdate,
  canPublish,
}: AboutPageFormProps) {
  const router = useRouter();
  const defaults = useMemo(
    () => defaultConfigForType("about") as AboutEditableConfig,
    [],
  );
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(buildInitialConfig(defaults, section)),
  );
  const [config, setConfig] = useState<AboutEditableConfig>(() =>
    buildInitialConfig(defaults, section),
  );
  const [status, setStatus] = useState(page.status);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mediaField, setMediaField] = useState<string | null>(null);

  const isDirty = JSON.stringify(config) !== baseline;

  function refresh() {
    router.refresh();
  }

  function save() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const result = await updateSectionAction({
        sectionId: section.id,
        title: section.title ?? "About",
        isActive: true,
        config: {
          ...config,
          motionSource: "global",
          threeSource: "global",
          enable3d: false,
          scene3dPreset: "NONE",
        },
      });
      if (!result.ok) {
        const fieldErrors =
          "fieldErrors" in result && result.fieldErrors
            ? (result.fieldErrors as FieldErrors)
            : undefined;
        setError(
          fieldErrors ? "Please check the About settings." : result.error,
        );
        if (fieldErrors) {
          focusFirstFieldError({ fieldErrors });
        }
        return;
      }
      setBaseline(JSON.stringify(config));
      setMessage("Saved (draft until you publish).");
      refresh();
    });
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-[var(--color-foreground)]">
            About page
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Draft until you publish · Status:{" "}
            <span className="font-medium capitalize text-[var(--color-foreground)]">
              {status}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPublish ? (
            status === "published" ? (
              <button
                type="button"
                disabled={pending}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const result = await unpublishPageAction(page.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setStatus("draft");
                    setMessage("About unpublished (draft).");
                    refresh();
                  });
                }}
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
                onClick={() => {
                  startTransition(async () => {
                    const saveResult = await updateSectionAction({
                      sectionId: section.id,
                      title: section.title ?? "About",
                      isActive: true,
                      config: {
                        ...config,
                        motionSource: "global",
                        threeSource: "global",
                        enable3d: false,
                        scene3dPreset: "NONE",
                      },
                    });
                    if (!saveResult.ok) {
                      setError(saveResult.error);
                      return;
                    }
                    setBaseline(JSON.stringify(config));
                    const result = await publishPageAction(page.id);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setStatus("published");
                    setMessage("About published.");
                    refresh();
                  });
                }}
              >
                Publish
              </button>
            )
          ) : null}
          <Link
            href="/about"
            target="_blank"
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
          >
            View live site
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)] lg:items-start">
        <div className="order-2 lg:order-1 min-w-0">
          <AboutSectionFields
            config={config}
            onChange={setConfig}
            onPickMedia={(field) => setMediaField(field)}
          />
        </div>
        <div className="order-1 lg:order-2 lg:sticky lg:top-4">
          <SectionEditorPreview sectionType="about" config={config} />
        </div>
      </div>

      <AdminSaveBar
        position="bottom"
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={message}
        onSave={save}
        onCancel={() => {
          setConfig(JSON.parse(baseline) as AboutEditableConfig);
          setError(null);
          setMessage(null);
        }}
      />

      <MediaPicker
        open={Boolean(mediaField)}
        folder="cms"
        onClose={() => setMediaField(null)}
        onSelect={(selection) => {
          if (!mediaField) return;
          setConfig((prev) => {
            const nested = mediaField.match(
              /^timelineItems\.(\d+)\.logoPath$/,
            );
            if (nested) {
              const index = Number(nested[1]);
              const items = [
                ...((prev.timelineItems as Array<Record<string, unknown>>) ??
                  []),
              ];
              items[index] = {
                ...(items[index] ?? {}),
                logoPath: selection.storagePath,
              };
              return { ...prev, timelineItems: items };
            }
            const factoryMatch = mediaField.match(
              /^factorySlides\.(\d+)\.imagePath$/,
            );
            if (factoryMatch) {
              const index = Number(factoryMatch[1]);
              const slides = [
                ...((prev.factorySlides as Array<Record<string, unknown>>) ??
                  []),
              ];
              slides[index] = {
                ...(slides[index] ?? {}),
                imagePath: selection.storagePath,
              };
              return { ...prev, factorySlides: slides };
            }
            const certMatch = mediaField.match(
              /^certificatesSlides\.(\d+)\.imagePath$/,
            );
            if (certMatch) {
              const index = Number(certMatch[1]);
              const slides = [
                ...((prev.certificatesSlides as Array<
                  Record<string, unknown>
                >) ?? []),
              ];
              slides[index] = {
                ...(slides[index] ?? {}),
                imagePath: selection.storagePath,
              };
              return { ...prev, certificatesSlides: slides };
            }
            return { ...prev, [mediaField]: selection.storagePath };
          });
          setMediaField(null);
        }}
      />
    </div>
  );
}
