"use client";

/**
 * Appearance design studio — uses native tabs/buttons for SSR-safe chrome;
 * MUI is limited to form controls (TextField, Switch, etc.).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveThemeSettingsAction } from "@/features/admin/theme/actions";
import { ColorField } from "@/features/admin/theme/components/ColorField";
import { LogoThemeSuggest } from "@/features/admin/theme/components/LogoThemeSuggest";
import { ThemeEditorPreviewCanvas } from "@/features/admin/theme/components/ThemeEditorPreviewCanvas";
import {
  findMatchingThemePackId,
  packsByCategory,
} from "@/features/admin/theme/color-packs";
import { AdminStatusBadge } from "@/features/admin/ui/AdminStatusBadge";
import { adminBtn, adminFieldsGrid } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import {
  SAFE_FONT_OPTIONS,
  formValuesToThemeConfig,
  themeConfigToFormValues,
  themeEditorFormSchema,
  type ThemeEditorFormValues,
} from "@/features/admin/theme/editor-schema";
import { VISUAL_3D_PRESET_LABELS } from "@/features/visual-effects/schemas";
import { defaultPlatformConfig } from "@/config/defaults";
import { getAdminPath } from "@/config/admin-route";
import type {
  AnimationConfig,
  BrandConfig,
  ResolvedThemeMode,
  ThemeConfig,
  ThemeMode,
  VisualEffectsConfig,
} from "@/types";

const APPEARANCE_TABS = [
  "Overview",
  "Colors",
  "Header & Footer",
  "Typography",
  "Animation",
  "3D",
  "Branding",
] as const;

const COLOR_GROUPS: Array<{
  title: string;
  fields: Array<{ key: keyof ThemeEditorFormValues["light"]; label: string }>;
}> = [
  {
    title: "Brand",
    fields: [
      { key: "primary", label: "Primary" },
      { key: "secondary", label: "Secondary" },
      { key: "accent", label: "Accent" },
    ],
  },
  {
    title: "Surface",
    fields: [
      { key: "background", label: "Background" },
      { key: "surface", label: "Surface" },
      { key: "card", label: "Card" },
      { key: "border", label: "Border" },
    ],
  },
  {
    title: "Typography",
    fields: [
      { key: "foreground", label: "Foreground" },
      { key: "muted", label: "Muted" },
    ],
  },
  {
    title: "Status",
    fields: [
      { key: "success", label: "Success" },
      { key: "warning", label: "Warning" },
      { key: "error", label: "Error" },
    ],
  },
];

const CHROME_GROUPS: Array<{
  title: string;
  fields: Array<{ key: keyof ThemeEditorFormValues["light"]; label: string }>;
}> = [
  {
    title: "Header",
    fields: [
      { key: "headerBackground", label: "Header background" },
      { key: "headerForeground", label: "Header foreground" },
    ],
  },
  {
    title: "Footer",
    fields: [
      { key: "footerBackground", label: "Footer background" },
      { key: "footerForeground", label: "Footer foreground" },
    ],
  },
  {
    title: "Actions",
    fields: [
      { key: "buttonBackground", label: "Button background" },
      { key: "buttonForeground", label: "Button foreground" },
    ],
  },
];

interface AppearanceStudioProps {
  initialTheme: ThemeConfig;
  initialAnimation: AnimationConfig;
  initialVisualEffects: VisualEffectsConfig;
  brand: BrandConfig;
  fonts?: { fontSans?: string; fontDisplay?: string };
  canUpdate: boolean;
}

export function AppearanceStudio({
  initialTheme,
  initialAnimation,
  initialVisualEffects,
  brand,
  fonts,
  canUpdate,
}: AppearanceStudioProps) {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [previewMode, setPreviewMode] = useState<ResolvedThemeMode>(
    initialTheme.defaultMode === "dark" ? "dark" : "light",
  );
  const [paletteSide, setPaletteSide] = useState<"light" | "dark">("light");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const defaults = useMemo(
    () =>
      themeConfigToFormValues(
        initialTheme,
        initialAnimation,
        fonts,
        initialVisualEffects,
      ),
    [initialTheme, initialAnimation, fonts, initialVisualEffects],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ThemeEditorFormValues>({
    resolver: zodResolver(themeEditorFormSchema),
    defaultValues: defaults,
  });

  const watched = useWatch({ control });

  const liveTheme = useMemo(() => {
    const parsed = themeEditorFormSchema.safeParse(watched);
    if (!parsed.success) {
      return formValuesToThemeConfig({
        ...defaults,
        ...watched,
        light: { ...defaults.light, ...(watched.light ?? {}) },
        dark: { ...defaults.dark, ...(watched.dark ?? {}) },
        enabledModes: watched.enabledModes?.length
          ? watched.enabledModes
          : defaults.enabledModes,
      } as ThemeEditorFormValues);
    }
    return formValuesToThemeConfig(parsed.data);
  }, [watched, defaults]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const onSave = handleSubmit((values) => {
    if (!canUpdate) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await saveThemeSettingsAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message);
      reset(values);
      router.refresh();
    });
  });

  const onCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        "Discard unsaved theme changes and leave this page?",
      );
      if (!confirmed) return;
    }
    router.push(getAdminPath("/settings"));
  };

  const onResetDefaults = () => {
    if (!canUpdate) return;
    const confirmed = window.confirm(
      "Reset the editor to platform defaults? This does not save until you click Save.",
    );
    if (!confirmed) return;
    reset(
      themeConfigToFormValues(
        defaultPlatformConfig.theme,
        defaultPlatformConfig.animation,
        {
          fontSans: defaultPlatformConfig.typography.fontSans,
          fontDisplay: defaultPlatformConfig.typography.fontDisplay,
        },
      ),
    );
    setSuccess(null);
    setError(null);
  };

  const toggleMode = (mode: ThemeMode, checked: boolean) => {
    const current = getValues("enabledModes");
    const next = checked
      ? Array.from(new Set([...current, mode]))
      : current.filter((item) => item !== mode);
    if (next.length === 0) return;
    setValue("enabledModes", next, { shouldDirty: true, shouldValidate: true });
    const defaultMode = getValues("defaultMode");
    if (!next.includes(defaultMode)) {
      setValue("defaultMode", next[0], { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="sticky top-0 z-30 -mx-1 mb-2 space-y-3 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background)_90%,var(--color-surface)_10%)] px-1 py-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? (
            <AdminStatusBadge tone="warning">Unsaved changes</AdminStatusBadge>
          ) : (
            <AdminStatusBadge tone="neutral">All changes saved</AdminStatusBadge>
          )}
          {!canUpdate ? (
            <AdminStatusBadge tone="neutral">View only</AdminStatusBadge>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(
                adminBtn(previewMode === "light" ? "primary" : "outline"),
                "!min-h-9",
              )}
              onClick={() => setPreviewMode("light")}
            >
              Preview Light
            </button>
            <button
              type="button"
              className={cn(
                adminBtn(previewMode === "dark" ? "primary" : "outline"),
                "!min-h-9",
              )}
              onClick={() => setPreviewMode("dark")}
            >
              Preview Dark
            </button>
            <button
              type="button"
              className={cn(adminBtn("outline"), "!min-h-9")}
              disabled={!isDirty || pending}
              onClick={() => {
                if (isDirty && !window.confirm("Discard unsaved changes?")) return;
                reset(defaults);
                setError(null);
                setSuccess(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(adminBtn("primary"), "!min-h-9")}
              disabled={!canUpdate || !isDirty || pending}
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_5%,transparent)]">
          <div
            className="admin-scroll-hide flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-2 py-2"
            role="tablist"
            aria-label="Appearance sections"
          >
            {APPEARANCE_TABS.map((label, index) => {
              const selected = tab === index;
              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    selected
                      ? "bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[var(--color-foreground)]"
                      : "text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] hover:text-[var(--color-foreground)]",
                  )}
                  onClick={() => setTab(index)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="space-y-6 p-4 md:p-6">
            <p className="text-sm text-[var(--color-muted)]">
              {
                [
                  "Store mode, density, and radius that shape the overall look.",
                  "Pick a palette, then fine-tune brand, surface, text, and status colors.",
                  "Header and footer chrome colors used by the live storefront shell.",
                  "Safe font families with live previews for headings and body text.",
                  "Motion intensity options that respect reduced-motion preferences.",
                  "Optional decorative 3D presets — never required for a working storefront.",
                  "Read-only branding snapshot used in the live preview panel.",
                ][tab]
              }
            </p>
            {tab === 0 ? (
              <section className="space-y-4" aria-labelledby="appearance-heading">
                <h2 id="appearance-heading" className="text-lg font-semibold">
                  Appearance
                </h2>

                <LogoThemeSuggest
                  logoUrl={brand.logoUrl}
                  mode="appearance"
                  onApplyPreview={(theme) => {
                    if (!canUpdate) return;
                    setValue("light", theme.light, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue("dark", theme.dark, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setSuccess(
                      "Suggested logo theme applied to the preview. Save to publish.",
                    );
                  }}
                />

                <Controller
                  control={control}
                  name="defaultMode"
                  render={({ field }) => (
                    <TextField
                      select
                      slotProps={{ select: { native: true } }}
                      label="Default mode"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                      error={Boolean(errors.defaultMode)}
                      helperText={errors.defaultMode?.message}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </TextField>
                  )}
                />

                <FormControl
                  component="fieldset"
                  required
                  error={Boolean(errors.enabledModes)}
                  disabled={!canUpdate || pending}
                >
                  <FormLabel component="legend" required>
                    Enabled modes
                  </FormLabel>
                  <FormGroup row>
                    {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                      <FormControlLabel
                        key={mode}
                        control={
                          <Checkbox
                            checked={(watched.enabledModes ?? []).includes(mode)}
                            onChange={(event) =>
                              toggleMode(mode, event.target.checked)
                            }
                          />
                        }
                        label={mode.charAt(0).toUpperCase() + mode.slice(1)}
                      />
                    ))}
                  </FormGroup>
                  <FormHelperText>
                    {errors.enabledModes?.message ??
                      "At least one mode must stay enabled."}
                  </FormHelperText>
                </FormControl>

                <Controller
                  control={control}
                  name="allowUserToggle"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={!canUpdate || pending}
                        />
                      }
                      label="Allow customer theme toggle"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="borderRadiusPreset"
                  render={({ field }) => (
                    <TextField
                      select
                      slotProps={{ select: { native: true } }}
                      label="Border radius"
                      fullWidth
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="none">None</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="xlarge">X-Large</option>
                    </TextField>
                  )}
                />
              </section>
            ) : null}

            {tab === 1 ? (
              <section className="space-y-6" aria-labelledby="colors-heading">
                <div>
                  <h2 id="colors-heading" className="text-lg font-semibold">
                    Color palettes
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Start from your logo, then pick a preset or fine-tune colors.
                  </p>
                </div>

                <LogoThemeSuggest
                  logoUrl={brand.logoUrl}
                  mode="appearance"
                  onApplyPreview={(theme) => {
                    if (!canUpdate) return;
                    setValue("light", theme.light, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setValue("dark", theme.dark, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setSuccess(
                      "Suggested logo theme applied to the preview. Save to publish.",
                    );
                    setTab(1);
                  }}
                />

                <div className="rounded-2xl border border-dashed border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] p-4">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    Create from Logo
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Upload a logo under Branding, then use Apply suggested theme
                    above. Presets below remain available anytime.
                  </p>
                  <Link
                    href={getAdminPath("/settings/branding")}
                    className={`${adminBtn("secondary")} mt-3`}
                  >
                    Open Branding
                  </Link>
                </div>

                {packsByCategory().map((group) => (
                  <div key={group.category} className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      {group.category}
                    </h3>
                    <div className={adminFieldsGrid(2)}>
                      {group.packs.map((pack) => {
                        const selected =
                          findMatchingThemePackId(
                            (watched.light as ThemeEditorFormValues["light"]) ??
                              defaults.light,
                            (watched.dark as ThemeEditorFormValues["dark"]) ??
                              defaults.dark,
                          ) === pack.id;
                        return (
                          <button
                            key={pack.id}
                            type="button"
                            disabled={!canUpdate || pending}
                            aria-pressed={selected}
                            onClick={() => {
                              setValue("light", pack.light, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setValue("dark", pack.dark, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                            className={cn(
                              "relative rounded-2xl border p-3 text-left transition-[box-shadow,border-color,background-color]",
                              selected
                                ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] shadow-[0_0_0_1px_var(--color-primary)]"
                                : "border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-primary)_55%,var(--color-border))]",
                            )}
                          >
                            {selected ? (
                              <span className="absolute right-2 top-2 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-button-foreground)]">
                                Selected
                              </span>
                            ) : null}
                            <div className="mb-3 flex h-12 overflow-hidden rounded-lg border border-[var(--color-border)]">
                              {pack.preview.map((color) => (
                                <span
                                  key={`${pack.id}-${color}`}
                                  className="flex-1"
                                  style={{ backgroundColor: color }}
                                  aria-hidden
                                />
                              ))}
                            </div>
                            <p className="text-sm font-semibold">{pack.name}</p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                              {pack.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <details className="rounded-2xl border border-[var(--color-border)] p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Advanced: edit individual colors
                  </summary>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[var(--color-muted)]">
                      Brand, surface, text, and status colors — grouped for clarity.
                    </p>
                    <TextField
                      select
                      slotProps={{ select: { native: true } }}
                      size="small"
                      label="Edit palette"
                      value={paletteSide}
                      onChange={(event) =>
                        setPaletteSide(event.target.value as "light" | "dark")
                      }
                      sx={{ minWidth: 140 }}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </TextField>
                  </div>
                  <div className="mt-5 space-y-6">
                    {COLOR_GROUPS.map((group) => (
                      <div key={group.title}>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                          {group.title}
                        </h3>
                        <div className={adminFieldsGrid(2)}>
                          {group.fields.map((item) => (
                            <ColorField
                              key={`${paletteSide}-${item.key}`}
                              control={control}
                              name={`${paletteSide}.${item.key}`}
                              label={item.label}
                              disabled={!canUpdate || pending}
                              contrastAgainst={
                                item.key === "primary"
                                  ? String(
                                      (
                                        watched[
                                          paletteSide
                                        ] as ThemeEditorFormValues["light"]
                                      )?.buttonForeground ?? "#ffffff",
                                    )
                                  : item.key === "foreground"
                                    ? String(
                                        (
                                          watched[
                                            paletteSide
                                          ] as ThemeEditorFormValues["light"]
                                        )?.background ?? "#ffffff",
                                      )
                                    : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </section>
            ) : null}

            {tab === 2 ? (
              <section className="space-y-5" aria-labelledby="chrome-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="chrome-heading" className="text-lg font-semibold">
                    Header, footer & buttons
                  </h2>
                  <TextField
                    select
                      slotProps={{ select: { native: true } }}
                    size="small"
                    label="Palette"
                    value={paletteSide}
                    onChange={(event) =>
                      setPaletteSide(event.target.value as "light" | "dark")
                    }
                    sx={{ minWidth: 140 }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </TextField>
                </div>
                <div className="space-y-6">
                  {CHROME_GROUPS.map((group) => (
                    <div key={group.title}>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        {group.title}
                      </h3>
                      <div className={adminFieldsGrid(2)}>
                        {group.fields.map((item) => (
                          <ColorField
                            key={`${paletteSide}-${item.key}`}
                            control={control}
                            name={`${paletteSide}.${item.key}`}
                            label={item.label}
                            disabled={!canUpdate || pending}
                            contrastAgainst={
                              item.key === "buttonBackground"
                                ? String(
                                    (
                                      watched[
                                        paletteSide
                                      ] as ThemeEditorFormValues["light"]
                                    )?.buttonForeground ?? "#ffffff",
                                  )
                                : item.key === "headerForeground"
                                  ? String(
                                      (
                                        watched[
                                          paletteSide
                                        ] as ThemeEditorFormValues["light"]
                                      )?.headerBackground ?? "#ffffff",
                                    )
                                  : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === 3 ? (
              <section className="space-y-6" aria-labelledby="type-heading">
                <h2 id="type-heading" className="text-lg font-semibold">
                  Typography
                </h2>
                <div>
                  <p className="mb-3 text-sm font-medium">Heading font</p>
                  <Controller
                    control={control}
                    name="fontDisplay"
                    render={({ field }) => (
                      <div className={adminFieldsGrid(2)}>
                        {SAFE_FONT_OPTIONS.map((font) => {
                          const selected = field.value === font.id;
                          return (
                            <button
                              key={`display-${font.id}`}
                              type="button"
                              disabled={!canUpdate || pending}
                              aria-pressed={selected}
                              onClick={() => field.onChange(font.id)}
                              className={cn(
                                "rounded-2xl border p-4 text-left transition-colors",
                                selected
                                  ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                                  : "border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))]",
                              )}
                            >
                              <p
                                className="text-3xl font-semibold tracking-tight"
                                style={{ fontFamily: font.css }}
                              >
                                Aa
                              </p>
                              <p className="mt-2 text-sm font-semibold">
                                {font.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium">Body font</p>
                  <Controller
                    control={control}
                    name="fontSans"
                    render={({ field }) => (
                      <div className={adminFieldsGrid(2)}>
                        {SAFE_FONT_OPTIONS.map((font) => {
                          const selected = field.value === font.id;
                          return (
                            <button
                              key={`sans-${font.id}`}
                              type="button"
                              disabled={!canUpdate || pending}
                              aria-pressed={selected}
                              onClick={() => field.onChange(font.id)}
                              className={cn(
                                "rounded-2xl border p-4 text-left transition-colors",
                                selected
                                  ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                                  : "border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-primary)_45%,var(--color-border))]",
                              )}
                            >
                              <p
                                className="text-base leading-relaxed"
                                style={{ fontFamily: font.css }}
                              >
                                The quick brown fox jumps over the lazy dog.
                              </p>
                              <p className="mt-2 text-sm font-semibold">
                                {font.label}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  Only predefined safe fonts are available. Arbitrary remote font
                  URLs are not allowed.
                </p>
              </section>
            ) : null}

            {tab === 4 ? (
              <section className="space-y-5" aria-labelledby="animation-heading">
                <h2 id="animation-heading" className="text-lg font-semibold">
                  Animation
                </h2>
                <Controller
                  control={control}
                  name="animationEnabled"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={!canUpdate || pending}
                        />
                      }
                      label="Enable animations"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="animationIntensity"
                  render={({ field }) => (
                    <div className={adminFieldsGrid(2)}>
                      {(
                        [
                          ["none", "None", "No motion"],
                          ["subtle", "Subtle", "Light, professional motion"],
                          ["medium", "Smooth", "Balanced storefront motion"],
                          ["high", "Dynamic", "More expressive transitions"],
                        ] as const
                      ).map(([value, label, hint]) => {
                        const selected = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={!canUpdate || pending}
                            aria-pressed={selected}
                            onClick={() => field.onChange(value)}
                            className={cn(
                              "rounded-2xl border p-4 text-left transition-colors motion-safe:hover:-translate-y-0.5",
                              selected
                                ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                                : "border-[var(--color-border)]",
                            )}
                          >
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {hint}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="animationPreset"
                  render={({ field }) => (
                    <TextField
                      select
                      slotProps={{ select: { native: true } }}
                      label="Default preset"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="fade">Fade</option>
                      <option value="fade-up">Fade up</option>
                      <option value="fade-down">Fade down</option>
                      <option value="slide-up">Slide up</option>
                      <option value="slide-down">Slide down</option>
                      <option value="scale">Scale</option>
                      <option value="none">None</option>
                    </TextField>
                  )}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  Prefers-reduced-motion is always respected on the storefront.
                </p>
              </section>
            ) : null}

            {tab === 5 ? (
              <section
                className="space-y-4"
                aria-labelledby="visual-effects-heading"
              >
                <h2 id="visual-effects-heading" className="text-lg font-semibold">
                  3D effects
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Optional decorative depth for heroes and products. Your store
                  always works without these effects.
                </p>
                <Controller
                  control={control}
                  name="visual3dEnabled"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={!canUpdate || pending}
                        />
                      }
                      label="3D effects"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="visual3dHeroEnabled"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={!canUpdate || pending}
                        />
                      }
                      label="Hero scene"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="visual3dProductEnabled"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={!canUpdate || pending}
                        />
                      }
                      label="Product 3D"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="visual3dQuality"
                  render={({ field }) => (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          ["LOW", "Basic", "Faster on older devices"],
                          ["MEDIUM", "Balanced", "Good quality for most stores"],
                          ["HIGH", "High Quality", "Richer detail when devices allow"],
                        ] as const
                      ).map(([value, label, hint]) => {
                        const selected = field.value === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={!canUpdate || pending}
                            aria-pressed={selected}
                            onClick={() => field.onChange(value)}
                            className={cn(
                              "rounded-2xl border p-4 text-left",
                              selected
                                ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                                : "border-[var(--color-border)]",
                            )}
                          >
                            <p className="text-sm font-semibold">{label}</p>
                            <p className="mt-1 text-xs text-[var(--color-muted)]">
                              {hint}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="visual3dHeroPreset"
                  render={({ field }) => (
                    <TextField
                      select
                      slotProps={{ select: { native: true } }}
                      label="Default hero scene"
                      fullWidth
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                      helperText="Homepage hero sections can override this."
                    >
                      {(
                        Object.keys(VISUAL_3D_PRESET_LABELS) as Array<
                          keyof typeof VISUAL_3D_PRESET_LABELS
                        >
                      ).map((preset) => (
                        <option key={preset} value={preset}>
                          {VISUAL_3D_PRESET_LABELS[preset]}
                        </option>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  control={control}
                  name="visual3dMobileEnabled"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={!canUpdate || pending}
                        />
                      }
                      label="Mobile 3D (off recommended)"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="visual3dRespectReducedMotion"
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(event) =>
                            field.onChange(event.target.checked)
                          }
                          disabled={!canUpdate || pending}
                        />
                      }
                      label="Respect reduced motion"
                    />
                  )}
                />
              </section>
            ) : null}

            {tab === 6 ? (
              <section className="space-y-4" aria-labelledby="branding-heading">
                <h2 id="branding-heading" className="text-lg font-semibold">
                  Branding preview
                </h2>
                <p className="text-sm text-[var(--color-muted)]">
                  Branding is read-only here. Edit brand assets in a later
                  settings phase.
                </p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-[var(--color-muted)]">Brand name</dt>
                    <dd className="font-medium">{brand.name}</dd>
                  </div>
                  {brand.tagline ? (
                    <div>
                      <dt className="text-[var(--color-muted)]">Tagline</dt>
                      <dd>{brand.tagline}</dd>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-4">
                    {brand.logoUrl ? (
                      <div>
                        <p className="mb-2 text-[var(--color-muted)]">Logo</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={brand.logoUrl}
                          alt=""
                          className="h-10 w-auto rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
                        />
                      </div>
                    ) : null}
                    {brand.logoDarkUrl ? (
                      <div>
                        <p className="mb-2 text-[var(--color-muted)]">Dark logo</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={brand.logoDarkUrl}
                          alt=""
                          className="h-10 w-auto rounded border border-[var(--color-border)] bg-[var(--color-foreground)] p-2"
                        />
                      </div>
                    ) : null}
                  </div>
                </dl>
              </section>
            ) : null}
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Live preview
            </h2>
            <TextField
              select
                      slotProps={{ select: { native: true } }}
              size="small"
              label="Preview mode"
              value={previewMode}
              onChange={(event) =>
                setPreviewMode(event.target.value as ResolvedThemeMode)
              }
              sx={{ minWidth: 120 }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </TextField>
          </div>
          <ThemeEditorPreviewCanvas
            theme={liveTheme}
            mode={previewMode}
            brand={brand}
          />
        </aside>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-4">
        <button
          type="submit"
          className={adminBtn("primary")}
          disabled={!canUpdate || pending || !isDirty}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className={adminBtn("outline")}
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={adminBtn("ghost")}
          disabled={!canUpdate || pending}
          onClick={onResetDefaults}
        >
          Reset to default
        </button>
      </div>
    </form>
  );
}

/** @deprecated Use AppearanceStudio */
export const ThemeEditorForm = AppearanceStudio;

