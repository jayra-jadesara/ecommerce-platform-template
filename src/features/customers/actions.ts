"use server";

import { getAdminPath } from "@/config/admin-route";
import { runLoggedMutation } from "@/features/error-monitoring/unexpected";

const CUSTOMERS_ROUTE = getAdminPath("/customers");

async function customersMutations() {
  return import("@/features/customers/admin-mutations");
}

export async function setCustomerPasswordAction(input: {
  userId: string;
  password?: string | null;
  generate?: boolean;
}) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "CUSTOMER_SET_PASSWORD",
      feature: "USERS",
      entityType: "auth.users",
      entityId: input.userId,
      route: CUSTOMERS_ROUTE,
    },
    async () => {
      const { setCustomerPassword } = await customersMutations();
      return setCustomerPassword(input);
    },
  );
}

export async function deleteStoreCustomerAction(userId: string) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "CUSTOMER_DELETE",
      feature: "USERS",
      entityType: "auth.users",
      entityId: userId,
      route: CUSTOMERS_ROUTE,
    },
    async () => {
      const { deleteStoreCustomer } = await customersMutations();
      return deleteStoreCustomer({ userId });
    },
  );
}

export async function updateCustomerSessionMaxHoursAction(
  hours: number | null | "never",
) {
  return runLoggedMutation(
    {
      type: "SERVER",
      source: "SERVER",
      operation: "CUSTOMER_SESSION_MAX_UPDATE",
      feature: "USERS",
      route: CUSTOMERS_ROUTE,
    },
    async () => {
      const { updateCustomerSessionMaxHours } = await customersMutations();
      return updateCustomerSessionMaxHours({ hours });
    },
  );
}
