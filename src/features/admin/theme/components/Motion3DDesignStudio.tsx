"use client";

import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import type { ThemeEditorFormValues } from "@/features/admin/theme/editor-schema";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import {
  applyButtonHover,
  applyButtonStyle,
  applyCardMotion,
  applyImageMotion,
  applyMobile3dUi,
  applyPerformanceUi,
  applyRecommendedMotion3d,
  applyStoreFeel,
  applyThreeFeel,
  BUTTON_HOVER_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  CARD_MOTION_COPY,
  CARD_MOTION_OPTIONS,
  IMAGE_MOTION_COPY,
  IMAGE_MOTION_OPTIONS,
  inferButtonHover,
  inferButtonStyle,
  inferCardMotion,
  inferImageMotion,
  inferMobile3dUi,
  inferPerformanceUi,
  inferStoreFeel,
  inferThreeFeel,
  STORE_FEEL_COPY,
  STORE_FEEL_OPTIONS,
  THREE_FEEL_COPY,
  THREE_FEEL_OPTIONS,
  type ButtonHoverOption,
  type ButtonStyleOption,
  type CardMotionOption,
  type ImageMotionOption,
  type Mobile3dUi,
  type PerformanceUi,
  type StoreFeel,
  type ThreeFeel,
} from "@/features/motion-3d/studio-ui";

type Props = {
  control: Control<ThemeEditorFormValues>;
  watch: UseFormWatch<ThemeEditorFormValues>;
  setValue: UseFormSetValue<ThemeEditorFormValues>;
  values: ThemeEditorFormValues;
  canUpdate: boolean;
  pending: boolean;
};

