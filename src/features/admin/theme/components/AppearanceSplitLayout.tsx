"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { adminBtn } from "@/features/admin/ui/admin-classes";
import { cn } from "@/lib/cn";
import type { BrandConfig, ResolvedThemeMode, ThemeConfig } from "@/types";
import { ThemeEditorPreviewCanvas } from "@/features/admin/theme/components/ThemeEditorPreviewCanvas";
import { ThemePreviewErrorBoundary } from "@/features/admin/theme/components/ThemePreviewErrorBoundary";
import type {
  ButtonHoverOption,
  ButtonStyleOption,
  CardMotionOption,
  ImageMotionOption,
  StoreFeel,
  ThreeFeel,
} from "@/features/motion-3d/studio-ui";

type PreviewDevice = "desktop" | "mobile";

const DESKTOP_MIN = 900;

type Props = {
  settings: ReactNode;
  theme: ThemeConfig;
  mode: ResolvedThemeMode;
  brand: BrandConfig;
  fonts?: { sans?: string; display?: string };
  showMotionControls?: boolean;
  previewMotion: boolean;
  preview3d: boolean;
  onPreviewMode: (mode: ResolvedThemeMode) => void;
  onPreviewMotion: () => void;
  onPreview3d: () => void;
  previewDevice: PreviewDevice;
  onPreviewDevice: (device: PreviewDevice) => void;
  motionActive: boolean;
  threeActive: boolean;
  product3dEnabled: boolean;
  storeFeel: StoreFeel;
  cardMotion: CardMotionOption;
  imageMotion: ImageMotionOption;
  threeFeel: ThreeFeel;
  buttonStyle: ButtonStyleOption;
  buttonHover: ButtonHoverOption;
};

/**
 * Shared Appearance studio layout for EVERY tab:
 * LEFT ~65% settings | RIGHT ~35% sticky live preview.
 */
export function AppearanceSplitLayout({
  settings,
  theme,
  mode,
  brand,
  fonts,
  showMotionControls = false,
  previewMotion,
  preview3d,
  onPreviewMode,
  onPreviewMotion,
  onPreview3d,
  previewDevice,
  onPreviewDevice,
  motionActive,
  threeActive,
  product3dEnabled,
  storeFeel,
  cardMotion,
  imageMotion,
  threeFeel,
  buttonStyle,
  buttonHover,
}: Props) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const workspaceStyle: CSSProperties = isDesktop
    ? {
        display: "grid",
        gridTemplateColumns: "minmax(0, 65%) minmax(280px, 35%)",
        gridTemplateRows: "auto",
        gap: "1.25rem",
        alignItems: "start",
        width: "100%",
      }
    : {
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        width: "100%",
      };

  const previewStyle: CSSProperties = isDesktop
    ? {
        position: "sticky",
        top: "5.5rem",
        alignSelf: "start",
        maxHeight: "calc(100dvh - 6.5rem)",
        overflow: "auto",
        minWidth: 0,
      }
    : {
        position: "static",
        minWidth: 0,
        width: "100%",
      };

  return (
    <div
      className="appearance-split-host"
      data-appearance-split="true"
      data-layout={isDesktop ? "split" : "stack"}
    >
      <div className="appearance-split" style={workspaceStyle}>
        <aside
          className="appearance-split__settings min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]"
          aria-label="Appearance settings"
          style={{ minWidth: 0, gridColumn: isDesktop ? 1 : undefined }}
        >
          {settings}
        </aside>

        <section
          className="appearance-split__preview rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3"
          aria-label="Live storefront preview"
          style={previewStyle}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Live preview
              <span className="ml-2 font-medium normal-case tracking-normal text-[var(--color-muted)]">
                · updates instantly
              </span>
            </h2>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                className={cn(
                  adminBtn(mode === "light" ? "primary" : "outline"),
                  "!min-h-8 !px-2.5 !text-xs",
                )}
                onClick={() => onPreviewMode("light")}
              >
                Light
              </button>
              <button
                type="button"
                className={cn(
                  adminBtn(mode === "dark" ? "primary" : "outline"),
                  "!min-h-8 !px-2.5 !text-xs",
                )}
                onClick={() => onPreviewMode("dark")}
              >
                Dark
              </button>
              <button
                type="button"
                className={cn(
                  adminBtn(previewDevice === "desktop" ? "primary" : "outline"),
                  "!min-h-8 !px-2.5 !text-xs",
                )}
                onClick={() => onPreviewDevice("desktop")}
              >
                Desktop
              </button>
              <button
                type="button"
                className={cn(
                  adminBtn(previewDevice === "mobile" ? "primary" : "outline"),
                  "!min-h-8 !px-2.5 !text-xs",
                )}
                onClick={() => onPreviewDevice("mobile")}
              >
                Mobile
              </button>
              {showMotionControls ? (
                <>
                  <button
                    type="button"
                    className={cn(
                      adminBtn(previewMotion ? "primary" : "outline"),
                      "!min-h-8 !px-2.5 !text-xs",
                    )}
                    onClick={onPreviewMotion}
                  >
                    Preview Motion
                  </button>
                  <button
                    type="button"
                    className={cn(
                      adminBtn(preview3d ? "primary" : "outline"),
                      "!min-h-8 !px-2.5 !text-xs",
                    )}
                    onClick={onPreview3d}
                  >
                    Preview 3D
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              "max-h-[calc(100dvh-11rem)] overflow-auto rounded-xl",
              previewDevice === "mobile" && "mx-auto max-w-[22rem]",
            )}
          >
            <ThemePreviewErrorBoundary>
              <ThemeEditorPreviewCanvas
                theme={theme}
                mode={mode}
                brand={brand}
                fonts={fonts}
                previewMotion={previewMotion}
                preview3d={preview3d}
                motionActive={motionActive}
                threeActive={threeActive}
                product3dEnabled={product3dEnabled}
                storeFeel={storeFeel}
                cardMotion={cardMotion}
                imageMotion={imageMotion}
                threeFeel={threeFeel}
                buttonStyle={buttonStyle}
                buttonHover={buttonHover}
                device={previewDevice}
              />
            </ThemePreviewErrorBoundary>
          </div>
        </section>
      </div>
    </div>
  );
}
