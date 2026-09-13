import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type IndiaState = {
  id: string;
  name: string;
};

export type IndiaCity = {
  id: string;
  stateId: string;
  name: string;
};

export async function listIndiaStates(): Promise<IndiaState[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("india_states")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, name: row.name }));
}

export async function listIndiaCitiesByStateId(
  stateId: string,
): Promise<IndiaCity[]> {
  if (!stateId) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("india_cities")
    .select("id, state_id, name")
    .eq("state_id", stateId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    stateId: row.state_id,
    name: row.name,
  }));
}

export async function findIndiaStateIdByName(
  name: string,
): Promise<string | null> {
  const cleaned = name.trim();
  if (!cleaned) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("india_states")
    .select("id")
    .ilike("name", cleaned)
    .maybeSingle();
  return data?.id ?? null;
}