function patchValues(
  setValue: UseFormSetValue<ThemeEditorFormValues>,
  partial: Partial<ThemeEditorFormValues>,
) {
  for (const [key, value] of Object.entries(partial)) {
    setValue(key as keyof ThemeEditorFormValues, value as never, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }
}

function StudioSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="motion-section space-y-2.5 border-b border-[var(--color-border)] pb-5 last:border-b-0 last:pb-0">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          {title}
        </h3>
        {hint ? (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function VisualOption({
  selected,
  disabled,
  label,
  description,
  onSelect,
  preview,
}: {
  selected: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onSelect: () => void;
  preview: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      disabled={disabled}
      aria-checked={selected}
      aria-label={`${label}: ${description}`}
      onClick={onSelect}
      className={cn(
        "motion-opt rounded-xl border p-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
        selected
          ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
          : "border-[var(--color-border)] hover:border-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-border))]",
      )}
    >
      <div
        className="motion-opt__preview mb-1.5 flex h-9 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        aria-hidden
      >
        {preview}
      </div>
      <p className="text-xs font-semibold">{label}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-muted)]">
        {description}
      </p>
    </button>
  );
}

function MiniBtn({
  style,
}: {
  style: ButtonStyleOption;
}) {
  const cls =
    style === "outline"
      ? "border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)]"
      : style === "soft"
        ? "border-0 bg-[color-mix(in_srgb,var(--color-primary)_16%,var(--color-card))] text-[var(--color-primary)]"
        : style === "pill" || style === "floating"
          ? "border-0 bg-[var(--color-primary)] text-[var(--color-button-foreground)] rounded-full"
          : "border-0 bg-[var(--color-primary)] text-[var(--color-button-foreground)]";
  const shadow =
    style === "floating"
      ? "shadow-[0_6px_14px_color-mix(in_srgb,var(--color-primary)_28%,transparent)]"
      : "";
  return (
    <span
      className={cn(
        "inline-flex px-2.5 py-1 text-[10px] font-semibold",
        style === "pill" || style === "floating" ? "rounded-full" : "rounded-md",
        cls,
        shadow,
      )}
    >
      Shop Now
    </span>
  );
}

/**
 * Phase 25.3 — compact left-rail Motion & 3D Design Studio controls.
 */
export function Motion3DDesignStudio({
  control,
  watch,
  setValue,
  values,
  canUpdate,
  pending,
}: Props) {
  const disabled = !canUpdate || pending;
  const storeFeel = inferStoreFeel(values);
  const imageMotion = inferImageMotion(values);
  const cardMotion = inferCardMotion(values);
  const buttonStyle = inferButtonStyle(values);
  const buttonHover = inferButtonHover(values);
  const threeFeel = inferThreeFeel(values);
  const mobile3d = inferMobile3dUi(values);
  const performance = inferPerformanceUi(values);
  const patch = (partial: Partial<ThemeEditorFormValues>) =>
    patchValues(setValue, partial);

  return (
    <div className="motion-studio-compact space-y-5">
      <header>
        <h2 className="text-lg font-semibold tracking-tight">Motion &amp; 3D</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Choose how your store looks, moves and feels.
        </p>
      </header>

      <StudioSection title="Store Feel">
        <p className="text-xs font-medium text-[var(--color-foreground)]">
          How should your store feel?
        </p>
        <div
          className="grid grid-cols-2 gap-2.5"
          role="radiogroup"
          aria-label="Store feel"
        >
          {STORE_FEEL_OPTIONS.map((feel) => {
            const copy = STORE_FEEL_COPY[feel];
            return (
              <VisualOption
                key={feel}
                selected={storeFeel === feel}
                disabled={disabled}
                label={copy.title}
                description={copy.description}
                onSelect={() => patch(applyStoreFeel(feel as StoreFeel))}
                preview={
                  <div className={cn("h-full w-full", copy.previewClass)}>
                    <div className="sf-feel-dot" />
                  </div>
                }
              />
            );
          })}
        </div>
      </StudioSection>

      <StudioSection
        title="Images"
        hint="How product images move on cards."
      >
        <p className="text-xs font-medium">Product image effect</p>
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          role="radiogroup"
          aria-label="Product image effect"
        >
          {IMAGE_MOTION_OPTIONS.map((option) => {
            const copy = IMAGE_MOTION_COPY[option];
            return (
              <VisualOption
                key={option}
                selected={imageMotion === option}
                disabled={disabled}
                label={copy.title}
                description={copy.description}
                onSelect={() =>
                  patch(applyImageMotion(option as ImageMotionOption, values))
                }
                preview={
                  <div
                    className={cn(
                      "h-8 w-8 rounded-md bg-[color-mix(in_srgb,var(--color-primary)_35%,var(--color-surface))]",
                      option === "gentle-zoom" && "sf-mini-img-zoom",
                      option === "lift" && "sf-mini-img-lift",
                      option === "float" && "sf-mini-img-float",
                    )}
                  />
                }
              />
            );
          })}
        </div>
      </StudioSection>

      <StudioSection
        title="Cards"
        hint="How product cards respond when browsing."
      >
        <p className="text-xs font-medium">Card style &amp; motion</p>
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Card style and motion"
        >
          {CARD_MOTION_OPTIONS.map((option) => {
            const copy = CARD_MOTION_COPY[option];
            return (
              <VisualOption
                key={option}
                selected={cardMotion === option}
                disabled={disabled}
                label={copy.title}
                description={copy.description}
                onSelect={() =>
                  patch(applyCardMotion(option as CardMotionOption))
                }
                preview={
                  <div
                    className={cn(
                      "h-9 w-14 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]",
                      option === "lift" && "sf-mini-card-lift",
                      option === "zoom" && "sf-mini-card-zoom",
                      option === "float" && "sf-mini-card-float",
                      option === "glow" && "sf-mini-card-glow",
                    )}
                  />
                }
              />
            );
          })}
        </div>
      </StudioSection>

      <StudioSection title="Buttons">
        <p className="mb-2 text-xs font-medium">Button style</p>
        <div
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-3"
          role="radiogroup"
          aria-label="Button style"
        >
          {BUTTON_STYLE_OPTIONS.map((option) => (
            <VisualOption
              key={option}
              selected={buttonStyle === option}
              disabled={disabled}
              label={
                option === "solid"
                  ? "Solid"
                  : option === "outline"
                    ? "Outline"
                    : option === "soft"
                      ? "Soft"
                      : option === "pill"
                        ? "Pill"
                        : "Floating"
              }
              description={
                option === "floating"
                  ? "Elevated primary action"
                  : option === "pill"
                    ? "Rounded capsule shape"
                    : "Storefront CTA look"
              }
              onSelect={() =>
                patch(applyButtonStyle(option as ButtonStyleOption, values))
              }
              preview={<MiniBtn style={option as ButtonStyleOption} />}
            />
          ))}
        </div>
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold">Button hover</p>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Button hover"
          >
            {BUTTON_HOVER_OPTIONS.map((option) => {
              const selected = buttonHover === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  disabled={disabled}
                  aria-checked={selected}
                  onClick={() =>
                    patch(applyButtonHover(option as ButtonHoverOption))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    selected
                      ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)]",
                  )}
                >
                  {option === "none"
                    ? "None"
                    : option === "lift"
                      ? "Lift"
                      : option === "glow"
                        ? "Glow"
                        : "Scale"}
                </button>
              );
            })}
          </div>
        </div>
      </StudioSection>

      <StudioSection
        title="3D"
        hint="Add depth and interactive visual effects to your store."
      >
        <Controller
          control={control}
          name="visual3dEnabled"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  disabled={disabled}
                />
              }
              label="3D effects"
            />
          )}
        />
        <p className="text-xs font-medium">3D style</p>
        <div
          className="grid grid-cols-2 gap-2.5"
          role="radiogroup"
          aria-label="3D style"
        >
          {THREE_FEEL_OPTIONS.map((feel) => {
            const copy = THREE_FEEL_COPY[feel];
            return (
              <VisualOption
                key={feel}
                selected={threeFeel === feel}
                disabled={disabled}
                label={copy.title}
                description={copy.description}
                onSelect={() => patch(applyThreeFeel(feel as ThreeFeel))}
                preview={
                  <div
                    className={cn(
                      "h-9 w-full rounded-md",
                      feel === "NONE" && "bg-[var(--color-surface)]",
                      feel === "SOFT" && "sf-three-thumb sf-three-thumb--soft",
                      feel === "PREMIUM" &&
                        "sf-three-thumb sf-three-thumb--premium",
                      feel === "IMMERSIVE" &&
                        "sf-three-thumb sf-three-thumb--immersive",
                    )}
                  />
                }
              />
            );
          })}
        </div>
        <div className="mt-2 space-y-1">
          <Controller
            control={control}
            name="visual3dHeroEnabled"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    disabled={disabled || !watch("visual3dEnabled")}
                  />
                }
                label="Hero 3D — add a 3D visual effect to your homepage hero"
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
                    onChange={(event) => field.onChange(event.target.checked)}
                    disabled={disabled || !watch("visual3dEnabled")}
                  />
                }
                label="Product 3D — show a 3D model when a product has one"
              />
            )}
          />
        </div>
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold">3D on mobile</p>
          <p className="mb-2 text-[11px] text-[var(--color-muted)]">
            Keep mobile shopping fast.
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="3D on mobile"
          >
            {(["off", "light", "full"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                disabled={disabled || !watch("visual3dEnabled")}
                aria-checked={mobile3d === option}
                onClick={() => patch(applyMobile3dUi(option as Mobile3dUi))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  mobile3d === option
                    ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                    : "border-[var(--color-border)] text-[var(--color-muted)]",
                )}
              >
                {option === "off" ? "Off" : option === "light" ? "Light" : "Full"}
              </button>
            ))}
          </div>
        </div>
        <Controller
          control={control}
          name="visual3dRespectReducedMotion"
          render={({ field }) => (
            <FormControlLabel
              className="mt-2"
              control={
                <Switch
                  checked={true}
                  onChange={() => field.onChange(true)}
                  disabled
                />
              }
              label="Respect reduced motion — customers who prefer less motion will see a calmer experience"
            />
          )}
        />
      </StudioSection>

      <details className="rounded-xl border border-[var(--color-border)] p-3">
        <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold">Animation intensity</p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Animation intensity"
            >
              {(
                [
                  ["none", "Off"],
                  ["subtle", "Subtle"],
                  ["medium", "Balanced"],
                  ["high", "Strong"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  disabled={disabled}
                  aria-checked={values.animationIntensity === value}
                  onClick={() =>
                    patch({
                      animationEnabled: value !== "none",
                      animationIntensity: value,
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    values.animationIntensity === value
                      ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold">Performance</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Performance">
              {(["balanced", "high"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  disabled={disabled || !watch("visual3dEnabled")}
                  aria-checked={performance === option}
                  onClick={() =>
                    patch(applyPerformanceUi(option as PerformanceUi))
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    performance === option
                      ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)]",
                  )}
                >
                  {option === "balanced" ? "Balanced" : "High quality"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold">Quality</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="3D quality">
              {(
                [
                  ["LOW", "Light"],
                  ["MEDIUM", "Standard"],
                  ["HIGH", "Detailed"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  disabled={disabled || !watch("visual3dEnabled")}
                  aria-checked={values.visual3dQuality === value}
                  onClick={() => patch({ visual3dQuality: value })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold",
                    values.visual3dQuality === value
                      ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]"
                      : "border-[var(--color-border)] text-[var(--color-muted)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold">Fallback behavior</p>
            <p className="mb-2 text-[11px] text-[var(--color-muted)]">
              When 3D is unavailable, shoppers always see a polished 2D
              experience.
            </p>
            <FormControlLabel
              control={<Switch checked disabled />}
              label="Prefer simple visuals when needed"
            />
          </div>
          <button
            type="button"
            className={cn(adminBtn("secondary"), "!min-h-9")}
            disabled={disabled}
            onClick={() => patch(applyRecommendedMotion3d())}
          >
            Reset to recommended
          </button>
          <p className="text-[11px] text-[var(--color-muted)]">
            Loads Modern feel with 3D off into the form. Save to publish.
          </p>
        </div>
      </details>
    </div>
  );
}
