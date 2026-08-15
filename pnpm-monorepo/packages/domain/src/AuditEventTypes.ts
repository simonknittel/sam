/**
 * The audit-event vocabulary of the system log, shared between the Next.js
 * app (which writes most events and renders the log) and the Lambdas (whose
 * automations write events too). The system log is immutable: event type
 * definitions are only ever added — never modified — with newer payload
 * shapes introduced as V2/V3 types. The message rendering stays in the app.
 */
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
  /** @deprecated Superseded by VARIANT_CREATED_V3 (adds the wiki page link) */
  VARIANT_CREATED_V2 = "VARIANT_CREATED_V2",
  VARIANT_CREATED_V3 = "VARIANT_CREATED_V3",
  VARIANT_UPDATED = "VARIANT_UPDATED",
  /** @deprecated Superseded by VARIANT_UPDATED_V3 (adds the wiki page link) */
  VARIANT_UPDATED_V2 = "VARIANT_UPDATED_V2",
  VARIANT_UPDATED_V3 = "VARIANT_UPDATED_V3",
  VARIANT_DELETED = "VARIANT_DELETED",
  SERIES_UPDATED = "SERIES_UPDATED",
  SERIES_DELETED = "SERIES_DELETED",
  MANUFACTURER_UPDATED = "MANUFACTURER_UPDATED",
  MANUFACTURER_DELETED = "MANUFACTURER_DELETED",
  WEB_PUSH_SUBSCRIBED = "WEB_PUSH_SUBSCRIBED",
  WEB_PUSH_UNSUBSCRIBED = "WEB_PUSH_UNSUBSCRIBED",
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
  IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED = "IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED",
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

  [AuditEventType.VARIANT_CREATED_V3]: {
    variantId: string;
    seriesId: string;
    name: string;
    status: string | null;
    links: { serviceName: string; url: string }[];
    wikiPageId: string | null;
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

  [AuditEventType.VARIANT_UPDATED_V3]: {
    variantId: string;
    seriesId: string;
    previousName: string;
    newName: string;
    previousStatus: string | null;
    newStatus: string | null;
    previousLinks: { serviceName: string; url: string }[];
    newLinks: { serviceName: string; url: string }[];
    previousWikiPageId: string | null;
    newWikiPageId: string | null;
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

  [AuditEventType.WEB_PUSH_UNSUBSCRIBED]: {
    citizenId: string;
    count: number;
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

  [AuditEventType.IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED]: {
    count: number;
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

/**
 * One creatable audit event: the payload type is tied to the event type so
 * writers can't emit a payload the system log doesn't know how to render.
 */
export type AuditEventInput = {
  [Key in AuditEventType]: {
    type: Key;
    data: AuditEventDataByType[Key];
    createdById?: string | null;
  };
}[AuditEventType];
