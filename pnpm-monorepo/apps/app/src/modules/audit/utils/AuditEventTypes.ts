export enum AuditEventType {
  USER_LOGIN = "USER_LOGIN",
  USER_LOGIN_V2 = "USER_LOGIN_V2",
  USER_LOGOUT = "USER_LOGOUT",
  USER_FIRST_VISIT_OF_THE_DAY = "USER_FIRST_VISIT_OF_THE_DAY",
  USER_FIRST_VISIT_OF_THE_DAY_V2 = "USER_FIRST_VISIT_OF_THE_DAY_V2",
  SHIP_CREATED = "SHIP_CREATED",
  SHIP_UPDATED = "SHIP_UPDATED",
  SHIP_DELETED = "SHIP_DELETED",
  VARIANT_CREATED = "VARIANT_CREATED",
  VARIANT_CREATED_V2 = "VARIANT_CREATED_V2",
  VARIANT_UPDATED = "VARIANT_UPDATED",
  VARIANT_UPDATED_V2 = "VARIANT_UPDATED_V2",
  VARIANT_DELETED = "VARIANT_DELETED",
  SERIES_UPDATED = "SERIES_UPDATED",
  SERIES_DELETED = "SERIES_DELETED",
  MANUFACTURER_UPDATED = "MANUFACTURER_UPDATED",
  MANUFACTURER_DELETED = "MANUFACTURER_DELETED",
  WEB_PUSH_SUBSCRIBED = "WEB_PUSH_SUBSCRIBED",
  ROLE_CREATED = "ROLE_CREATED",
  ROLE_UPDATED = "ROLE_UPDATED",
  ROLE_UPDATED_V2 = "ROLE_UPDATED_V2",
  ROLE_UPDATED_V3 = "ROLE_UPDATED_V3",
  ROLE_DELETED = "ROLE_DELETED",
  ROLE_PERMISSIONS_UPDATED = "ROLE_PERMISSIONS_UPDATED",
  ROLE_PERMISSION_TOGGLED = "ROLE_PERMISSION_TOGGLED",
  ROLE_INHERITANCE_UPDATED = "ROLE_INHERITANCE_UPDATED",
  ROLE_ASSIGNMENTS_UPDATED = "ROLE_ASSIGNMENTS_UPDATED",
  ROLE_ASSIGNMENT_DELETED = "ROLE_ASSIGNMENT_DELETED",
  ROLE_ASSIGNMENT_LEVEL_INCREASED = "ROLE_ASSIGNMENT_LEVEL_INCREASED",
  ROLE_ASSIGNMENT_LEVEL_DECREASED = "ROLE_ASSIGNMENT_LEVEL_DECREASED",
  ROLE_AUTO_ASSIGNED = "ROLE_AUTO_ASSIGNED",
  ROLE_AUTO_REMOVED = "ROLE_AUTO_REMOVED",
  SILC_TRANSACTION_CREATED = "SILC_TRANSACTION_CREATED",
  SILC_TRANSACTION_UPDATED = "SILC_TRANSACTION_UPDATED",
  SILC_TRANSACTION_DELETED = "SILC_TRANSACTION_DELETED",
  SALARY_CONFIG_UPDATED = "SALARY_CONFIG_UPDATED",
  PENALTY_ENTRY_CREATED = "PENALTY_ENTRY_CREATED",
  PENALTY_ENTRY_DELETED = "PENALTY_ENTRY_DELETED",
  PROFIT_CYCLE_CREATED = "PROFIT_CYCLE_CREATED",
  PROFIT_CYCLE_COLLECTION_ENDED = "PROFIT_CYCLE_COLLECTION_ENDED",
  PROFIT_CYCLE_PAYOUT_STARTED = "PROFIT_CYCLE_PAYOUT_STARTED",
  PROFIT_CYCLE_PAYOUT_ENDED = "PROFIT_CYCLE_PAYOUT_ENDED",
  PROFIT_CYCLE_PARTICIPANT_UPDATED = "PROFIT_CYCLE_PARTICIPANT_UPDATED",
  PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED = "PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED",
  PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED = "PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED",
  TASK_CREATED = "TASK_CREATED",
  TASK_COMPLETED = "TASK_COMPLETED",
  TASK_DELETED = "TASK_DELETED",
  TASK_CANCELLED = "TASK_CANCELLED",
  TASK_ASSIGNMENTS_UPDATED = "TASK_ASSIGNMENTS_UPDATED",
  TASK_TITLE_UPDATED = "TASK_TITLE_UPDATED",
  TASK_DESCRIPTION_UPDATED = "TASK_DESCRIPTION_UPDATED",
  TASK_EXPIRES_AT_UPDATED = "TASK_EXPIRES_AT_UPDATED",
  TASK_REPEATABLE_UPDATED = "TASK_REPEATABLE_UPDATED",
  TASK_REQUIRED_ROLES_UPDATED = "TASK_REQUIRED_ROLES_UPDATED",
  TASK_REWARD_TEXT_UPDATED = "TASK_REWARD_TEXT_UPDATED",
  TASK_REWARD_SILC_UPDATED = "TASK_REWARD_SILC_UPDATED",
  TASK_REWARD_NEW_SILC_UPDATED = "TASK_REWARD_NEW_SILC_UPDATED",
  TASK_SELF_ASSIGNMENT_CREATED = "TASK_SELF_ASSIGNMENT_CREATED",
  TASK_SELF_ASSIGNMENT_DELETED = "TASK_SELF_ASSIGNMENT_DELETED",
  EVENT_POSITION_CREATED = "EVENT_POSITION_CREATED",
  EVENT_POSITION_UPDATED = "EVENT_POSITION_UPDATED",
  EVENT_POSITION_UPDATED_V2 = "EVENT_POSITION_UPDATED_V2",
  EVENT_POSITION_DELETED = "EVENT_POSITION_DELETED",
  EVENT_MANAGERS_ASSIGNED = "EVENT_MANAGERS_ASSIGNED",
  EVENT_MANAGER_REMOVED = "EVENT_MANAGER_REMOVED",
  EVENT_LINEUP_STATUS_CHANGED = "EVENT_LINEUP_STATUS_CHANGED",
  EVENT_LINEUP_ORDER_CHANGED = "EVENT_LINEUP_ORDER_CHANGED",
  EVENT_POSITION_CITIZEN_ASSIGNED = "EVENT_POSITION_CITIZEN_ASSIGNED",
  EVENT_POSITION_CITIZEN_REMOVED = "EVENT_POSITION_CITIZEN_REMOVED",
  EVENT_POSITION_NAME_UPDATED = "EVENT_POSITION_NAME_UPDATED",
  EVENT_POSITION_APPLICATION_CREATED = "EVENT_POSITION_APPLICATION_CREATED",
  EVENT_POSITION_APPLICATION_DELETED = "EVENT_POSITION_APPLICATION_DELETED",
  EVENT_LINEUP_COPIED = "EVENT_LINEUP_COPIED",
  EVENT_POSITION_COPIED = "EVENT_POSITION_COPIED",
  CITIZEN_CREATED = "CITIZEN_CREATED",
  CITIZEN_DELETED = "CITIZEN_DELETED",
  ENTITY_LOG_CREATED = "ENTITY_LOG_CREATED",
  ENTITY_LOG_UPDATED = "ENTITY_LOG_UPDATED",
  ENTITY_LOG_DELETED = "ENTITY_LOG_DELETED",
  ORGANIZATION_CREATED = "ORGANIZATION_CREATED",
  ORGANIZATION_MEMBERSHIP_CREATED = "ORGANIZATION_MEMBERSHIP_CREATED",
  ORGANIZATION_MEMBERSHIP_REMOVED = "ORGANIZATION_MEMBERSHIP_REMOVED",
  ORGANIZATION_MEMBERSHIP_CONFIRMED = "ORGANIZATION_MEMBERSHIP_CONFIRMED",
  CLASSIFICATION_LEVEL_CREATED = "CLASSIFICATION_LEVEL_CREATED",
  CLASSIFICATION_LEVEL_UPDATED = "CLASSIFICATION_LEVEL_UPDATED",
  CLASSIFICATION_LEVEL_DELETED = "CLASSIFICATION_LEVEL_DELETED",
  NOTE_TYPE_CREATED = "NOTE_TYPE_CREATED",
  NOTE_TYPE_UPDATED = "NOTE_TYPE_UPDATED",
  NOTE_TYPE_DELETED = "NOTE_TYPE_DELETED",
  UPLOAD_CREATED = "UPLOAD_CREATED",
  RESOURCE_IMAGE_ASSIGNED = "RESOURCE_IMAGE_ASSIGNED",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  EMAIL_CONFIRMATION_REQUESTED = "EMAIL_CONFIRMATION_REQUESTED",
  EMAIL_VERIFIED_VIA_TOKEN = "EMAIL_VERIFIED_VIA_TOKEN",
  USER_BANNED = "USER_BANNED",
  USER_UNBANNED = "USER_UNBANNED",
  USER_LOGIN_BLOCKED = "USER_LOGIN_BLOCKED",
  WIKI_PAGE_CREATED = "WIKI_PAGE_CREATED",
  WIKI_PAGE_UPDATED = "WIKI_PAGE_UPDATED",
  WIKI_PAGE_RENAMED = "WIKI_PAGE_RENAMED",
  WIKI_PAGE_MOVED = "WIKI_PAGE_MOVED",
  WIKI_PAGE_DUPLICATED = "WIKI_PAGE_DUPLICATED",
  WIKI_PAGE_COPIED = "WIKI_PAGE_COPIED",
  WIKI_PAGE_PERMISSIONS_UPDATED = "WIKI_PAGE_PERMISSIONS_UPDATED",
  WIKI_PAGE_EVENT_SCOPES_UPDATED = "WIKI_PAGE_EVENT_SCOPES_UPDATED",
  WIKI_PAGE_ROLE_ACCESS_PRUNED = "WIKI_PAGE_ROLE_ACCESS_PRUNED",
  WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE = "WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE",
  WIKI_PAGE_OWNERSHIP_TRANSFERRED = "WIKI_PAGE_OWNERSHIP_TRANSFERRED",
  WIKI_PAGE_DELETED = "WIKI_PAGE_DELETED",
  WIKI_PAGE_RESTORED = "WIKI_PAGE_RESTORED",
  WIKI_PAGE_DESTROYED = "WIKI_PAGE_DESTROYED",
  WIKI_SETTINGS_UPDATED = "WIKI_SETTINGS_UPDATED",
  WIKI_PAGE_REPORTED = "WIKI_PAGE_REPORTED",
  WIKI_PAGE_REPORT_RESOLVED = "WIKI_PAGE_REPORT_RESOLVED",
  WIKI_PAGE_SNAPSHOT_RESTORED = "WIKI_PAGE_SNAPSHOT_RESTORED",
  WIKI_PAGE_CONTENT_IMPORTED = "WIKI_PAGE_CONTENT_IMPORTED",
  WIKI_PAGE_SIDEBAR_MODE_UPDATED = "WIKI_PAGE_SIDEBAR_MODE_UPDATED",
  WIKI_PAGE_TAGS_UPDATED = "WIKI_PAGE_TAGS_UPDATED",
  WIKI_PAGE_ICON_UPDATED = "WIKI_PAGE_ICON_UPDATED",
  WIKI_PAGE_FAVORITE_ADDED = "WIKI_PAGE_FAVORITE_ADDED",
  WIKI_PAGE_FAVORITE_REMOVED = "WIKI_PAGE_FAVORITE_REMOVED",
  WIKI_PAGE_VISITED = "WIKI_PAGE_VISITED",
  WIKI_CITIZEN_MENTIONS_SWEPT = "WIKI_CITIZEN_MENTIONS_SWEPT",
  TRASHED_WIKI_PAGES_PURGED = "TRASHED_WIKI_PAGES_PURGED",
  ORPHANED_WIKI_TAGS_PURGED = "ORPHANED_WIKI_TAGS_PURGED",
  MANUFACTURER_CREATED = "MANUFACTURER_CREATED",
  SERIES_CREATED = "SERIES_CREATED",
  ENTITY_LOG_CONFIRMED = "ENTITY_LOG_CONFIRMED",
  CAREER_FLOW_UPDATED = "CAREER_FLOW_UPDATED",
  SILC_SETTING_UPDATED = "SILC_SETTING_UPDATED",
  SILC_ALL_EXPIRED = "SILC_ALL_EXPIRED",
  SILC_BALANCES_REFRESHED = "SILC_BALANCES_REFRESHED",
  ROLE_SALARIES_DISBURSED = "ROLE_SALARIES_DISBURSED",
  NOTIFICATION_SETTINGS_UPDATED = "NOTIFICATION_SETTINGS_UPDATED",
  ON_SITE_NOTIFICATIONS_CREATED = "ON_SITE_NOTIFICATIONS_CREATED",
  ON_SITE_NOTIFICATIONS_READ = "ON_SITE_NOTIFICATIONS_READ",
  ON_SITE_NOTIFICATIONS_ALL_READ = "ON_SITE_NOTIFICATIONS_ALL_READ",
  ON_SITE_NOTIFICATION_UNREAD = "ON_SITE_NOTIFICATION_UNREAD",
  ON_SITE_NOTIFICATION_ARCHIVED = "ON_SITE_NOTIFICATION_ARCHIVED",
  ON_SITE_NOTIFICATIONS_READ_ARCHIVED = "ON_SITE_NOTIFICATIONS_READ_ARCHIVED",
  ON_SITE_NOTIFICATION_UNARCHIVED = "ON_SITE_NOTIFICATION_UNARCHIVED",
  WEB_PUSH_SUBSCRIPTIONS_PRUNED = "WEB_PUSH_SUBSCRIPTIONS_PRUNED",
  CHANGELOG_ENTRIES_SEEN = "CHANGELOG_ENTRIES_SEEN",
  UNUSED_UPLOADS_DELETED = "UNUSED_UPLOADS_DELETED",
  EVENT_IMPORTED_FROM_DISCORD = "EVENT_IMPORTED_FROM_DISCORD",
  EVENT_UPDATED_FROM_DISCORD = "EVENT_UPDATED_FROM_DISCORD",
  EVENT_DELETED_FROM_DISCORD = "EVENT_DELETED_FROM_DISCORD",
  EVENT_PARTICIPANTS_SYNCED = "EVENT_PARTICIPANTS_SYNCED",
  CITIZENS_PER_ROLE_COUNTED = "CITIZENS_PER_ROLE_COUNTED",
  SHIPS_PER_VARIANT_COUNTED = "SHIPS_PER_VARIANT_COUNTED",
  UNIQUE_LOGINS_COUNTED = "UNIQUE_LOGINS_COUNTED",
}

