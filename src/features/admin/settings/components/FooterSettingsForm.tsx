"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { getAdminPath } from "@/config/admin-route";
import { saveFooterSettingsAction } from "@/features/admin/settings/actions";
import { SettingsFormToolbar } from "@/features/admin/settings/components/SettingsFormToolbar";
import {
  DEFAULT_FOOTER_SETTINGS,
  footerSettingsSchema,
  type FooterSettingsFormValues,
} from "@/features/admin/settings/schemas";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminCardsGrid,
  adminFieldGroup,
  adminFieldsGrid,
  adminStackStyle,
} from "@/features/admin/ui/admin-classes";
import {
  applyServerFieldErrors,
  focusFirstFieldError,
  resultFieldErrors,
} from "@/features/admin/validation/form-errors";
import type { BrandConfig } from "@/types";

const DEFAULT_TAGLINE = "your store, your brand.";

function autoFooterDescription(brand: BrandConfig): string {
  const tagline = brand.tagline?.trim();
  if (!tagline) return "";
  if (tagline.toLowerCase() === DEFAULT_TAGLINE) return "";
  return tagline;
}

function autoFooterCopyright(brand: BrandConfig): string {
  return `© ${new Date().getFullYear()} ${brand.name}. All rights reserved.`;
}

interface FooterSettingsFormProps {
  initialValues: FooterSettingsFormValues;
  brand: BrandConfig;
  canUpdate: boolean;
}

export function FooterSettingsForm({
  initialValues,
  brand,
  canUpdate,
}: FooterSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const brandingHref = getAdminPath("/settings/branding");

  const defaults = useMemo(
    () => ({ ...DEFAULT_FOOTER_SETTINGS, ...initialValues }),
    [initialValues],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError: setFieldError,
    setFocus,
    formState: { isDirty },
  } = useForm<FooterSettingsFormValues>({
    resolver: zodResolver(footerSettingsSchema),
    defaultValues: defaults,
  });

  const watched = useWatch({ control });
  const footerOn = Boolean(watched.enabled);
  const autoDescription = autoFooterDescription(brand);
  const autoCopyright = autoFooterCopyright(brand);
  const customDescription = Boolean(watched.description?.trim());
  const customCopyright = Boolean(watched.copyrightText?.trim());
  const displayDescription =
    watched.description?.trim() || autoDescription || "";
  const displayCopyright =
    watched.copyrightText?.trim() || autoCopyright;

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveFooterSettingsAction(values);
      if (!result.ok) {
        const serverFieldErrors = resultFieldErrors(result);
        if (serverFieldErrors) {
          applyServerFieldErrors(setFieldError as never, serverFieldErrors);
          focusFirstFieldError({
            fieldErrors: serverFieldErrors,
            setFocus: setFocus as (name: string) => void,
          });
        }
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      reset(values);
      router.refresh();
    });
  });

  function useAutomaticText() {
    setValue("description", "", { shouldDirty: true });
    setValue("copyrightText", "", { shouldDirty: true });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full"
      style={adminStackStyle}
      noValidate
    >
      <SettingsFormToolbar
        isDirty={isDirty}
        canUpdate={canUpdate}
        pending={pending}
        error={error}
        success={success}
        onSave={onSubmit}
        onCancel={() => {
          reset(defaults);
          setError(null);
          setSuccess(null);
        }}
        onResetDefaults={() => {
          reset(DEFAULT_FOOTER_SETTINGS);
          setSuccess(null);
        }}
      />

      <p className="text-sm text-[var(--color-muted)]">
        Choose what appears at the bottom of your store. Description and
        copyright are filled automatically from your brand.
      </p>

      <div className={adminCardsGrid()}>
        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={adminStackStyle}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">1. Footer on or off</p>
          <Controller
            name="enabled"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(field.value)}
                    onChange={(_, checked) => field.onChange(checked)}
                    disabled={!canUpdate || pending}
                  />
                }
                label={
                  footerOn
                    ? "Yes — show the footer on every page"
                    : "No — hide the footer"
                }
              />
            )}
          />
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={{
            ...adminStackStyle,
            opacity: footerOn ? 1 : 0.55,
            pointerEvents: footerOn ? "auto" : "none",
          }}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">2. What to include</p>
          <p className="admin-field-group__hint">
            Contact and social details come from Store Information and Branding.
          </p>
          <div className={adminFieldsGrid(3)}>
            {(
              [
                ["showContact", "Show contact details"],
                ["showSocial", "Show social links"],
                ["navVisible", "Show footer menu links"],
                ["showNewsletter", "Show newsletter signup area"],
              ] as const
            ).map(([name, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(_, checked) => field.onChange(checked)}
                        disabled={!canUpdate || pending || !footerOn}
                      />
                    }
                    label={label}
                  />
                )}
              />
            ))}
          </div>
        </div>
        </section>

        <section
          className={`${adminCard()} ${adminCardPadding()}`}
          style={{
            ...adminStackStyle,
            opacity: footerOn ? 1 : 0.55,
            pointerEvents: footerOn ? "auto" : "none",
          }}
        >
        <div className={adminFieldGroup()} style={adminStackStyle}>
          <p className="admin-field-group__title">3. Footer text (automatic)</p>
          <p className="admin-field-group__hint">
            Pulled from your brand name and tagline. Update them in{" "}
            <Link
              href={brandingHref}
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              Branding
            </Link>
            .
          </p>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Description
              {customDescription ? " · customized" : " · auto"}
            </p>
            <p className="mt-1 text-[var(--color-foreground)]">
              {displayDescription ||
                "Add a tagline in Branding to show a short description here."}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Copyright
              {customCopyright ? " · customized" : " · auto"}
            </p>
            <p className="mt-1 text-[var(--color-foreground)]">
              {displayCopyright}
            </p>
          </div>

          {(customDescription || customCopyright) && canUpdate ? (
            <button
              type="button"
              className={adminBtn("outline")}
              disabled={pending || !footerOn}
              onClick={useAutomaticText}
            >
              Clear custom text — use automatic
            </button>
          ) : null}

          <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">
              Use different wording (optional)
            </summary>
            <div className="mt-3" style={adminStackStyle}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Custom footer description"
                    fullWidth
                    multiline
                    minRows={3}
                    disabled={!canUpdate || pending || !footerOn}
                    helperText={
                      autoDescription
                        ? `Leave blank to use: “${autoDescription}”`
                        : "Leave blank to use your brand tagline when set."
                    }
                  />
                )}
              />
              <Controller
                name="copyrightText"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="Custom copyright line"
                    fullWidth
                    disabled={!canUpdate || pending || !footerOn}
                    helperText={`Leave blank to use: “${autoCopyright}”`}
                  />
                )}
              />
            </div>
          </details>
        </div>
        </section>

        <section className={`${adminCard()} ${adminCardPadding()}`}>
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Footer preview
        </h3>
        {!footerOn ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Footer is off — turn it on to see a preview.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-footer-background)] p-5 text-[var(--color-footer-foreground)]">
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
              {brand.name}
            </p>
            {displayDescription ? (
              <p className="mt-2 max-w-md text-sm opacity-80">
                {displayDescription}
              </p>
            ) : null}
            <p className="mt-4 text-xs opacity-70">{displayCopyright}</p>
            <p className="mt-3 text-xs opacity-60">
              {[
                watched.showContact ? "Contact" : null,
                watched.showSocial ? "Social" : null,
                watched.navVisible ? "Menu" : null,
                watched.showNewsletter ? "Newsletter" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "No extra blocks"}
            </p>
          </div>
        )}
        </section>
      </div>
    </form>
  );
}
