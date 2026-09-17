"use client";

import { useEffect, useState } from "react";
import {
  getIndiaCitiesAction,
  getIndiaStatesAction,
  resolveIndiaStateIdAction,
} from "@/features/geo/actions";
import type { IndiaCity, IndiaState } from "@/features/geo/service";

/**
 * Cascading India state → city dropdowns (shared by Career admin + storefront).
 */
export function useIndiaStateCity(initial?: {
  stateName?: string;
  cityName?: string;
}) {
  const [states, setStates] = useState<IndiaState[]>([]);
  const [cities, setCities] = useState<IndiaCity[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const rows = await getIndiaStatesAction();
      if (cancelled) return;
      setStates(rows);

      const initialStateName = initial?.stateName?.trim() ?? "";
      if (initialStateName) {
        const match =
          rows.find(
            (s) => s.name.toLowerCase() === initialStateName.toLowerCase(),
          ) ?? null;
        const stateId =
          match?.id ?? (await resolveIndiaStateIdAction(initialStateName));
        if (stateId && !cancelled) {
          setSelectedStateId(stateId);
          setCitiesLoading(true);
          const cityRows = await getIndiaCitiesAction(stateId);
          if (!cancelled) {
            setCities(cityRows);
            setCitiesLoading(false);
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Only seed once from initial names
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onStateNameChange(stateName: string): Promise<IndiaCity[]> {
    const match = states.find((s) => s.name === stateName);
    const stateId = match?.id ?? "";
    setSelectedStateId(stateId);
    setCities([]);
    if (!stateId) return [];
    setCitiesLoading(true);
    const cityRows = await getIndiaCitiesAction(stateId);
    setCities(cityRows);
    setCitiesLoading(false);
    return cityRows;
  }

  return {
    states,
    cities,
    selectedStateId,
    loading,
    citiesLoading,
    onStateNameChange,
  };
}
