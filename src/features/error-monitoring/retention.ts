/**
 * Phase 27 — Error log retention
 *
 * Default retention: 90 days.
 * OPEN and CRITICAL unresolved errors should be preserved beyond 90 days until resolved
 * (or manually cleaned by SUPER_ADMIN).
 *
 * Cleanup approach (recommended, not auto-enabled here):
 * - Scheduled Supabase SQL / cron job that deletes rows where:
 *     created_at < now() - interval '90 days'
 *     AND status IN ('RESOLVED', 'IGNORED')
 *     AND severity <> 'CRITICAL'
 * - Never delete OPEN/INVESTIGATING rows automatically.
 *
 * Do not add error_logs to public/PWA/storefront caches.
 */

export const ERROR_LOG_RETENTION_DAYS = 90;
