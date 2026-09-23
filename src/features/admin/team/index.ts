/**
 * Team feature barrel — client-safe types/constants + server actions only.
 * Import UI from `components/…` and server helpers from `service` directly.
 */
export {
  ASSIGNABLE_ROLES,
  STAFF_ROLE_OPTIONS,
  type LinkableStoreAccount,
  type StaffActivityItem,
  type StaffActivityQuery,
  type TeamListQuery,
  type TeamListResult,
  type TeamMember,
  type TeamResult,
} from "@/features/admin/team/types";
export {
  listAdminTeamMembersAction,
  listLinkableStoreAccountsAction,
  addAdminByEmailAction,
  createAdminStaffAction,
  updateAdminRolesAction,
  setAdminActiveAction,
  removeAdminStaffAction,
  listStaffActivityAction,
} from "@/features/admin/team/actions";
export { ROLE_SUMMARY_BULLETS } from "@/features/admin/team/role-summaries";
export {
  ACTIVITY_AREA_TABS,
  ACTIVITY_RANGE_PRESETS,
} from "@/features/admin/team/activity-areas";
