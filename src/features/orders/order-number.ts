import { randomBytes } from "node:crypto";
import {
  DEFAULT_ORDER_PREFIX,
  normalizeOrderNumberPrefix,
} from "@/features/orders/order-number-prefix";

export {
  DEFAULT_ORDER_PREFIX,
  normalizeOrderNumberPrefix,
  suggestOrderNumberPrefixFromStoreName,
  exampleOrderNumber,
} from "@/features/orders/order-number-prefix";

/** Build a unique-looking order number: `{PREFIX}-{TIME36}-{HEX}`. */
export function buildStoreOrderNumber(prefix?: string | null): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `${normalizeOrderNumberPrefix(prefix)}-${stamp}-${rand}`;
}
