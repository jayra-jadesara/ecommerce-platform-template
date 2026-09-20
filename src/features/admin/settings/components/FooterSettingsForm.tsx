"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { AdminToggle } from "@/features/admin/ui/AdminToggle";
import {
  adminBtn,
  adminCard,
  adminCardPadding,
  adminCardSpanFull,
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
import { cn } from "@/lib/cn";
import type { BrandConfig, ContactConfig } from "@/types";

const DEFAULT_TAGLINE = "your store, your brand.";

const PREVIEW_SHOP = ["Home", "Products", "About", "Blog", "Contact"];
const PREVIEW_EXPLORE = [
  "Privacy Policy",
  "Terms of Use",
  "Disclaimer",
  "Shipping Policy",
];

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
  contact?: ContactConfig;
  canUpdate: boolean;
  productOptions?: Array<{ id: string; name: string }>;
}

export function FooterSettingsForm({
  initialValues,
  brand,
  contact,
  canUpdate,
}: FooterSettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const brandingHref = getAdminPath("/settings/branding");

  const defaults = useMemo(
    () => ({
      ...DEFAULT_FOOTER_SETTINGS,
      ...initialValues,
      copyrightText: "",
      showFeaturedProduct: false,
      featuredProductId: null,
      showLogo: initialValues.showLogo ?? DEFAULT_FOOTER_SETTINGS.showLogo,
    }),
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
  const displayDescription =
    watched.description?.trim() || autoDescription || "";
  const showLogo = Boolean(watched.showLogo);

  const previewPhones = [contact?.phone, contact?.phoneSecondary].filter(
    Boolean,
  ) as string[];
  const previewAddress = [
    contact?.addressLine1,
    contact?.city,
    contact?.state,
    contact?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveFooterSettingsAction({
        ...values,
        copyrightText: "",
        showFeaturedProduct: false,
        featuredProductId: null,
      });
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
      reset({
        ...values,
        copyrightText: "",
        showFeaturedProduct: false,
        featuredProductId: null,
      });
      router.refresh();
    });
  });

  function useAutomaticDescription() {
    setValue("description", "", { shouldDirty: true });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="w-full"
      style={{ ...adminStackStyle, gap: "0.85rem" }}
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

      <div className={adminCardsGrid()}>
        <section
          className={cn(adminCard(), adminCardPadding())}
          style={{ ...adminStackStyle, gap: "0.75rem" }}
        >
          <div className={adminFieldGroup(true)}>
            <p className="admin-field-group__title">Visibility</p>
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <AdminToggle
                  checked={Boolean(field.value)}
                  onChange={field.onChange}
                  disabled={!canUpdate || pending}
                  label={footerOn ? "Footer on" : "Footer off"}
                  variant="row"
                />
              )}
            />
          </div>

          <div
            className={adminFieldGroup(true)}
            style={{
              opacity: footerOn ? 1 : 0.5,
              pointerEvents: footerOn ? "auto" : "none",
            }}
          >
            <p className="admin-field-group__title">Blocks</p>
            <p className="admin-field-group__hint">
              Contact & social come from Store Information / Branding.
            </p>
            <div className={adminFieldsGrid(2)}>
              {(
                [
                  ["showLogo", "Logo"],
                  ["showContact", "Contact"],
                  ["showSocial", "Social"],
                  ["navVisible", "Explore links"],
                  ["showNewsletter", "Newsletter area"],
                ] as const
              ).map(([name, label]) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field }) => (
                    <AdminToggle
                      checked={Boolean(field.value)}
                      onChange={field.onChange}
                      disabled={!canUpdate || pending || !footerOn}
                      label={label}
                      variant="row"
                    />
                  )}
                />
              ))}
            </div>
            {showLogo && !brand.logoUrl ? (
              <p className="rounded-lg border border-dashed border-[var(--color-border)] px-2.5 py-2 text-[11px] text-[var(--color-muted)]">
                Upload a logo in{" "}
                <Link
                  href={brandingHref}
                  className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                >
                  Branding
                </Link>{" "}
                to show it under the brand text.
              </p>
            ) : null}
          </div>

          <div
            className={adminFieldGroup(true)}
            style={{
              opacity: footerOn ? 1 : 0.5,
              pointerEvents: footerOn ? "auto" : "none",
            }}
          >
            <p className="admin-field-group__title">Text</p>
            <p className="admin-field-group__hint">
              Description from{" "}
              <Link
                href={brandingHref}
                className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Branding
              </Link>
              . Copyright year is automatic.
            </p>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs">
              <p className="font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Description {customDescription ? "· custom" : "· auto"}
              </p>
              <p className="mt-1 line-clamp-3 text-[var(--color-foreground)]">
                {displayDescription || "Set a tagline in Branding."}
              </p>
              <p className="mt-2.5 font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Copyright · auto
              </p>
              <p className="mt-1 text-[var(--color-foreground)]">
                {autoCopyright}
              </p>
            </div>

            {customDescription && canUpdate ? (
              <button
                type="button"
                className={adminBtn("outline")}
                disabled={pending || !footerOn}
                onClick={useAutomaticDescription}
              >
                Use automatic description
              </button>
            ) : null}

            <details className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-[var(--color-foreground)]">
                Custom description
              </summary>
              <div className="mt-2.5">
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value ?? ""}
                      label="Description"
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      disabled={!canUpdate || pending || !footerOn}
                      helperText="Blank = brand tagline"
                    />
                  )}
                />
              </div>
            </details>
          </div>
        </section>

        <section className={cn(adminCard(), adminCardPadding(), "min-w-0")}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              Live preview
            </h3>
            <p className="text-[11px] text-[var(--color-muted)]">
              Matches store footer
            </p>
          </div>

          {!footerOn ? (
            <p className="mt-3 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-8 text-center text-xs text-[var(--color-muted)]">
              Footer is off — turn it on to preview.
            </p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm">
              <div className="relative bg-[var(--color-footer-background)] text-[var(--color-footer-foreground)]">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-6 -translate-y-[40%] overflow-hidden">
                  <svg
                    viewBox="0 0 1440 120"
                    preserveAspectRatio="none"
                    className="h-full w-full"
                    aria-hidden
                  >
                    <path
                      fill="var(--color-footer-background)"
                      d="M0,80 C240,20 480,0 720,0 C960,0 1200,20 1440,80 L1440,120 L0,120 Z"
                    />
                  </svg>
                </div>

                <div className="relative z-[1] px-3.5 pb-3 pt-5 sm:px-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">
                        {brand.name}
                      </p>
                      {displayDescription ? (
                        <p className="mt-1.5 max-w-[14rem] text-[11px] leading-relaxed opacity-85">
                          {displayDescription}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-[11px] opacity-55">
                          Brand description
                        </p>
                      )}
                      {showLogo ? (
                        brand.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brand.logoUrl}
                            alt=""
                            className="mt-3 h-10 w-auto max-w-[8rem] object-contain object-left"
                          />
                        ) : (
                          <p className="mt-3 text-[10px] opacity-50">
                            Logo on · upload in Branding
                          </p>
                        )
                      ) : null}
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                        Products
                      </p>
                      <ul className="mt-1.5 space-y-0.5 text-[11px] opacity-90">
                        {PREVIEW_SHOP.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                        Explore
                      </p>
                      {watched.navVisible ? (
                        <ul className="mt-1.5 space-y-0.5 text-[11px] opacity-90">
                          {PREVIEW_EXPLORE.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-[11px] opacity-45">Hidden</p>
                      )}
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                        Contact
                      </p>
                      {watched.showContact ? (
                        <ul className="mt-1.5 space-y-0.5 text-[11px] opacity-90">
                          {previewPhones.length > 0 ? (
                            previewPhones.map((phone) => (
                              <li key={phone}>{phone}</li>
                            ))
                          ) : (
                            <li className="opacity-50">Phone</li>
                          )}
                          {contact?.email ? (
                            <li className="underline underline-offset-2">
                              {contact.email}
                            </li>
                          ) : (
                            <li className="opacity-50">Email</li>
                          )}
                          {previewAddress ? (
                            <li className="leading-snug opacity-80">
                              {previewAddress}
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-[11px] opacity-45">Hidden</p>
                      )}

                      {watched.showSocial ? (
                        <div className="mt-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                            Connect with us
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {["IG", "FB", "YT"].map((chip) => (
                              <span
                                key={chip}
                                className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_88%,#000)] px-1.5 text-[9px] font-bold text-[var(--color-button-foreground,#fff)]"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {watched.showNewsletter ? (
                    <p className="mt-3 border-t border-[color-mix(in_srgb,var(--color-footer-foreground)_12%,transparent)] pt-2 text-[10px] opacity-60">
                      Newsletter signup is a Homepage section (not this toggle).
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-[color-mix(in_srgb,#000_35%,transparent)] bg-[color-mix(in_srgb,#0a0a0a_82%,var(--color-footer-background))] px-3.5 py-2 sm:px-4">
                  <p className="text-[10px] text-white/85">{autoCopyright}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <p
          className={cn(
            adminCardSpanFull(),
            "text-[11px] leading-relaxed text-[var(--color-muted)]",
          )}
        >
          Menu links are managed in{" "}
          <Link
            href={getAdminPath("/settings/navigation")}
            className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            Navigation
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
