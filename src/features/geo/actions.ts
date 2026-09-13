"use server";

import {
  findIndiaStateIdByName,
  listIndiaCitiesByStateId,
  listIndiaStates,
  type IndiaCity,
  type IndiaState,
} from "@/features/geo/service";

export async function getIndiaStatesAction(): Promise<IndiaState[]> {
  return listIndiaStates();
}

export async function getIndiaCitiesAction(
  stateId: string,
): Promise<IndiaCity[]> {
  return listIndiaCitiesByStateId(stateId);
}

export async function resolveIndiaStateIdAction(
  stateName: string,
): Promise<string | null> {
  return findIndiaStateIdByName(stateName);
}
