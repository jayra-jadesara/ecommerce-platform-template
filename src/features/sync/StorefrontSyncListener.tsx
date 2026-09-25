"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  STOREFRONT_SYNC_TABLE,
  storefrontSyncFilter,
} from "@/features/sync/channel";
import { isSyncTopic, resolveSyncPlan } from "@/features/sync/topics";

const DEBOUNCE_MS = 400;

type StorefrontSyncListenerProps = {
  /** Active store id — sync is store-isolated. */
  storeId: string | null | undefined;
  /** When false, listener is idle (e.g. admin shell). Default true. */
  enabled?: boolean;
};

/**
 * Subscribes to store-scoped Admin→Storefront sync signals.
 * On event: invalidate matching TanStack keys + router.refresh() for RSC.
 * Safe if Realtime is unavailable — storefront still works via normal fetch.
 */
export function StorefrontSyncListener({
  storeId,
  enabled = true,
}: StorefrontSyncListenerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTopicsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !storeId?.trim()) return;

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    const channelName = `storefront-sync:${storeId}`;

    const flush = () => {
      const topics = [...pendingTopicsRef.current].filter(isSyncTopic);
      pendingTopicsRef.current.clear();
      if (!topics.length) return;

      const plan = resolveSyncPlan(topics);
      for (const prefix of plan.queryKeyPrefixes) {
        void queryClient.invalidateQueries({ queryKey: prefix });
      }
      if (plan.refreshRouter) {
        router.refresh();
      }
    };

    const schedule = (topics: string[]) => {
      for (const t of topics) pendingTopicsRef.current.add(t);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        flush();
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: STOREFRONT_SYNC_TABLE,
          filter: storefrontSyncFilter(storeId),
        },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as { topics?: string[] | null };
          const topics = Array.isArray(row.topics) ? row.topics : [];
          schedule(topics);
        },
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        // Reconcile after tab wake / reconnect without full fan-out.
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [enabled, storeId, queryClient, router]);

  return null;
}