/**
 * Types whose events are written often enough to drown out everything else
 * in the system log — per page view, per opened notification popover, per
 * automation run. The system log hides them unless they are explicitly
 * selected in its type filter.
 */
export const HIGH_VOLUME_AUDIT_EVENT_TYPES: ReadonlySet<AuditEventType> =
  new Set([
    AuditEventType.WIKI_PAGE_VISITED,
    AuditEventType.ON_SITE_NOTIFICATIONS_CREATED,
    AuditEventType.ON_SITE_NOTIFICATIONS_READ,
    AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ,
    AuditEventType.ON_SITE_NOTIFICATION_UNREAD,
    AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED,
    AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED,
    AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED,
    AuditEventType.CHANGELOG_ENTRIES_SEEN,
  ]);

/**
 * Wiki page audit payloads carry the owning event's id so event wiki rows
 * stay attributable after the event (and its pages) are cascade-deleted.
 * Absent for global wiki pages and on events from before the event wikis.
 */
interface WikiPageAuditScope {
  eventId?: string;
}

export interface AuditEventDataByType {
  [AuditEventType.USER_LOGIN]: {
    userId: string;
  };

  [AuditEventType.USER_LOGIN_V2]: {
    userId: string;
    userEmail?: string | null;
    userName?: string | null;
  };

