"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PlatformConfig } from "@/types";

const PlatformConfigContext = createContext<PlatformConfig | null>(null);

export function PlatformConfigProvider({
  config,
  children,
}: {
  config: PlatformConfig;
  children: ReactNode;
}) {
  return (
    <PlatformConfigContext.Provider value={config}>
      {children}
    </PlatformConfigContext.Provider>
  );
}

export function usePlatformConfig(): PlatformConfig {
  const ctx = useContext(PlatformConfigContext);
  if (!ctx) {
    throw new Error("usePlatformConfig must be used within PlatformConfigProvider");
  }
  return ctx;
}
