import type { ReactNode } from "react";

/** Auth route group — pages provide AuthShell themselves. */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return children;
}
