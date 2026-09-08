"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { saveThemeSettingsAction } from "@/features/admin/theme/actions";
import { ColorField } from "@/features/admin/theme/components/ColorField";
import { ThemeEditorPreviewCanvas } from "@/features/admin/theme/components/ThemeEditorPreviewCanvas";
import {
  THEME_COLOR_PACKS,
  findMatchingThemePackId,
} from "@/features/admin/theme/color-packs";
import {
  SAFE_FONT_OPTIONS,
  formValuesToThemeConfig,
  themeConfigToFormValues,
  themeEditorFormSchema,
  type ThemeEditorFormValues,
} from "@/features/admin/theme/editor-schema";
import { defaultPlatformConfig } from "@/config/defaults";
import { getAdminPath } from "@/config/admin-route";
import type {
  AnimationConfig,
  BrandConfig,
  ResolvedThemeMode,
  ThemeConfig,
  ThemeMode,
} from "@/types";

const COLOR_FIELDS: Array<{
  key: keyof ThemeEditorFormValues["light"];
  label: string;
}> = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Foreground" },
  { key: "surface", label: "Surface" },
  { key: "card", label: "Card" },
  { key: "border", label: "Border" },
  { key: "muted", label: "Muted" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
];

const CHROME_FIELDS: Array<{
  key: keyof ThemeEditorFormValues["light"];
  label: string;
}> = [
  { key: "headerBackground", label: "Header background" },
  { key: "headerForeground", label: "Header foreground" },
  { key: "footerBackground", label: "Footer background" },
  { key: "footerForeground", label: "Footer foreground" },
  { key: "buttonBackground", label: "Button background" },
  { key: "buttonForeground", label: "Button foreground" },
];

interface ThemeEditorFormProps {
  initialTheme: ThemeConfig;
  initialAnimation: AnimationConfig;
  brand: BrandConfig;
  fonts?: { fontSans?: string; fontDisplay?: string };
  canUpdate: boolean;
}