  [AuditEventType.USER_LOGOUT]: {
    sessionId: string;
    userId: string;
  };

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY]: {
    userId: string;
  };

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2]: {
    userId: string;
    userEmail?: string | null;
    userName?: string | null;
  };

  [AuditEventType.SHIP_CREATED]: {
    shipId: string;
    ownerId: string;
    variantId: string;
  };

  [AuditEventType.SHIP_UPDATED]: {
    shipId: string;
    ownerId: string;
    previousName: string | null;
    newName: string | null;
  };

  [AuditEventType.SHIP_DELETED]: {
    shipId: string;
    ownerId: string;
    name: string | null;
    variantId: string;
  };

  [AuditEventType.VARIANT_CREATED]: {
    variantId: string;
    seriesId: string;
    name: string;
    status: string | null;
  };

  [AuditEventType.VARIANT_CREATED_V2]: {
    variantId: string;
    seriesId: string;
    name: string;
    status: string | null;
    links: { serviceName: string; url: string }[];
  };

  [AuditEventType.VARIANT_UPDATED]: {
    variantId: string;
    seriesId: string;
    previousName: string;
    newName: string;
    previousStatus: string | null;
    newStatus: string | null;
  };

  [AuditEventType.VARIANT_UPDATED_V2]: {
    variantId: string;
    seriesId: string;
    previousName: string;
    newName: string;
    previousStatus: string | null;
    newStatus: string | null;
    previousLinks: { serviceName: string; url: string }[];
    newLinks: { serviceName: string; url: string }[];
  };

  [AuditEventType.VARIANT_DELETED]: {
    variantId: string;
    seriesId: string;
    name: string;
  };

  [AuditEventType.SERIES_UPDATED]: {
    seriesId: string;
    manufacturerId: string;
    previousName: string;
    newName: string;
  };

  [AuditEventType.SERIES_DELETED]: {
    seriesId: string;
    manufacturerId: string;
    name: string;
  };

  [AuditEventType.MANUFACTURER_UPDATED]: {
    manufacturerId: string;
    previousName: string;
    newName: string;
    previousImageId: string | null;
    newImageId: string | null;
  };

  [AuditEventType.MANUFACTURER_DELETED]: {
    manufacturerId: string;
    name: string;
  };

  [AuditEventType.WEB_PUSH_SUBSCRIBED]: {
    subscriptionId: string;
    citizenId: string;
  };

  [AuditEventType.ROLE_CREATED]: {
    roleId: string;
    name: string;
  };

  [AuditEventType.ROLE_UPDATED]: {
    roleId: string;
    previousName: string;
    newName: string;
    previousMaxAgeDays: number | null;
    newMaxAgeDays: number | null;
  };

  [AuditEventType.ROLE_UPDATED_V2]: {
    roleId: string;
    previousName: string;
    newName: string;
    previousMaxAgeDays: number | null;
    newMaxAgeDays: number | null;
    previousAssignAfterInactiveDays: number | null;
    newAssignAfterInactiveDays: number | null;
  };

  [AuditEventType.ROLE_UPDATED_V3]: {
    roleId: string;
    previousName: string;
    newName: string;
    previousMaxAgeDays: number | null;
    newMaxAgeDays: number | null;
    previousAssignAfterInactiveDays: number | null;
    newAssignAfterInactiveDays: number | null;
    previousDescription: string | null;
    newDescription: string | null;
  };

  [AuditEventType.ROLE_DELETED]: {
    roleId: string;
    name: string;
  };

  [AuditEventType.ROLE_PERMISSIONS_UPDATED]: {
    roleId: string;
  };

  [AuditEventType.ROLE_PERMISSION_TOGGLED]: {
    roleId: string;
    permissionString: string;
    enabled: boolean;
  };

  [AuditEventType.ROLE_INHERITANCE_UPDATED]: {
    roleId: string;
  };

  [AuditEventType.ROLE_ASSIGNMENTS_UPDATED]: {
    citizenId: string;
    changes: {
      roleId: string;
      enabled: boolean;
    }[];
  };

  [AuditEventType.ROLE_ASSIGNMENT_DELETED]: {
    citizenId: string;
    roleId: string;
  };

  [AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED]: {
    citizenId: string;
    roleId: string;
  };

  [AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED]: {
    citizenId: string;
    roleId: string;
  };

  [AuditEventType.ROLE_AUTO_ASSIGNED]: {
    citizenId: string;
    citizenHandle: string | null;
    roleId: string;
    roleName: string;
  };

  [AuditEventType.ROLE_AUTO_REMOVED]: {
    citizenId: string;
    citizenHandle: string | null;
    roleId: string;
    roleName: string;
  };

  [AuditEventType.SILC_TRANSACTION_CREATED]: {
    transactionIds: string[];
    receiverIds: string[];
    value: number;
    description?: string;
  };

  [AuditEventType.SILC_TRANSACTION_UPDATED]: {
    transactionId: string;
    previousValue: number;
    newValue: number;
    previousDescription: string | null;
    newDescription: string | null;
    receiverId: string;
  };

  [AuditEventType.SILC_TRANSACTION_DELETED]: {
    transactionId: string;
    receiverId: string;
    value: number;
    description: string | null;
  };

  [AuditEventType.SALARY_CONFIG_UPDATED]: {
    roleIds: string[];
  };

  [AuditEventType.PENALTY_ENTRY_CREATED]: {
    penaltyEntryId: string;
    citizenId: string;
    points: number;
    reason: string | null;
    expiresAt: Date | null;
  };

  [AuditEventType.PENALTY_ENTRY_DELETED]: {
    penaltyEntryId: string;
    citizenId: string;
    points: number;
    reason: string | null;
  };

  [AuditEventType.PROFIT_CYCLE_CREATED]: {
    cycleId: string;
    title: string;
    collectionEndedAt: Date;
  };

  [AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED]: {
    cycleId: string;
  };

  [AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED]: {
    cycleId: string;
  };

  [AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED]: {
    cycleId: string;
  };

  [AuditEventType.PROFIT_CYCLE_PARTICIPANT_UPDATED]: {
    cycleId: string;
    changes: {
      citizenId: string;
      attribute: string;
      enabled: boolean;
    }[];
  };

  [AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED]: {
    cycleId: string;
    citizenId: string;
    value: boolean;
  };

  [AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED]: {
    cycleId: string;
    citizenId: string;
    value: boolean;
  };

  [AuditEventType.TASK_CREATED]: {
    taskIds: string[];
    visibility: string;
    rewardType: string;
  };

  [AuditEventType.TASK_COMPLETED]: {
    taskId: string;
    completionistIds: string[];
    rewardType: string;
  };

  [AuditEventType.TASK_DELETED]: {
    taskId: string;
    title: string;
  };

  [AuditEventType.TASK_CANCELLED]: {
    taskId: string;
    title: string;
  };

  [AuditEventType.TASK_ASSIGNMENTS_UPDATED]: {
    taskId: string;
  };

  [AuditEventType.TASK_TITLE_UPDATED]: {
    taskId: string;
    previousTitle: string;
    newTitle: string;
  };

  [AuditEventType.TASK_DESCRIPTION_UPDATED]: {
    taskId: string;
    previousDescription: string | null;
    newDescription: string;
  };

  [AuditEventType.TASK_EXPIRES_AT_UPDATED]: {
    taskId: string;
    previousExpiresAt: Date | null;
    newExpiresAt: Date | null;
  };

  [AuditEventType.TASK_REPEATABLE_UPDATED]: {
    taskId: string;
    previousRepeatable: number;
    newRepeatable: number;
  };

  [AuditEventType.TASK_REQUIRED_ROLES_UPDATED]: {
    taskId: string;
  };

  [AuditEventType.TASK_REWARD_TEXT_UPDATED]: {
    taskId: string;
    previousValue: string | null;
    newValue: string;
  };

  [AuditEventType.TASK_REWARD_SILC_UPDATED]: {
    taskId: string;
    previousValue: number | null;
    newValue: number;
  };

  [AuditEventType.TASK_REWARD_NEW_SILC_UPDATED]: {
    taskId: string;
    previousValue: number | null;
    newValue: number;
  };

  [AuditEventType.TASK_SELF_ASSIGNMENT_CREATED]: {
    taskId: string;
    citizenId: string;
  };

  [AuditEventType.TASK_SELF_ASSIGNMENT_DELETED]: {
    taskId: string;
    citizenId: string;
  };

  [AuditEventType.EVENT_POSITION_CREATED]: {
    eventId: string;
    positionId: string;
    name: string;
    variantIds: string[];
    parentPositionId?: string;
  };

  [AuditEventType.EVENT_POSITION_UPDATED]: {
    eventId: string;
    positionId: string;
    previousName: string;
    newName: string;
  };

  [AuditEventType.EVENT_POSITION_UPDATED_V2]: {
    eventId: string;
    positionId: string;
    previousName: string;
    newName: string;
    previousFontSize: string | null;
    newFontSize: string | null;
    previousBackgroundColor: string | null;
    newBackgroundColor: string | null;
    previousTextColor: string | null;
    newTextColor: string | null;
  };

  [AuditEventType.EVENT_POSITION_DELETED]: {
    eventId: string;
    positionId: string;
    name: string;
  };

  [AuditEventType.EVENT_MANAGERS_ASSIGNED]: {
    eventId: string;
    managerIds: string[];
  };

  [AuditEventType.EVENT_MANAGER_REMOVED]: {
    eventId: string;
    managerId: string;
  };

  [AuditEventType.EVENT_LINEUP_STATUS_CHANGED]: {
    eventId: string;
    enabled: boolean;
  };

  [AuditEventType.EVENT_LINEUP_ORDER_CHANGED]: {
    eventId: string;
  };

  [AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED]: {
    eventId: string;
    positionId: string;
    citizenId: string;
  };

  [AuditEventType.EVENT_POSITION_CITIZEN_REMOVED]: {
    eventId: string;
    positionId: string;
    previousCitizenId: string;
  };

  [AuditEventType.EVENT_POSITION_NAME_UPDATED]: {
    eventId: string;
    positionId: string;
    previousName: string;
    newName: string;
  };

  [AuditEventType.EVENT_POSITION_APPLICATION_CREATED]: {
    eventId: string;
    positionId: string;
    citizenId: string;
    applicationId: string;
  };

  [AuditEventType.EVENT_POSITION_APPLICATION_DELETED]: {
    eventId: string;
    positionId: string;
    citizenId: string;
    applicationId: string;
  };

  [AuditEventType.EVENT_LINEUP_COPIED]: {
    sourceEventId: string;
    targetEventId: string;
  };

  [AuditEventType.EVENT_POSITION_COPIED]: {
    sourceEventId: string;
    sourcePositionId: string;
    targetEventId: string;
    targetPositionId: string;
    placement: "after" | "inside";
    positionCount: number;
  };

  [AuditEventType.CITIZEN_CREATED]: {
    citizenId: string;
    spectrumId: string;
  };

  [AuditEventType.CITIZEN_DELETED]: {
    citizenId: string;
    spectrumId: string;
  };

  [AuditEventType.ENTITY_LOG_CREATED]: {
    entityId: string;
    logId: string;
    logType: string;
  };

  [AuditEventType.ENTITY_LOG_UPDATED]: {
    entityId: string;
    logId: string;
    logType: string;
  };

  [AuditEventType.ENTITY_LOG_DELETED]: {
    entityId: string;
    logId: string;
    logType: string;
  };

  [AuditEventType.ORGANIZATION_CREATED]: {
    organizationId: string;
    spectrumId: string;
    name: string;
  };

  [AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED]: {
    organizationId: string;
    citizenId: string;
    type: string;
  };

  [AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED]: {
    organizationId: string;
    citizenId: string;
  };

  [AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED]: {
    historyEntryId: string;
    citizenId: string;
    confirmed: string;
  };

  [AuditEventType.CLASSIFICATION_LEVEL_CREATED]: {
    classificationLevelId: string;
    name: string;
  };

  [AuditEventType.CLASSIFICATION_LEVEL_UPDATED]: {
    classificationLevelId: string;
    previousName: string;
    newName: string;
  };

  [AuditEventType.CLASSIFICATION_LEVEL_DELETED]: {
    classificationLevelId: string;
    name: string;
  };

  [AuditEventType.NOTE_TYPE_CREATED]: {
    noteTypeId: string;
    name: string;
  };

  [AuditEventType.NOTE_TYPE_UPDATED]: {
    noteTypeId: string;
    previousName: string;
    newName: string;
  };

  [AuditEventType.NOTE_TYPE_DELETED]: {
    noteTypeId: string;
    name: string;
  };

  [AuditEventType.UPLOAD_CREATED]: {
    uploadId: string;
    fileName: string;
    mimeType: string;
  };

  [AuditEventType.RESOURCE_IMAGE_ASSIGNED]: {
    resourceType: string;
    resourceId: string;
    resourceAttribute: string;
    imageId: string;
  };

  [AuditEventType.EMAIL_VERIFIED]: {
    userId: string;
  };

  [AuditEventType.EMAIL_CONFIRMATION_REQUESTED]: {
    userId: string;
    email: string;
  };

  [AuditEventType.EMAIL_VERIFIED_VIA_TOKEN]: {
    userId: string;
  };

  [AuditEventType.USER_BANNED]: {
    userId: string;
    reason?: string;
  };

  [AuditEventType.USER_UNBANNED]: {
    userId: string;
  };

  [AuditEventType.USER_LOGIN_BLOCKED]: {
    userId: string;
  };

  [AuditEventType.WIKI_PAGE_CREATED]: WikiPageAuditScope & {
    pageId: string;
    title: string;
    parentId: string | null;
  };

  [AuditEventType.WIKI_PAGE_UPDATED]: {
    pageId: string;
  };

  [AuditEventType.WIKI_PAGE_RENAMED]: WikiPageAuditScope & {
    pageId: string;
    previousTitle: string;
    newTitle: string;
  };

  [AuditEventType.WIKI_PAGE_MOVED]: WikiPageAuditScope & {
    pageId: string;
    previousParentId: string | null;
    newParentId: string | null;
  };

  [AuditEventType.WIKI_PAGE_DUPLICATED]: WikiPageAuditScope & {
    /** The newly created page */
    pageId: string;
    sourcePageId: string;
    title: string;
    parentId: string | null;
    /** All created pages, the copied root first */
    duplicatedPageIds: string[];
    mirroredChildren: boolean;
    /** Only on events from before permission mirroring was removed */
    mirroredPermissions?: boolean;
  };

  /**
   * One event per page created by copy'n'paste or the create form's
   * "copy from" — the successor of WIKI_PAGE_DUPLICATED, which only
   * occurs on historical events.
   */
  [AuditEventType.WIKI_PAGE_COPIED]: WikiPageAuditScope & {
    /** The newly created page — or the replaced one, see below */
    pageId: string;
    sourcePageId: string;
    title: string;
    parentId: string | null;
    /** Root of the copied subtree; equals pageId for the root itself */
    rootPageId: string;
    /**
     * True on the root event of a replace-mode paste: pageId is then an
     * existing page that took over the copied root's content and
     * attributes instead of a newly created one.
     */
    replacedExistingPage?: boolean;
  };

  [AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED]: {
    pageId: string;
    visibility: string;
    editability: string;
    imageUploadability: string;
    attachmentUploadability: string;
    readRoleIds: string[];
    editRoleIds: string[];
    adminRoleIds: string[];
    /** True for events written by an "apply to all child pages" cascade */
    cascaded: boolean;
  };

  /** The event-mode counterpart of WIKI_PAGE_PERMISSIONS_UPDATED */
  [AuditEventType.WIKI_PAGE_EVENT_SCOPES_UPDATED]: {
    pageId: string;
    eventId: string;
    readScope: string;
    readScopePositionId: string | null;
    editScope: string;
    editScopePositionId: string | null;
    /**
     * Absent only on dev rows written mid-branch, before the feedback round
     * added the uploadability tiers to event pages
     */
    imageUploadability?: string;
    attachmentUploadability?: string;
  };

  /**
   * Role access of a descendant page that stopped granting anything because
   * the role can no longer read the page above it — a page never hands out
   * more than its parent, so those entries are dropped instead of being kept
   * as dead data.
   */
  [AuditEventType.WIKI_PAGE_ROLE_ACCESS_PRUNED]: {
    pageId: string;
    removedRoleIds: string[];
    /** DUPLICATED only occurs on events from before mirroring was removed */
    trigger: "PERMISSIONS_UPDATED" | "DUPLICATED";
  };

  /**
   * A moved page and its subtree take the permissions of their new place, so
   * every page in it loses its own settings and role lists.
   */
  [AuditEventType.WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE]: WikiPageAuditScope & {
    pageId: string;
    /** The page that was moved; equals pageId for the moved page itself */
    movedPageId: string;
    newParentId: string | null;
  };

  [AuditEventType.WIKI_PAGE_OWNERSHIP_TRANSFERRED]: {
    pageId: string;
    previousOwnerId: string | null;
    newOwnerId: string | null;
    /** True for events written by an "apply to all child pages" cascade */
    cascaded: boolean;
  };

  [AuditEventType.WIKI_PAGE_DELETED]: WikiPageAuditScope & {
    pageId: string;
    title: string;
    subtreePageIds: string[];
  };

  [AuditEventType.WIKI_PAGE_RESTORED]: WikiPageAuditScope & {
    pageId: string;
    title: string;
    restoredPageIds: string[];
  };

  [AuditEventType.WIKI_PAGE_DESTROYED]: WikiPageAuditScope & {
    pageId: string;
    title: string;
    destroyedPageIds: string[];
  };

  [AuditEventType.WIKI_SETTINGS_UPDATED]: {
    /** WikiSetting key, e.g. "iframeAllowlist" or "pageLink:support" */
    setting: string;
    /** The new value as stored in WikiSetting.value */
    value: string | string[] | null;
  };

  [AuditEventType.WIKI_PAGE_REPORTED]: WikiPageAuditScope & {
    reportId: string;
    pageId: string;
    /** Set when the report targets a file attachment on the page */
    uploadId?: string;
  };

  [AuditEventType.WIKI_PAGE_REPORT_RESOLVED]: {
    reportId: string;
    pageId: string;
  };

  [AuditEventType.WIKI_PAGE_SNAPSHOT_RESTORED]: WikiPageAuditScope & {
    pageId: string;
    snapshotId: string;
  };

  [AuditEventType.WIKI_PAGE_CONTENT_IMPORTED]: WikiPageAuditScope & {
    pageId: string;
  };

  [AuditEventType.WIKI_PAGE_SIDEBAR_MODE_UPDATED]: WikiPageAuditScope & {
    pageId: string;
    previousSidebarMode: string;
    newSidebarMode: string;
  };

  [AuditEventType.WIKI_PAGE_TAGS_UPDATED]: WikiPageAuditScope & {
    pageId: string;
    addedTagNames: string[];
    removedTagNames: string[];
  };

  [AuditEventType.WIKI_PAGE_ICON_UPDATED]: WikiPageAuditScope & {
    pageId: string;
    /** The assigned upload, or null when the icon was removed */
    iconId: string | null;
  };

  [AuditEventType.WIKI_PAGE_FAVORITE_ADDED]: WikiPageAuditScope & {
    pageId: string;
    citizenId: string;
  };

  [AuditEventType.WIKI_PAGE_FAVORITE_REMOVED]: WikiPageAuditScope & {
    pageId: string;
    citizenId: string;
  };

  [AuditEventType.WIKI_PAGE_VISITED]: {
    pageId: string;
    citizenId: string;
  };

  [AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT]: {
    notifiedCount: number;
    suppressedCount: number;
  };

  [AuditEventType.TRASHED_WIKI_PAGES_PURGED]: {
    count: number;
  };

  [AuditEventType.ORPHANED_WIKI_TAGS_PURGED]: {
    count: number;
  };

  [AuditEventType.MANUFACTURER_CREATED]: {
    manufacturerId: string;
    name: string;
  };

  [AuditEventType.SERIES_CREATED]: {
    seriesId: string;
    name: string;
    manufacturerId: string;
  };

  [AuditEventType.ENTITY_LOG_CONFIRMED]: {
    entityId: string;
    logId: string;
    logType: string;
    confirmed: "confirmed" | "false-report";
  };

  [AuditEventType.CAREER_FLOW_UPDATED]: {
    flowId: string;
    nodeCount: number;
    edgeCount: number;
  };

  [AuditEventType.SILC_SETTING_UPDATED]: {
    key: string;
    value: string;
  };

  [AuditEventType.SILC_ALL_EXPIRED]: {
    citizenCount: number;
    /** Sum of the balances that were written off, as a positive number */
    expiredValue: number;
  };

  [AuditEventType.SILC_BALANCES_REFRESHED]: {
    citizenCount: number;
  };

  [AuditEventType.ROLE_SALARIES_DISBURSED]: {
    roleIds: string[];
    transactionCount: number;
    disbursedValue: number;
  };

  [AuditEventType.NOTIFICATION_SETTINGS_UPDATED]: {
    citizenId: string;
    enabled: { notificationType: string; channel: string }[];
    disabled: { notificationType: string; channel: string }[];
  };

  [AuditEventType.ON_SITE_NOTIFICATIONS_CREATED]: {
    count: number;
    notificationTypes: string[];
  };

  [AuditEventType.ON_SITE_NOTIFICATIONS_READ]: {
    citizenId: string;
    count: number;
  };

  [AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ]: {
    citizenId: string;
    count: number;
  };

  [AuditEventType.ON_SITE_NOTIFICATION_UNREAD]: {
    citizenId: string;
    notificationId: string;
  };

  [AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED]: {
    citizenId: string;
    notificationId: string;
  };

  [AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED]: {
    citizenId: string;
    count: number;
  };

  [AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED]: {
    citizenId: string;
    notificationId: string;
  };

  [AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED]: {
    count: number;
    /** Why the endpoints were dropped by their push service */
    reason: "expired" | "invalid";
  };

  [AuditEventType.CHANGELOG_ENTRIES_SEEN]: {
    citizenId: string;
    count: number;
  };

  [AuditEventType.UNUSED_UPLOADS_DELETED]: {
    databaseCount: number;
    bucketCount: number;
  };

  [AuditEventType.EVENT_IMPORTED_FROM_DISCORD]: {
    eventId: string;
    discordId: string;
    name: string;
  };

  [AuditEventType.EVENT_UPDATED_FROM_DISCORD]: {
    eventId: string;
    discordId: string;
    name: string;
  };

  [AuditEventType.EVENT_DELETED_FROM_DISCORD]: {
    eventIds: string[];
  };

  [AuditEventType.EVENT_PARTICIPANTS_SYNCED]: {
    eventId: string;
    addedCount: number;
    removedCount: number;
  };

  [AuditEventType.CITIZENS_PER_ROLE_COUNTED]: {
    roleCount: number;
  };

  [AuditEventType.SHIPS_PER_VARIANT_COUNTED]: {
    variantCount: number;
  };

  [AuditEventType.UNIQUE_LOGINS_COUNTED]: {
    date: string;
    count: number;
  };
}

