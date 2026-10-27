import { AuditEventType } from "./AuditEventTypes.js";

const READ_AUDIT_EVENT_TYPE_LIST = [
  AuditEventType.CURRENT_USER_READ,
  AuditEventType.USER_READ,
  AuditEventType.USERS_LISTED,
  AuditEventType.CITIZEN_READ,
  AuditEventType.ORGANIZATION_READ,
  AuditEventType.CITIZEN_NOTES_LISTED,
  AuditEventType.CITIZENS_LISTED,
  AuditEventType.CITIZENS_AND_ORGANIZATIONS_SEARCHED,
  AuditEventType.ROLE_READ,
  AuditEventType.ROLES_LISTED,
  AuditEventType.PERMISSION_CATALOG_READ,
  AuditEventType.PENALTY_ENTRIES_LISTED,
  AuditEventType.OWN_SHIPS_LISTED,
  AuditEventType.ORGANIZATION_FLEET_LISTED,
  AuditEventType.SHIP_VARIANTS_SEARCHED,
  AuditEventType.WIKI_PAGE_READ,
  AuditEventType.WIKI_PAGES_LISTED,
  AuditEventType.WIKI_SEARCHED,
  AuditEventType.EVENT_READ,
  AuditEventType.EVENTS_LISTED,
  AuditEventType.EVENT_LINEUP_READ,
  AuditEventType.TASK_READ,
  AuditEventType.TASKS_LISTED,
  AuditEventType.MANUAL_NOTIFICATIONS_LISTED,
  AuditEventType.OWN_NOTIFICATIONS_LISTED,
  AuditEventType.CHANGELOG_ENTRIES_LISTED,
  AuditEventType.AUDIT_EVENTS_LISTED,
] as const;

export type ReadAuditEventType = (typeof READ_AUDIT_EVENT_TYPE_LIST)[number];

/**
 * The types of the read accesses. The MCP server writes one for each
 * successful call of a read tool. The system log and the MCP tool show them
 * only with an explicit type filter or with the access filter "read" or "all".
 * All other types are the writes.
 */
export const READ_AUDIT_EVENT_TYPES: ReadonlySet<AuditEventType> = new Set(
  READ_AUDIT_EVENT_TYPE_LIST,
);