export function ThemeEditorForm({
  initialTheme,
  initialAnimation,
  brand,
  fonts,
  canUpdate,
}: ThemeEditorFormProps) {
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
    () => themeConfigToFormValues(initialTheme, initialAnimation, fonts),
    [initialTheme, initialAnimation, fonts],
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          Preview updates as you edit. Click Save to apply changes to your store.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? (
            <span className="rounded-full border border-[var(--color-warning)] px-3 py-1 text-xs font-medium text-[var(--color-warning)]">
              Unsaved changes
            </span>
          ) : null}
          {!canUpdate ? (
            <Tooltip title="You can view appearance settings but cannot save changes.">
              <span className="text-xs text-[var(--color-muted)]">View only</span>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          <Tabs
            value={tab}
            onChange={(_, value: number) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Appearance sections"
          >
            <Tab label="Appearance" />
            <Tab label="Colors" />
            <Tab label="Header / Footer" />
            <Tab label="Typography" />
            <Tab label="Animation" />
            <Tab label="Branding" />
          </Tabs>

          <div className="space-y-6 p-4 md:p-6">
            {tab === 0 ? (
              <section className="space-y-4" aria-labelledby="appearance-heading">
                <h2 id="appearance-heading" className="text-lg font-semibold">
                  Appearance
                </h2>
                <Controller
                  control={control}
                  name="defaultMode"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Default mode"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                      error={Boolean(errors.defaultMode)}
                      helperText={errors.defaultMode?.message}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="system">System</MenuItem>
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
                      label="Border radius"
                      fullWidth
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="small">Small</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="large">Large</MenuItem>
                      <MenuItem value="xlarge">X-Large</MenuItem>
                    </TextField>
                  )}
                />
              </section>
            ) : null}

            {tab === 1 ? (
              <section className="space-y-5" aria-labelledby="colors-heading">
                <div>
                  <h2 id="colors-heading" className="text-lg font-semibold">
                    Choose a look
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Pick a ready-made color set. You can fine-tune individual
                    colors below if you want.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {THEME_COLOR_PACKS.map((pack) => {
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
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                            : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                        }`}
                      >
                        <div className="mb-3 flex h-10 overflow-hidden rounded-md border border-[var(--color-border)]">
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

                <details className="rounded-xl border border-[var(--color-border)] p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Advanced: edit individual colors
                  </summary>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[var(--color-muted)]">
                      Only needed if you want custom hex values.
                    </p>
                    <TextField
                      select
                      size="small"
                      label="Edit palette"
                      value={paletteSide}
                      onChange={(event) =>
                        setPaletteSide(event.target.value as "light" | "dark")
                      }
                      sx={{ minWidth: 140 }}
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                    </TextField>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {COLOR_FIELDS.map((item) => (
                      <ColorField
                        key={`${paletteSide}-${item.key}`}
                        control={control}
                        name={`${paletteSide}.${item.key}`}
                        label={item.label}
                        disabled={!canUpdate || pending}
                      />
                    ))}
                  </div>
                </details>
              </section>
            ) : null}

            {tab === 2 ? (
              <section className="space-y-4" aria-labelledby="chrome-heading">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="chrome-heading" className="text-lg font-semibold">
                    Header, footer & buttons
                  </h2>
                  <TextField
                    select
                    size="small"
                    label="Palette"
                    value={paletteSide}
                    onChange={(event) =>
                      setPaletteSide(event.target.value as "light" | "dark")
                    }
                    sx={{ minWidth: 140 }}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                  </TextField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {CHROME_FIELDS.map((item) => (
                    <ColorField
                      key={`${paletteSide}-${item.key}`}
                      control={control}
                      name={`${paletteSide}.${item.key}`}
                      label={item.label}
                      disabled={!canUpdate || pending}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {tab === 3 ? (
              <section className="space-y-4" aria-labelledby="type-heading">
                <h2 id="type-heading" className="text-lg font-semibold">
                  Typography
                </h2>
                <Controller
                  control={control}
                  name="fontDisplay"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Heading font"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {SAFE_FONT_OPTIONS.map((font) => (
                        <MenuItem key={font.id} value={font.id}>
                          {font.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  control={control}
                  name="fontSans"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Body font"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      {SAFE_FONT_OPTIONS.map((font) => (
                        <MenuItem key={font.id} value={font.id}>
                          {font.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <p className="text-sm text-[var(--color-muted)]">
                  Only predefined safe fonts are available. Arbitrary remote font
                  URLs are not allowed.
                </p>
              </section>
            ) : null}

            {tab === 4 ? (
              <section className="space-y-4" aria-labelledby="animation-heading">
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
                    <TextField
                      select
                      label="Intensity"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="subtle">Subtle</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </TextField>
                  )}
                />
                <Controller
                  control={control}
                  name="animationPreset"
                  render={({ field }) => (
                    <TextField
                      select
                      label="Default preset"
                      fullWidth
                      required
                      disabled={!canUpdate || pending}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <MenuItem value="fade">Fade</MenuItem>
                      <MenuItem value="fade-up">Fade up</MenuItem>
                      <MenuItem value="fade-down">Fade down</MenuItem>
                      <MenuItem value="slide-up">Slide up</MenuItem>
                      <MenuItem value="slide-down">Slide down</MenuItem>
                      <MenuItem value="scale">Scale</MenuItem>
                      <MenuItem value="none">None</MenuItem>
                    </TextField>
                  )}
                />
              </section>
            ) : null}

            {tab === 5 ? (
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
              size="small"
              label="Preview mode"
              value={previewMode}
              onChange={(event) =>
                setPreviewMode(event.target.value as ResolvedThemeMode)
              }
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
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
        <Button
          type="submit"
          variant="contained"
          disabled={!canUpdate || pending || !isDirty}
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outlined"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="text"
          disabled={!canUpdate || pending}
          onClick={onResetDefaults}
        >
          Reset to default
        </Button>
      </div>
    </form>
  );
}
