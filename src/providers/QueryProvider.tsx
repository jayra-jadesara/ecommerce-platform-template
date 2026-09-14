"use client";

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { wishlistMembershipQueryKey } from "@/features/wishlist/query-keys";

const FREE_SHIPPING_HINT_KEY = ["free-shipping-hint"] as const;

/** Drop abandoned chrome fetches on soft nav; never touches mutations. */
function CancelStaleChromeQueries() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    void queryClient.cancelQueries({ queryKey: wishlistMembershipQueryKey });
    void queryClient.cancelQueries({ queryKey: FREE_SHIPPING_HINT_KEY });
  }, [pathname, queryClient]);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <CancelStaleChromeQueries />
      {children}
    </QueryClientProvider>
  );
}
