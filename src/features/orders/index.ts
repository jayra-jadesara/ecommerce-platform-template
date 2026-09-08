/** Orders feature — customer history + admin fulfillment. */
export type {
  OrderDetail,
  OrderListItem,
  OrderListResult,
  OrderMutationResult,
} from "@/features/orders/types";

export {
  canTransitionOrderStatus,
  orderStatusLabel,
} from "@/features/orders/state-machine";

export { finalizePaidOrder } from "@/features/orders/finalize";
