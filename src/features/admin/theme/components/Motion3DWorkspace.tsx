"use client";

/**
 * Motion & 3D workspace — thin wrapper around shared Appearance split layout.
 * Kept for imports/tests; AppearanceStudio uses AppearanceSplitLayout for all tabs.
 */
import type { ReactNode } from "react";
import { AppearanceSplitLayout } from "@/features/admin/theme/components/AppearanceSplitLayout";
import type { BrandConfig, ResolvedThemeMode, ThemeConfig } from "@/types";
import type {
  ButtonHoverOption,
  ButtonStyleOption,
  CardMotionOption,
  ImageMotionOption,
  StoreFeel,
  ThreeFeel,
} from "@/features/motion-3d/studio-ui";

type PreviewDevice = "desktop" | "mobile";

type Props = {
  settings: ReactNode;
  theme: ThemeConfig;
  mode: ResolvedThemeMode;
  brand: BrandConfig;
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

export function Motion3DWorkspace(props: Props) {
  return (
    <div data-motion-workspace="true">
      <AppearanceSplitLayout {...props} showMotionControls />
    </div>
  );
}
