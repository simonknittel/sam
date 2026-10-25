import { AuditEventType } from "./AuditEventTypes.js";

/**
 * The app writes these types per page view, per opened notification or per
 * automation run. They would hide all other events. The system log and the
 * MCP tool show them only with an explicit type filter, with the volume
 * setting "all" or with `include_high_volume`.
 */
export const HIGH_VOLUME_AUDIT_EVENT_TYPES: ReadonlySet<AuditEventType> =
  new Set([
    AuditEventType.USER_LOGIN_V2,
    AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2,
    AuditEventType.WIKI_PAGE_VISITED,
    AuditEventType.WIKI_PAGE_UPDATED,
    AuditEventType.ON_SITE_NOTIFICATIONS_CREATED,
    AuditEventType.ON_SITE_NOTIFICATIONS_READ,
    AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ,
    AuditEventType.ON_SITE_NOTIFICATION_UNREAD,
    AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED,
    AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED,
    AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED,
    AuditEventType.CHANGELOG_ENTRIES_SEEN,
    AuditEventType.LOG_ANALYZER_ENTRIES_UPLOADED,
    AuditEventType.READ_MARKER_CREATED,
    AuditEventType.READ_MARKERS_CREATED,
  ]);
