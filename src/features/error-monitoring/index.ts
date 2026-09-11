export {
  CUSTOMER_SAFE_MESSAGE,
  CUSTOMER_SAFE_TITLE,
  PAYMENT_SAFE_MESSAGE,
  ERROR_TYPES,
  ERROR_SOURCES,
  ERROR_SEVERITIES,
  ERROR_STATUSES,
} from "@/features/error-monitoring/types";
export {
  generateErrorReferenceId,
  buildErrorFingerprint,
  normalizeMessageForFingerprint,
  isValidErrorReferenceId,
} from "@/features/error-monitoring/reference";
export {
  sanitizeString,
  sanitizeMetadata,
  redactSecrets,
  extractErrorMessage,
} from "@/features/error-monitoring/sanitize";
export { isBrowserTabError, isPaymentRelated, pageNameFromRoute } from "@/features/error-monitoring/classify";
export { ERROR_LOG_RETENTION_DAYS } from "@/features/error-monitoring/retention";
export {
  unexpectedFailure,
  runLoggedMutation,
  isDbError,
  type SafeFailure,
} from "@/features/error-monitoring/unexpected";
