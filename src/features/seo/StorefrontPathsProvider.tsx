"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { StorefrontPathDef } from "@/features/seo/storefront-paths";
import { storefrontPathOptions } from "@/features/seo/storefront-paths";

const StorefrontPathsContext = createContext<StorefrontPathDef[]>([]);

export function StorefrontPathsProvider({
  paths,
  children,
}: {
  paths: StorefrontPathDef[];
  children: ReactNode;
}) {
  const value = useMemo(() => paths, [paths]);
  return (
    <StorefrontPathsContext.Provider value={value}>
      {children}
    </StorefrontPathsContext.Provider>
  );
}

export function useStorefrontPaths(): StorefrontPathDef[] {
  return useContext(StorefrontPathsContext);
}

export function useStorefrontPathSelectOptions(): Array<{
  value: string;
  label: string;
}> {
  const paths = useStorefrontPaths();
  return useMemo(() => storefrontPathOptions(paths), [paths]);
}