interface AuditEventDefinition<Type extends AuditEventType> {
  type: Type;
  data: AuditEventDataByType[Type];
  message: (data: AuditEventDataByType[Type]) => string;
}

export const AuditEventDefinitions: {
  [Key in AuditEventType]: AuditEventDefinition<Key>;
} = {
  [AuditEventType.USER_LOGIN]: {
    type: AuditEventType.USER_LOGIN,
    data: {
      userId: "string",
    },
    message: (data) => `User ${data.userId} logged in`,
  },

  [AuditEventType.USER_LOGIN_V2]: {
    type: AuditEventType.USER_LOGIN_V2,
    data: {
      userId: "string",
      userEmail: "string",
      userName: "string",
    },
    message: (data) =>
      `User ${data.userName ?? data.userId} (${data.userEmail ?? "unknown email"}) logged in`,
  },

  [AuditEventType.USER_LOGOUT]: {
    type: AuditEventType.USER_LOGOUT,
    data: {
      sessionId: "string",
      userId: "string",
    },
    message: (data) => `User ${data.userId} logged out`,
  },

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY]: {
    type: AuditEventType.USER_FIRST_VISIT_OF_THE_DAY,
    data: {
      userId: "string",
    },
    message: (data) => `User ${data.userId} - first visit of the day`,
  },

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2]: {
    type: AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2,
    data: {
      userId: "string",
      userEmail: "string",
      userName: "string",
    },
    message: (data) =>
      `First visit of the day by user ${data.userName} (${data.userId}, ${data.userEmail})`,
  },

  [AuditEventType.SHIP_CREATED]: {
    type: AuditEventType.SHIP_CREATED,
    data: {
      shipId: "string",
      ownerId: "string",
      variantId: "string",
    },
    message: (data) =>
      `Ship created (owner: ${data.ownerId}, variant: ${data.variantId})`,
  },

  [AuditEventType.SHIP_UPDATED]: {
    type: AuditEventType.SHIP_UPDATED,
    data: {
      shipId: "string",
      ownerId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Ship updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.SHIP_DELETED]: {
    type: AuditEventType.SHIP_DELETED,
    data: {
      shipId: "string",
      ownerId: "string",
      name: "string",
      variantId: "string",
    },
    message: (data) => `Ship deleted: "${data.name}" (owner: ${data.ownerId})`,
  },

  [AuditEventType.VARIANT_CREATED]: {
    type: AuditEventType.VARIANT_CREATED,
    data: {
      variantId: "string",
      seriesId: "string",
      name: "string",
      status: "FLIGHT_READY",
    },
    message: (data) =>
      `Variant created: "${data.name}" (series: ${data.seriesId})`,
  },

  [AuditEventType.VARIANT_CREATED_V2]: {
    type: AuditEventType.VARIANT_CREATED_V2,
    data: {
      variantId: "string",
      seriesId: "string",
      name: "string",
      status: "FLIGHT_READY",
      links: [
        {
          serviceName: "SPVIEWER",
          url: "https://example.com",
        },
      ],
    },
    message: (data) =>
      `Variant created: "${data.name}" (series: ${data.seriesId}, links: ${data.links.length})`,
  },

  [AuditEventType.VARIANT_UPDATED]: {
    type: AuditEventType.VARIANT_UPDATED,
    data: {
      variantId: "string",
      seriesId: "string",
      previousName: "string",
      newName: "string",
      previousStatus: "FLIGHT_READY",
      newStatus: "NOT_FLIGHT_READY",
    },
    message: (data) =>
      `Variant updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.VARIANT_UPDATED_V2]: {
    type: AuditEventType.VARIANT_UPDATED_V2,
    data: {
      variantId: "string",
      seriesId: "string",
      previousName: "string",
      newName: "string",
      previousStatus: "FLIGHT_READY",
      newStatus: "NOT_FLIGHT_READY",
      previousLinks: [
        {
          serviceName: "SPVIEWER",
          url: "https://example.com",
        },
      ],
      newLinks: [
        {
          serviceName: "SPVIEWER",
          url: "https://example.com",
        },
      ],
    },
    message: (data) =>
      `Variant updated: "${data.previousName}" → "${data.newName}" (links: ${data.previousLinks.length} → ${data.newLinks.length})`,
  },

  [AuditEventType.VARIANT_DELETED]: {
    type: AuditEventType.VARIANT_DELETED,
    data: {
      variantId: "string",
      seriesId: "string",
      name: "string",
    },
    message: (data) =>
      `Variant deleted: "${data.name}" (series: ${data.seriesId})`,
  },

  [AuditEventType.SERIES_UPDATED]: {
    type: AuditEventType.SERIES_UPDATED,
    data: {
      seriesId: "string",
      manufacturerId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Series updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.SERIES_DELETED]: {
    type: AuditEventType.SERIES_DELETED,
    data: {
      seriesId: "string",
      manufacturerId: "string",
      name: "string",
    },
    message: (data) =>
      `Series deleted: "${data.name}" (manufacturer: ${data.manufacturerId})`,
  },

  [AuditEventType.MANUFACTURER_UPDATED]: {
    type: AuditEventType.MANUFACTURER_UPDATED,
    data: {
      manufacturerId: "string",
      previousName: "string",
      newName: "string",
      previousImageId: "string",
      newImageId: "string",
    },
    message: (data) =>
      `Manufacturer updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.MANUFACTURER_DELETED]: {
    type: AuditEventType.MANUFACTURER_DELETED,
    data: {
      manufacturerId: "string",
      name: "string",
    },
    message: (data) => `Manufacturer deleted: "${data.name}"`,
  },

  [AuditEventType.WEB_PUSH_SUBSCRIBED]: {
    type: AuditEventType.WEB_PUSH_SUBSCRIBED,
    data: {
      subscriptionId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Web push subscription created for citizen ${data.citizenId}`,
  },

  [AuditEventType.ROLE_CREATED]: {
    type: AuditEventType.ROLE_CREATED,
    data: {
      roleId: "string",
      name: "string",
    },
    message: (data) => `Role created: "${data.name}" (${data.roleId})`,
  },

  [AuditEventType.ROLE_UPDATED]: {
    type: AuditEventType.ROLE_UPDATED,
    data: {
      roleId: "string",
      previousName: "string",
      newName: "string",
      previousMaxAgeDays: 0,
      newMaxAgeDays: 0,
    },
    message: (data) =>
      `Role updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.ROLE_UPDATED_V2]: {
    type: AuditEventType.ROLE_UPDATED_V2,
    data: {
      roleId: "string",
      previousName: "string",
      newName: "string",
      previousMaxAgeDays: 0,
      newMaxAgeDays: 0,
      previousAssignAfterInactiveDays: 0,
      newAssignAfterInactiveDays: 0,
    },
    message: (data) =>
      `Role updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.ROLE_UPDATED_V3]: {
    type: AuditEventType.ROLE_UPDATED_V3,
    data: {
      roleId: "string",
      previousName: "string",
      newName: "string",
      previousMaxAgeDays: 0,
      newMaxAgeDays: 0,
      previousAssignAfterInactiveDays: 0,
      newAssignAfterInactiveDays: 0,
      previousDescription: null,
      newDescription: null,
    },
    message: (data) =>
      `Role updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.ROLE_DELETED]: {
    type: AuditEventType.ROLE_DELETED,
    data: {
      roleId: "string",
      name: "string",
    },
    message: (data) => `Role deleted: "${data.name}" (${data.roleId})`,
  },

  [AuditEventType.ROLE_PERMISSIONS_UPDATED]: {
    type: AuditEventType.ROLE_PERMISSIONS_UPDATED,
    data: {
      roleId: "string",
    },
    message: (data) => `Permissions updated for role ${data.roleId}`,
  },

  [AuditEventType.ROLE_PERMISSION_TOGGLED]: {
    type: AuditEventType.ROLE_PERMISSION_TOGGLED,
    data: {
      roleId: "string",
      permissionString: "string",
      enabled: true,
    },
    message: (data) =>
      `Permission "${data.permissionString}" ${data.enabled ? "enabled" : "disabled"} for role ${data.roleId}`,
  },

  [AuditEventType.ROLE_INHERITANCE_UPDATED]: {
    type: AuditEventType.ROLE_INHERITANCE_UPDATED,
    data: {
      roleId: "string",
    },
    message: (data) => `Role inheritance updated for role ${data.roleId}`,
  },

  [AuditEventType.ROLE_ASSIGNMENTS_UPDATED]: {
    type: AuditEventType.ROLE_ASSIGNMENTS_UPDATED,
    data: {
      citizenId: "string",
      changes: [
        {
          roleId: "string",
          enabled: true,
        },
      ],
    },
    message: (data) => `Role assignments updated for citizen ${data.citizenId}`,
  },

  [AuditEventType.ROLE_ASSIGNMENT_DELETED]: {
    type: AuditEventType.ROLE_ASSIGNMENT_DELETED,
    data: {
      citizenId: "string",
      roleId: "string",
    },
    message: (data) =>
      `Role assignment deleted for citizen ${data.citizenId} (role: ${data.roleId})`,
  },

  [AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED]: {
    type: AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED,
    data: {
      citizenId: "string",
      roleId: "string",
    },
    message: (data) =>
      `Role assignment level increased for citizen ${data.citizenId} (role: ${data.roleId})`,
  },

  [AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED]: {
    type: AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED,
    data: {
      citizenId: "string",
      roleId: "string",
    },
    message: (data) =>
      `Role assignment level decreased for citizen ${data.citizenId} (role: ${data.roleId})`,
  },

  [AuditEventType.ROLE_AUTO_ASSIGNED]: {
    type: AuditEventType.ROLE_AUTO_ASSIGNED,
    data: {
      citizenId: "string",
      citizenHandle: "string",
      roleId: "string",
      roleName: "string",
    },
    message: (data) =>
      `Role "${data.roleName}" (${data.roleId}) auto-assigned to "${data.citizenHandle}" (${data.citizenId})`,
  },

  [AuditEventType.ROLE_AUTO_REMOVED]: {
    type: AuditEventType.ROLE_AUTO_REMOVED,
    data: {
      citizenId: "string",
      citizenHandle: "string",
      roleId: "string",
      roleName: "string",
    },
    message: (data) =>
      `Role "${data.roleName}" (${data.roleId}) auto-removed from "${data.citizenHandle}" (${data.citizenId})`,
  },

  [AuditEventType.SILC_TRANSACTION_CREATED]: {
    type: AuditEventType.SILC_TRANSACTION_CREATED,
    data: {
      transactionIds: ["string"],
      receiverIds: ["string"],
      value: 0,
      description: "string",
    },
    message: (data) => `SILC transaction created: ${data.value} SILC`,
  },

  [AuditEventType.SILC_TRANSACTION_UPDATED]: {
    type: AuditEventType.SILC_TRANSACTION_UPDATED,
    data: {
      transactionId: "string",
      previousValue: 0,
      newValue: 0,
      previousDescription: "string",
      newDescription: "string",
      receiverId: "string",
    },
    message: (data) =>
      `SILC transaction updated: ${data.previousValue} → ${data.newValue} SILC`,
  },

  [AuditEventType.SILC_TRANSACTION_DELETED]: {
    type: AuditEventType.SILC_TRANSACTION_DELETED,
    data: {
      transactionId: "string",
      receiverId: "string",
      value: 0,
      description: "string",
    },
    message: (data) => `SILC transaction deleted (${data.transactionId})`,
  },

  [AuditEventType.SALARY_CONFIG_UPDATED]: {
    type: AuditEventType.SALARY_CONFIG_UPDATED,
    data: {
      roleIds: ["string"],
    },
    message: () => `Salary config updated`,
  },

  [AuditEventType.PENALTY_ENTRY_CREATED]: {
    type: AuditEventType.PENALTY_ENTRY_CREATED,
    data: {
      penaltyEntryId: "string",
      citizenId: "string",
      points: 0,
      reason: "string",
      expiresAt: new Date(),
    },
    message: (data) =>
      `Penalty entry created for citizen ${data.citizenId} (${data.points} points)`,
  },

  [AuditEventType.PENALTY_ENTRY_DELETED]: {
    type: AuditEventType.PENALTY_ENTRY_DELETED,
    data: {
      penaltyEntryId: "string",
      citizenId: "string",
      points: 0,
      reason: "string",
    },
    message: (data) =>
      `Penalty entry deleted for citizen ${data.citizenId} (${data.points} points)`,
  },

  [AuditEventType.PROFIT_CYCLE_CREATED]: {
    type: AuditEventType.PROFIT_CYCLE_CREATED,
    data: {
      cycleId: "string",
      title: "string",
      collectionEndedAt: new Date(),
    },
    message: (data) =>
      `Profit distribution cycle created: "${data.title}" (${data.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED]: {
    type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
    data: {
      cycleId: "string",
    },
    message: (data) =>
      `Profit distribution cycle collection ended (${data.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED]: {
    type: AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED,
    data: {
      cycleId: "string",
    },
    message: (data) =>
      `Profit distribution cycle payout started (${data.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED]: {
    type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
    data: {
      cycleId: "string",
    },
    message: (data) =>
      `Profit distribution cycle payout ended (${data.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PARTICIPANT_UPDATED]: {
    type: AuditEventType.PROFIT_CYCLE_PARTICIPANT_UPDATED,
    data: {
      cycleId: "string",
      changes: [
        {
          citizenId: "string",
          attribute: "string",
          enabled: true,
        },
      ],
    },
    message: (data) =>
      `Profit cycle participant updated (cycle: ${data.cycleId})`,
  },

  [AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED]: {
    type: AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED,
    data: {
      cycleId: "string",
      citizenId: "string",
      value: true,
    },
    message: (data) =>
      `Profit distribution accepted toggled to ${data.value} (cycle: ${data.cycleId})`,
  },

  [AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED]: {
    type: AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED,
    data: {
      cycleId: "string",
      citizenId: "string",
      value: true,
    },
    message: (data) =>
      `Profit distribution ceded toggled to ${data.value} (cycle: ${data.cycleId})`,
  },

  [AuditEventType.TASK_CREATED]: {
    type: AuditEventType.TASK_CREATED,
    data: {
      taskIds: ["string"],
      visibility: "PUBLIC",
      rewardType: "TEXT",
    },
    message: () => `Task(s) created`,
  },

  [AuditEventType.TASK_COMPLETED]: {
    type: AuditEventType.TASK_COMPLETED,
    data: {
      taskId: "string",
      completionistIds: ["string"],
      rewardType: "TEXT",
    },
    message: (data) => `Task completed (${data.taskId})`,
  },

  [AuditEventType.TASK_DELETED]: {
    type: AuditEventType.TASK_DELETED,
    data: {
      taskId: "string",
      title: "string",
    },
    message: (data) => `Task deleted: "${data.title}" (${data.taskId})`,
  },

  [AuditEventType.TASK_CANCELLED]: {
    type: AuditEventType.TASK_CANCELLED,
    data: {
      taskId: "string",
      title: "string",
    },
    message: (data) => `Task cancelled: "${data.title}" (${data.taskId})`,
  },

  [AuditEventType.TASK_ASSIGNMENTS_UPDATED]: {
    type: AuditEventType.TASK_ASSIGNMENTS_UPDATED,
    data: {
      taskId: "string",
    },
    message: (data) => `Task assignments updated (${data.taskId})`,
  },

  [AuditEventType.TASK_TITLE_UPDATED]: {
    type: AuditEventType.TASK_TITLE_UPDATED,
    data: {
      taskId: "string",
      previousTitle: "Old title",
      newTitle: "New title",
    },
    message: (data) =>
      `Task title updated: "${data.previousTitle}" → "${data.newTitle}"`,
  },

  [AuditEventType.TASK_DESCRIPTION_UPDATED]: {
    type: AuditEventType.TASK_DESCRIPTION_UPDATED,
    data: {
      taskId: "string",
      previousDescription: "Old description",
      newDescription: "New description",
    },
    message: (data) => `Task description updated (${data.taskId})`,
  },

  [AuditEventType.TASK_EXPIRES_AT_UPDATED]: {
    type: AuditEventType.TASK_EXPIRES_AT_UPDATED,
    data: {
      taskId: "string",
      previousExpiresAt: null,
      newExpiresAt: new Date(),
    },
    message: (data) => `Task expiry updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REPEATABLE_UPDATED]: {
    type: AuditEventType.TASK_REPEATABLE_UPDATED,
    data: {
      taskId: "string",
      previousRepeatable: 1,
      newRepeatable: 2,
    },
    message: (data) => `Task repeatable updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REQUIRED_ROLES_UPDATED]: {
    type: AuditEventType.TASK_REQUIRED_ROLES_UPDATED,
    data: {
      taskId: "string",
    },
    message: (data) => `Task required roles updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REWARD_TEXT_UPDATED]: {
    type: AuditEventType.TASK_REWARD_TEXT_UPDATED,
    data: {
      taskId: "string",
      previousValue: "Old reward",
      newValue: "New reward",
    },
    message: (data) => `Task reward text updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REWARD_SILC_UPDATED]: {
    type: AuditEventType.TASK_REWARD_SILC_UPDATED,
    data: {
      taskId: "string",
      previousValue: 10,
      newValue: 20,
    },
    message: (data) => `Task SILC reward updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REWARD_NEW_SILC_UPDATED]: {
    type: AuditEventType.TASK_REWARD_NEW_SILC_UPDATED,
    data: {
      taskId: "string",
      previousValue: 100,
      newValue: 200,
    },
    message: (data) => `Task new SILC reward updated (${data.taskId})`,
  },

  [AuditEventType.TASK_SELF_ASSIGNMENT_CREATED]: {
    type: AuditEventType.TASK_SELF_ASSIGNMENT_CREATED,
    data: {
      taskId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Task self-assignment created (task: ${data.taskId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.TASK_SELF_ASSIGNMENT_DELETED]: {
    type: AuditEventType.TASK_SELF_ASSIGNMENT_DELETED,
    data: {
      taskId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Task self-assignment deleted (task: ${data.taskId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.EVENT_POSITION_CREATED]: {
    type: AuditEventType.EVENT_POSITION_CREATED,
    data: {
      eventId: "string",
      positionId: "string",
      name: "string",
      variantIds: ["string"],
      parentPositionId: "string",
    },
    message: (data) =>
      `Event position "${data.name}" created (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_POSITION_UPDATED]: {
    type: AuditEventType.EVENT_POSITION_UPDATED,
    data: {
      eventId: "string",
      positionId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Event position updated (event: ${data.eventId}, position: ${data.positionId})`,
  },

  [AuditEventType.EVENT_POSITION_UPDATED_V2]: {
    type: AuditEventType.EVENT_POSITION_UPDATED_V2,
    data: {
      eventId: "string",
      positionId: "string",
      previousName: "string",
      newName: "string",
      previousFontSize: "string",
      newFontSize: "string",
      previousBackgroundColor: "string",
      newBackgroundColor: "string",
      previousTextColor: "string",
      newTextColor: "string",
    },
    message: (data) =>
      `Event position updated (event: ${data.eventId}, position: ${data.positionId})`,
  },

  [AuditEventType.EVENT_POSITION_DELETED]: {
    type: AuditEventType.EVENT_POSITION_DELETED,
    data: {
      eventId: "string",
      positionId: "string",
      name: "string",
    },
    message: (data) =>
      `Event position deleted (event: ${data.eventId}, position: ${data.positionId})`,
  },

  [AuditEventType.EVENT_MANAGERS_ASSIGNED]: {
    type: AuditEventType.EVENT_MANAGERS_ASSIGNED,
    data: {
      eventId: "string",
      managerIds: ["string"],
    },
    message: (data) => `Event managers assigned (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_MANAGER_REMOVED]: {
    type: AuditEventType.EVENT_MANAGER_REMOVED,
    data: {
      eventId: "string",
      managerId: "string",
    },
    message: (data) =>
      `Event manager removed (event: ${data.eventId}, manager: ${data.managerId})`,
  },

  [AuditEventType.EVENT_LINEUP_STATUS_CHANGED]: {
    type: AuditEventType.EVENT_LINEUP_STATUS_CHANGED,
    data: {
      eventId: "string",
      enabled: true,
    },
    message: (data) =>
      `Event lineup ${data.enabled ? "enabled" : "disabled"} (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_LINEUP_ORDER_CHANGED]: {
    type: AuditEventType.EVENT_LINEUP_ORDER_CHANGED,
    data: {
      eventId: "string",
    },
    message: (data) => `Event lineup order changed (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED]: {
    type: AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED,
    data: {
      eventId: "string",
      positionId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen assigned to event position (event: ${data.eventId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.EVENT_POSITION_CITIZEN_REMOVED]: {
    type: AuditEventType.EVENT_POSITION_CITIZEN_REMOVED,
    data: {
      eventId: "string",
      positionId: "string",
      previousCitizenId: "string",
    },
    message: (data) =>
      `Citizen removed from event position (event: ${data.eventId}, previousCitizen: ${data.previousCitizenId})`,
  },

  [AuditEventType.EVENT_POSITION_NAME_UPDATED]: {
    type: AuditEventType.EVENT_POSITION_NAME_UPDATED,
    data: {
      eventId: "string",
      positionId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Event position name updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.EVENT_POSITION_APPLICATION_CREATED]: {
    type: AuditEventType.EVENT_POSITION_APPLICATION_CREATED,
    data: {
      eventId: "string",
      positionId: "string",
      citizenId: "string",
      applicationId: "string",
    },
    message: (data) =>
      `Application created for event position (event: ${data.eventId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.EVENT_POSITION_APPLICATION_DELETED]: {
    type: AuditEventType.EVENT_POSITION_APPLICATION_DELETED,
    data: {
      eventId: "string",
      positionId: "string",
      citizenId: "string",
      applicationId: "string",
    },
    message: (data) =>
      `Application deleted for event position (event: ${data.eventId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.EVENT_LINEUP_COPIED]: {
    type: AuditEventType.EVENT_LINEUP_COPIED,
    data: {
      sourceEventId: "string",
      targetEventId: "string",
    },
    message: (data) =>
      `Event lineup copied from ${data.sourceEventId} to ${data.targetEventId}`,
  },

  [AuditEventType.EVENT_POSITION_COPIED]: {
    type: AuditEventType.EVENT_POSITION_COPIED,
    data: {
      sourceEventId: "string",
      sourcePositionId: "string",
      targetEventId: "string",
      targetPositionId: "string",
      placement: "after",
      positionCount: 0,
    },
    message: (data) =>
      `${data.positionCount} event position(s) copied from ${data.sourcePositionId} (event: ${data.sourceEventId}) ${data.placement} ${data.targetPositionId} (event: ${data.targetEventId})`,
  },

  [AuditEventType.CITIZEN_CREATED]: {
    type: AuditEventType.CITIZEN_CREATED,
    data: {
      citizenId: "string",
      spectrumId: "string",
    },
    message: (data) =>
      `Citizen created: ${data.spectrumId} (${data.citizenId})`,
  },

  [AuditEventType.CITIZEN_DELETED]: {
    type: AuditEventType.CITIZEN_DELETED,
    data: {
      citizenId: "string",
      spectrumId: "string",
    },
    message: (data) =>
      `Citizen deleted: ${data.spectrumId} (${data.citizenId})`,
  },

  [AuditEventType.ENTITY_LOG_CREATED]: {
    type: AuditEventType.ENTITY_LOG_CREATED,
    data: {
      entityId: "string",
      logId: "string",
      logType: "string",
    },
    message: (data) =>
      `Entity log created (entity: ${data.entityId}, type: ${data.logType})`,
  },

  [AuditEventType.ENTITY_LOG_UPDATED]: {
    type: AuditEventType.ENTITY_LOG_UPDATED,
    data: {
      entityId: "string",
      logId: "string",
      logType: "string",
    },
    message: (data) =>
      `Entity log updated (entity: ${data.entityId}, log: ${data.logId})`,
  },

  [AuditEventType.ENTITY_LOG_DELETED]: {
    type: AuditEventType.ENTITY_LOG_DELETED,
    data: {
      entityId: "string",
      logId: "string",
      logType: "string",
    },
    message: (data) =>
      `Entity log deleted (entity: ${data.entityId}, log: ${data.logId})`,
  },

  [AuditEventType.ORGANIZATION_CREATED]: {
    type: AuditEventType.ORGANIZATION_CREATED,
    data: {
      organizationId: "string",
      spectrumId: "string",
      name: "string",
    },
    message: (data) =>
      `Organization created: "${data.name}" (${data.spectrumId})`,
  },

  [AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED]: {
    type: AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED,
    data: {
      organizationId: "string",
      citizenId: "string",
      type: "MAIN",
    },
    message: (data) =>
      `Organization membership created (org: ${data.organizationId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED]: {
    type: AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED,
    data: {
      organizationId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Organization membership removed (org: ${data.organizationId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED]: {
    type: AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED,
    data: {
      historyEntryId: "string",
      citizenId: "string",
      confirmed: "CONFIRMED",
    },
    message: (data) =>
      `Organization membership confirmation updated (citizen: ${data.citizenId})`,
  },

  [AuditEventType.CLASSIFICATION_LEVEL_CREATED]: {
    type: AuditEventType.CLASSIFICATION_LEVEL_CREATED,
    data: {
      classificationLevelId: "string",
      name: "string",
    },
    message: (data) => `Classification level created: "${data.name}"`,
  },

  [AuditEventType.CLASSIFICATION_LEVEL_UPDATED]: {
    type: AuditEventType.CLASSIFICATION_LEVEL_UPDATED,
    data: {
      classificationLevelId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Classification level updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.CLASSIFICATION_LEVEL_DELETED]: {
    type: AuditEventType.CLASSIFICATION_LEVEL_DELETED,
    data: {
      classificationLevelId: "string",
      name: "string",
    },
    message: (data) => `Classification level deleted: "${data.name}"`,
  },

  [AuditEventType.NOTE_TYPE_CREATED]: {
    type: AuditEventType.NOTE_TYPE_CREATED,
    data: {
      noteTypeId: "string",
      name: "string",
    },
    message: (data) => `Note type created: "${data.name}"`,
  },

  [AuditEventType.NOTE_TYPE_UPDATED]: {
    type: AuditEventType.NOTE_TYPE_UPDATED,
    data: {
      noteTypeId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Note type updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.NOTE_TYPE_DELETED]: {
    type: AuditEventType.NOTE_TYPE_DELETED,
    data: {
      noteTypeId: "string",
      name: "string",
    },
    message: (data) => `Note type deleted: "${data.name}"`,
  },

  [AuditEventType.UPLOAD_CREATED]: {
    type: AuditEventType.UPLOAD_CREATED,
    data: {
      uploadId: "string",
      fileName: "file.png",
      mimeType: "image/png",
    },
    message: (data) => `File uploaded: "${data.fileName}" (${data.mimeType})`,
  },

  [AuditEventType.RESOURCE_IMAGE_ASSIGNED]: {
    type: AuditEventType.RESOURCE_IMAGE_ASSIGNED,
    data: {
      resourceType: "manufacturer",
      resourceId: "string",
      resourceAttribute: "imageId",
      imageId: "string",
    },
    message: (data) =>
      `Image assigned to ${data.resourceType} ${data.resourceId}`,
  },

  [AuditEventType.EMAIL_VERIFIED]: {
    type: AuditEventType.EMAIL_VERIFIED,
    data: {
      userId: "string",
    },
    message: (data) => `Email verified for user ${data.userId}`,
  },

  [AuditEventType.EMAIL_CONFIRMATION_REQUESTED]: {
    type: AuditEventType.EMAIL_CONFIRMATION_REQUESTED,
    data: {
      userId: "string",
      email: "user@example.com",
    },
    message: (data) =>
      `Email confirmation requested for user ${data.userId} (${data.email})`,
  },

  [AuditEventType.EMAIL_VERIFIED_VIA_TOKEN]: {
    type: AuditEventType.EMAIL_VERIFIED_VIA_TOKEN,
    data: {
      userId: "string",
    },
    message: (data) => `Email verified via token for user ${data.userId}`,
  },

  [AuditEventType.USER_BANNED]: {
    type: AuditEventType.USER_BANNED,
    data: {
      userId: "string",
      reason: "string",
    },
    message: (data) =>
      `User ${data.userId} banned${data.reason ? ` (reason: ${data.reason})` : ""}`,
  },

  [AuditEventType.USER_UNBANNED]: {
    type: AuditEventType.USER_UNBANNED,
    data: {
      userId: "string",
    },
    message: (data) => `User ${data.userId} unbanned`,
  },

  [AuditEventType.USER_LOGIN_BLOCKED]: {
    type: AuditEventType.USER_LOGIN_BLOCKED,
    data: {
      userId: "string",
    },
    message: (data) => `Login attempt of banned user ${data.userId} blocked`,
  },

  [AuditEventType.WIKI_PAGE_CREATED]: {
    type: AuditEventType.WIKI_PAGE_CREATED,
    data: {
      pageId: "string",
      title: "string",
      parentId: null,
    },
    message: (data) => `Wiki page created: "${data.title}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_UPDATED,
    data: {
      pageId: "string",
    },
    message: (data) => `Wiki page content updated (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_RENAMED]: {
    type: AuditEventType.WIKI_PAGE_RENAMED,
    data: {
      pageId: "string",
      previousTitle: "string",
      newTitle: "string",
    },
    message: (data) =>
      `Wiki page renamed from "${data.previousTitle}" to "${data.newTitle}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_MOVED]: {
    type: AuditEventType.WIKI_PAGE_MOVED,
    data: {
      pageId: "string",
      previousParentId: null,
      newParentId: "string",
    },
    message: (data) => `Wiki page moved (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_DUPLICATED]: {
    type: AuditEventType.WIKI_PAGE_DUPLICATED,
    data: {
      pageId: "string",
      sourcePageId: "string",
      title: "string",
      parentId: null,
      duplicatedPageIds: ["string"],
      mirroredChildren: true,
    },
    message: (data) =>
      `Wiki page duplicated: "${data.title}" (${data.pageId}) from ${data.sourcePageId}`,
  },

  [AuditEventType.WIKI_PAGE_COPIED]: {
    type: AuditEventType.WIKI_PAGE_COPIED,
    data: {
      pageId: "string",
      sourcePageId: "string",
      title: "string",
      parentId: null,
      rootPageId: "string",
    },
    message: (data) =>
      `Wiki page copied: "${data.title}" (${data.pageId}) from ${data.sourcePageId}`,
  },

  [AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED,
    data: {
      pageId: "string",
      visibility: "RESTRICTED",
      editability: "INHERIT",
      imageUploadability: "INHERIT",
      attachmentUploadability: "EDITORS",
      readRoleIds: ["string"],
      editRoleIds: [],
      adminRoleIds: [],
      cascaded: false,
    },
    message: (data) => `Wiki page permissions updated (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_EVENT_SCOPES_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_EVENT_SCOPES_UPDATED,
    data: {
      pageId: "string",
      eventId: "string",
      readScope: "PARTICIPANTS",
      readScopePositionId: null,
      editScope: "MANAGERS",
      editScopePositionId: null,
    },
    message: (data) =>
      `Event wiki page scopes updated (${data.pageId}, event ${data.eventId})`,
  },

  [AuditEventType.WIKI_PAGE_ROLE_ACCESS_PRUNED]: {
    type: AuditEventType.WIKI_PAGE_ROLE_ACCESS_PRUNED,
    data: {
      pageId: "string",
      removedRoleIds: ["string"],
      trigger: "PERMISSIONS_UPDATED",
    },
    message: (data) =>
      `Wiki page role access pruned (${data.pageId}): ${data.removedRoleIds.length} role(s) removed`,
  },

  [AuditEventType.WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE]: {
    type: AuditEventType.WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE,
    data: {
      pageId: "string",
      movedPageId: "string",
      newParentId: null,
    },
    message: (data) =>
      `Wiki page permissions reset by move (${data.pageId}), moved page ${data.movedPageId}`,
  },

  [AuditEventType.WIKI_PAGE_OWNERSHIP_TRANSFERRED]: {
    type: AuditEventType.WIKI_PAGE_OWNERSHIP_TRANSFERRED,
    data: {
      pageId: "string",
      previousOwnerId: "string",
      newOwnerId: null,
      cascaded: false,
    },
    message: (data) => `Wiki page ownership transferred (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_DELETED]: {
    type: AuditEventType.WIKI_PAGE_DELETED,
    data: {
      pageId: "string",
      title: "string",
      subtreePageIds: ["string"],
    },
    message: (data) => `Wiki page deleted: "${data.title}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_RESTORED]: {
    type: AuditEventType.WIKI_PAGE_RESTORED,
    data: {
      pageId: "string",
      title: "string",
      restoredPageIds: ["string"],
    },
    message: (data) => `Wiki page restored: "${data.title}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_DESTROYED]: {
    type: AuditEventType.WIKI_PAGE_DESTROYED,
    data: {
      pageId: "string",
      title: "string",
      destroyedPageIds: ["string"],
    },
    message: (data) =>
      `Wiki page permanently deleted: "${data.title}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_SETTINGS_UPDATED]: {
    type: AuditEventType.WIKI_SETTINGS_UPDATED,
    data: {
      setting: "string",
      value: "string",
    },
    message: (data) => `Wiki settings updated: ${data.setting}`,
  },

  [AuditEventType.WIKI_PAGE_REPORTED]: {
    type: AuditEventType.WIKI_PAGE_REPORTED,
    data: {
      reportId: "string",
      pageId: "string",
      uploadId: "string",
    },
    message: (data) => `Wiki page reported (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_REPORT_RESOLVED]: {
    type: AuditEventType.WIKI_PAGE_REPORT_RESOLVED,
    data: {
      reportId: "string",
      pageId: "string",
    },
    message: (data) => `Wiki page report resolved (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_SNAPSHOT_RESTORED]: {
    type: AuditEventType.WIKI_PAGE_SNAPSHOT_RESTORED,
    data: {
      pageId: "string",
      snapshotId: "string",
    },
    message: (data) => `Wiki page snapshot restored (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_CONTENT_IMPORTED]: {
    type: AuditEventType.WIKI_PAGE_CONTENT_IMPORTED,
    data: {
      pageId: "string",
    },
    message: (data) => `Wiki page content imported (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_SIDEBAR_MODE_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_SIDEBAR_MODE_UPDATED,
    data: {
      pageId: "string",
      previousSidebarMode: "VISIBLE",
      newSidebarMode: "CHILDREN_HIDDEN",
    },
    message: (data) =>
      `Wiki page sidebar mode changed from ${data.previousSidebarMode} to ${data.newSidebarMode} (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_TAGS_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_TAGS_UPDATED,
    data: {
      pageId: "string",
      addedTagNames: ["string"],
      removedTagNames: [],
    },
    message: (data) => `Wiki page tags updated (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_ICON_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_ICON_UPDATED,
    data: {
      pageId: "string",
      iconId: null,
    },
    message: (data) =>
      data.iconId
        ? `Wiki page icon updated (${data.pageId})`
        : `Wiki page icon removed (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_FAVORITE_ADDED]: {
    type: AuditEventType.WIKI_PAGE_FAVORITE_ADDED,
    data: {
      pageId: "string",
      citizenId: "string",
    },
    message: (data) => `Wiki page saved as a favorite (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_FAVORITE_REMOVED]: {
    type: AuditEventType.WIKI_PAGE_FAVORITE_REMOVED,
    data: {
      pageId: "string",
      citizenId: "string",
    },
    message: (data) => `Wiki page removed from favorites (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_VISITED]: {
    type: AuditEventType.WIKI_PAGE_VISITED,
    data: {
      pageId: "string",
      citizenId: "string",
    },
    message: (data) => `Wiki page visited (${data.pageId})`,
  },

  [AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT]: {
    type: AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT,
    data: {
      notifiedCount: 0,
      suppressedCount: 0,
    },
    message: (data) =>
      `Swept pending wiki citizen mentions: ${data.notifiedCount} notified, ${data.suppressedCount} suppressed`,
  },

  [AuditEventType.TRASHED_WIKI_PAGES_PURGED]: {
    type: AuditEventType.TRASHED_WIKI_PAGES_PURGED,
    data: {
      count: 0,
    },
    message: (data) => `Permanently deleted ${data.count} trashed wiki page(s)`,
  },

  [AuditEventType.ORPHANED_WIKI_TAGS_PURGED]: {
    type: AuditEventType.ORPHANED_WIKI_TAGS_PURGED,
    data: {
      count: 0,
    },
    message: (data) => `Deleted ${data.count} orphaned wiki tag(s)`,
  },

  [AuditEventType.MANUFACTURER_CREATED]: {
    type: AuditEventType.MANUFACTURER_CREATED,
    data: {
      manufacturerId: "string",
      name: "string",
    },
    message: (data) =>
      `Manufacturer ${data.name} created (${data.manufacturerId})`,
  },

  [AuditEventType.SERIES_CREATED]: {
    type: AuditEventType.SERIES_CREATED,
    data: {
      seriesId: "string",
      name: "string",
      manufacturerId: "string",
    },
    message: (data) => `Series ${data.name} created (${data.seriesId})`,
  },

  [AuditEventType.ENTITY_LOG_CONFIRMED]: {
    type: AuditEventType.ENTITY_LOG_CONFIRMED,
    data: {
      entityId: "string",
      logId: "string",
      logType: "string",
      confirmed: "confirmed",
    },
    message: (data) =>
      data.confirmed === "confirmed"
        ? `Entity log ${data.logType} confirmed (${data.logId})`
        : `Entity log ${data.logType} marked as a false report (${data.logId})`,
  },

  [AuditEventType.CAREER_FLOW_UPDATED]: {
    type: AuditEventType.CAREER_FLOW_UPDATED,
    data: {
      flowId: "string",
      nodeCount: 0,
      edgeCount: 0,
    },
    message: (data) =>
      `Career flow updated to ${data.nodeCount} node(s) and ${data.edgeCount} edge(s) (${data.flowId})`,
  },

  [AuditEventType.SILC_SETTING_UPDATED]: {
    type: AuditEventType.SILC_SETTING_UPDATED,
    data: {
      key: "string",
      value: "string",
    },
    message: (data) => `SILC setting ${data.key} set to ${data.value}`,
  },

  [AuditEventType.SILC_ALL_EXPIRED]: {
    type: AuditEventType.SILC_ALL_EXPIRED,
    data: {
      citizenCount: 0,
      expiredValue: 0,
    },
    message: (data) =>
      `Expired ${data.expiredValue} SILC of ${data.citizenCount} citizen(s)`,
  },

  [AuditEventType.SILC_BALANCES_REFRESHED]: {
    type: AuditEventType.SILC_BALANCES_REFRESHED,
    data: {
      citizenCount: 0,
    },
    message: (data) =>
      `Recalculated the SILC balances of ${data.citizenCount} citizen(s)`,
  },

  [AuditEventType.ROLE_SALARIES_DISBURSED]: {
    type: AuditEventType.ROLE_SALARIES_DISBURSED,
    data: {
      roleIds: ["string"],
      transactionCount: 0,
      disbursedValue: 0,
    },
    message: (data) =>
      `Disbursed ${data.disbursedValue} SILC in ${data.transactionCount} salary transaction(s) for ${data.roleIds.length} role(s)`,
  },

  [AuditEventType.NOTIFICATION_SETTINGS_UPDATED]: {
    type: AuditEventType.NOTIFICATION_SETTINGS_UPDATED,
    data: {
      citizenId: "string",
      enabled: [{ notificationType: "string", channel: "string" }],
      disabled: [],
    },
    message: (data) =>
      `Notification settings updated: ${data.enabled.length} enabled, ${data.disabled.length} disabled`,
  },

  [AuditEventType.ON_SITE_NOTIFICATIONS_CREATED]: {
    type: AuditEventType.ON_SITE_NOTIFICATIONS_CREATED,
    data: {
      count: 0,
      notificationTypes: ["string"],
    },
    message: (data) =>
      `Created ${data.count} on-site notification(s) of type ${data.notificationTypes.join(", ")}`,
  },

  [AuditEventType.ON_SITE_NOTIFICATIONS_READ]: {
    type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) => `Marked ${data.count} notification(s) as read`,
  },

  [AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ]: {
    type: AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) =>
      `Marked all ${data.count} unread notification(s) as read`,
  },

  [AuditEventType.ON_SITE_NOTIFICATION_UNREAD]: {
    type: AuditEventType.ON_SITE_NOTIFICATION_UNREAD,
    data: {
      citizenId: "string",
      notificationId: "string",
    },
    message: (data) => `Marked notification ${data.notificationId} as unread`,
  },

  [AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED]: {
    type: AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED,
    data: {
      citizenId: "string",
      notificationId: "string",
    },
    message: (data) => `Archived notification ${data.notificationId}`,
  },

  [AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED]: {
    type: AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) => `Archived ${data.count} read notification(s)`,
  },

  [AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED]: {
    type: AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED,
    data: {
      citizenId: "string",
      notificationId: "string",
    },
    message: (data) => `Restored notification ${data.notificationId}`,
  },

  [AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED]: {
    type: AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED,
    data: {
      count: 0,
      reason: "expired",
    },
    message: (data) =>
      `Deleted ${data.count} ${data.reason} Web Push subscription(s)`,
  },

  [AuditEventType.CHANGELOG_ENTRIES_SEEN]: {
    type: AuditEventType.CHANGELOG_ENTRIES_SEEN,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) => `Read ${data.count} new changelog entry/entries`,
  },

  [AuditEventType.UNUSED_UPLOADS_DELETED]: {
    type: AuditEventType.UNUSED_UPLOADS_DELETED,
    data: {
      databaseCount: 0,
      bucketCount: 0,
    },
    message: (data) =>
      `Deleted ${data.databaseCount} unused upload(s) and ${data.bucketCount} orphaned bucket object(s)`,
  },

  [AuditEventType.EVENT_IMPORTED_FROM_DISCORD]: {
    type: AuditEventType.EVENT_IMPORTED_FROM_DISCORD,
    data: {
      eventId: "string",
      discordId: "string",
      name: "string",
    },
    message: (data) =>
      `Imported event ${data.name} from Discord (${data.eventId})`,
  },

  [AuditEventType.EVENT_UPDATED_FROM_DISCORD]: {
    type: AuditEventType.EVENT_UPDATED_FROM_DISCORD,
    data: {
      eventId: "string",
      discordId: "string",
      name: "string",
    },
    message: (data) =>
      `Updated event ${data.name} from Discord (${data.eventId})`,
  },

  [AuditEventType.EVENT_DELETED_FROM_DISCORD]: {
    type: AuditEventType.EVENT_DELETED_FROM_DISCORD,
    data: {
      eventIds: ["string"],
    },
    message: (data) =>
      `Deleted ${data.eventIds.length} event(s) cancelled on Discord`,
  },

  [AuditEventType.EVENT_PARTICIPANTS_SYNCED]: {
    type: AuditEventType.EVENT_PARTICIPANTS_SYNCED,
    data: {
      eventId: "string",
      addedCount: 0,
      removedCount: 0,
    },
    message: (data) =>
      `Synced event participants from Discord: ${data.addedCount} added, ${data.removedCount} removed (${data.eventId})`,
  },

  [AuditEventType.CITIZENS_PER_ROLE_COUNTED]: {
    type: AuditEventType.CITIZENS_PER_ROLE_COUNTED,
    data: {
      roleCount: 0,
    },
    message: (data) =>
      `Saved the citizen count statistic of ${data.roleCount} role(s)`,
  },

  [AuditEventType.SHIPS_PER_VARIANT_COUNTED]: {
    type: AuditEventType.SHIPS_PER_VARIANT_COUNTED,
    data: {
      variantCount: 0,
    },
    message: (data) =>
      `Saved the ship count statistic of ${data.variantCount} variant(s)`,
  },

  [AuditEventType.UNIQUE_LOGINS_COUNTED]: {
    type: AuditEventType.UNIQUE_LOGINS_COUNTED,
    data: {
      date: "string",
      count: 0,
    },
    message: (data) => `Counted ${data.count} unique login(s) on ${data.date}`,
  },
};
