import { isBenignNextStreamAbort } from "@/features/error-monitoring/benign-next-errors";

/**
 * Suppress Next 16.3 client-abort RSC noise (vercel/next.js#96704).
 * Real render errors still reach logging / error monitoring unchanged.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.some((arg) => isBenignNextStreamAbort(arg))) return;
    originalError(...args);
  };
}

export function onRequestError(
  error: { digest?: string } & Error,
  _request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  _context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?:
      | "react-server-components"
      | "react-server-components-payload"
      | "server-rendering";
    revalidateReason?: "on-demand" | "stale" | undefined;
    renderType?: "dynamic" | "dynamic-resume";
  },
): void {
  if (isBenignNextStreamAbort(error)) return;
}
