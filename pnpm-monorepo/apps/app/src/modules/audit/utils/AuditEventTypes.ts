export {
  AuditEventType,
  type AuditEventDataByType,
} from "@sam-monorepo/domain";
import {
  AuditEventType,
  type AuditEventDataByType,
} from "@sam-monorepo/domain";

/**
 * Types whose events are written often enough to drown out everything else
 * in the system log — per page view, per opened notification popover, per
 * automation run. The system log hides them unless they are explicitly
 * selected in its type filter.
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
  ]);

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

  [AuditEventType.USER_SESSION_DELETED]: {
    type: AuditEventType.USER_SESSION_DELETED,
    data: {
      sessionId: "string",
      userId: "string",
    },
    message: (data) =>
      `User ${data.userId} deleted their session ${data.sessionId}`,
  },

  [AuditEventType.EXPIRED_AUTHENTICATION_RECORDS_PURGED]: {
    type: AuditEventType.EXPIRED_AUTHENTICATION_RECORDS_PURGED,
    data: {
      sessionCount: 0,
      verificationTokenCount: 0,
      emailConfirmationTokenCount: 0,
    },
    message: (data) =>
      `Deleted ${data.sessionCount} expired session(s), ${data.verificationTokenCount} expired verification token(s) and ${data.emailConfirmationTokenCount} expired email confirmation token(s)`,
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

  [AuditEventType.SHIP_CREATED_V2]: {
    type: AuditEventType.SHIP_CREATED_V2,
    data: {
      shipId: "string",
      ownerId: "string",
      variantId: "string",
    },
    message: (data) =>
      `Ship created (owner citizen: ${data.ownerId}, variant: ${data.variantId})`,
  },

  [AuditEventType.SHIP_UPDATED_V2]: {
    type: AuditEventType.SHIP_UPDATED_V2,
    data: {
      shipId: "string",
      ownerId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Ship updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.SHIP_DELETED_V2]: {
    type: AuditEventType.SHIP_DELETED_V2,
    data: {
      shipId: "string",
      ownerId: "string",
      name: "string",
      variantId: "string",
    },
    message: (data) =>
      `Ship deleted: "${data.name}" (owner citizen: ${data.ownerId})`,
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

  [AuditEventType.VARIANT_CREATED_V3]: {
    type: AuditEventType.VARIANT_CREATED_V3,
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
      wikiPageId: "string",
    },
    message: (data) =>
      `Variant created: "${data.name}" (series: ${data.seriesId}, links: ${data.links.length}, wiki page: ${data.wikiPageId ?? "none"})`,
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

  [AuditEventType.VARIANT_UPDATED_V3]: {
    type: AuditEventType.VARIANT_UPDATED_V3,
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
      previousWikiPageId: "string",
      newWikiPageId: "string",
    },
    message: (data) =>
      `Variant updated: "${data.previousName}" → "${data.newName}" (links: ${data.previousLinks.length} → ${data.newLinks.length}, wiki page: ${data.previousWikiPageId ?? "none"} → ${data.newWikiPageId ?? "none"})`,
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

  [AuditEventType.WEB_PUSH_UNSUBSCRIBED]: {
    type: AuditEventType.WEB_PUSH_UNSUBSCRIBED,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) =>
      `Unsubscribed from web push notifications (${data.count} subscription(s) removed)`,
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

  [AuditEventType.ROLE_INHERITANCE_TOGGLED]: {
    type: AuditEventType.ROLE_INHERITANCE_TOGGLED,
    data: {
      roleId: "string",
      inheritedRoleId: "string",
      enabled: true,
    },
    message: (data) =>
      `Inheritance of role ${data.inheritedRoleId} ${data.enabled ? "enabled" : "disabled"} for role ${data.roleId}`,
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

  [AuditEventType.EVENT_TEMPLATE_POSITION_CREATED]: {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_CREATED,
    data: {
      templateId: "string",
      positionId: "string",
      name: "string",
      variantIds: ["string"],
      parentPositionId: "string",
    },
    message: (data) =>
      `Event template position "${data.name}" created (template: ${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_POSITION_UPDATED]: {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_UPDATED,
    data: {
      templateId: "string",
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
      `Event template position updated (template: ${data.templateId}, position: ${data.positionId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_POSITION_NAME_UPDATED]: {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_NAME_UPDATED,
    data: {
      templateId: "string",
      positionId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (data) =>
      `Event template position name updated: "${data.previousName}" → "${data.newName}" (template: ${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_POSITION_DELETED]: {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_DELETED,
    data: {
      templateId: "string",
      positionId: "string",
      name: "string",
    },
    message: (data) =>
      `Event template position deleted (template: ${data.templateId}, position: ${data.positionId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_LINEUP_ORDER_CHANGED]: {
    type: AuditEventType.EVENT_TEMPLATE_LINEUP_ORDER_CHANGED,
    data: {
      templateId: "string",
    },
    message: (data) =>
      `Event template lineup order changed (template: ${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_POSITION_COPIED]: {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_COPIED,
    data: {
      sourceEventId: "string",
      sourceTemplateId: "string",
      sourcePositionId: "string",
      targetEventId: "string",
      targetTemplateId: "string",
      targetPositionId: "string",
      placement: "after",
      positionCount: 0,
    },
    message: (data) =>
      `${data.positionCount} position(s) copied from ${data.sourcePositionId} (${data.sourceTemplateId ? `template: ${data.sourceTemplateId}` : `event: ${data.sourceEventId}`}) ${data.placement} ${data.targetPositionId} (${data.targetTemplateId ? `template: ${data.targetTemplateId}` : `event: ${data.targetEventId}`})`,
  },

  [AuditEventType.EVENT_TEMPLATE_CREATED]: {
    type: AuditEventType.EVENT_TEMPLATE_CREATED,
    data: {
      templateId: "string",
      name: "string",
    },
    message: (data) =>
      `Event template "${data.name}" created (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_UPDATED]: {
    type: AuditEventType.EVENT_TEMPLATE_UPDATED,
    data: {
      templateId: "string",
      previousName: "string",
      name: "string",
      visibility: "PUBLIC",
      visibilityRoleIds: ["string"],
      coverImageChanged: false,
    },
    message: (data) =>
      `Event template "${data.name}" updated (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_DUPLICATED]: {
    type: AuditEventType.EVENT_TEMPLATE_DUPLICATED,
    data: {
      templateId: "string",
      name: "string",
      sourceTemplateId: "string",
      sourceName: "string",
      positionCount: 0,
      pageCount: 0,
    },
    message: (data) =>
      `Event template "${data.sourceName}" (${data.sourceTemplateId}) duplicated as "${data.name}" (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_CREATED_FROM_EVENT]: {
    type: AuditEventType.EVENT_TEMPLATE_CREATED_FROM_EVENT,
    data: {
      templateId: "string",
      name: "string",
      sourceEventId: "string",
      sourceEventName: "string",
      positionCount: 0,
      pageCount: 0,
    },
    message: (data) =>
      `Event "${data.sourceEventName}" (${data.sourceEventId}) saved as event template "${data.name}" (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_DELETED]: {
    type: AuditEventType.EVENT_TEMPLATE_DELETED,
    data: {
      templateId: "string",
      name: "string",
    },
    message: (data) =>
      `Event template "${data.name}" deleted (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_RESTORED]: {
    type: AuditEventType.EVENT_TEMPLATE_RESTORED,
    data: {
      templateId: "string",
      name: "string",
    },
    message: (data) =>
      `Event template "${data.name}" restored (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_ROLE_ACCESS_UPDATED]: {
    type: AuditEventType.EVENT_TEMPLATE_ROLE_ACCESS_UPDATED,
    data: {
      templateId: "string",
      readRoleIds: ["string"],
      editRoleIds: ["string"],
    },
    message: (data) =>
      `Event template shares updated (${data.templateId}): ${data.readRoleIds.length} read, ${data.editRoleIds.length} edit`,
  },

  [AuditEventType.EVENT_TEMPLATE_OWNERSHIP_TRANSFERRED]: {
    type: AuditEventType.EVENT_TEMPLATE_OWNERSHIP_TRANSFERRED,
    data: {
      templateId: "string",
      name: "string",
      previousOwnerId: "string",
      newOwnerId: "string",
    },
    message: (data) =>
      `Event template "${data.name}" (${data.templateId}) transferred from ${data.previousOwnerId ?? "nobody"} to ${data.newOwnerId}`,
  },

  [AuditEventType.EVENT_CREATED_FROM_TEMPLATE]: {
    type: AuditEventType.EVENT_CREATED_FROM_TEMPLATE,
    data: {
      eventId: "string",
      templateId: "string",
      templateName: "string",
    },
    message: (data) =>
      `Event ${data.eventId} created from template "${data.templateName}" (${data.templateId})`,
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

  [AuditEventType.WIKI_PAGE_TEMPLATE_SCOPES_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_TEMPLATE_SCOPES_UPDATED,
    data: {
      pageId: "string",
      templateId: "string",
      readScope: "PARTICIPANTS",
      readScopePositionId: null,
      editScope: "MANAGERS",
      editScopePositionId: null,
      imageUploadability: "INHERIT",
      attachmentUploadability: "INHERIT",
    },
    message: (data) =>
      `Event template briefing page scopes updated (${data.pageId}, template ${data.templateId})`,
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

  [AuditEventType.CAREER_FLOW_CREATED]: {
    type: AuditEventType.CAREER_FLOW_CREATED,
    data: {
      flowId: "string",
      name: "string",
      slug: "string",
    },
    message: (data) =>
      `Career flow "${data.name}" created with slug "${data.slug}" (${data.flowId})`,
  },

  [AuditEventType.CAREER_FLOW_DUPLICATED]: {
    type: AuditEventType.CAREER_FLOW_DUPLICATED,
    data: {
      flowId: "string",
      name: "string",
      slug: "string",
      sourceFlowId: "string",
      nodeCount: 0,
      edgeCount: 0,
    },
    message: (data) =>
      `Career flow ${data.sourceFlowId} duplicated as "${data.name}" with slug "${data.slug}", ${data.nodeCount} node(s) and ${data.edgeCount} edge(s) (${data.flowId})`,
  },

  [AuditEventType.CAREER_FLOW_RENAMED]: {
    type: AuditEventType.CAREER_FLOW_RENAMED,
    data: {
      flowId: "string",
      previousName: "string",
      name: "string",
      previousSlug: "string",
      slug: "string",
    },
    message: (data) =>
      `Career flow renamed from "${data.previousName}" (${data.previousSlug}) to "${data.name}" (${data.slug}) (${data.flowId})`,
  },

  [AuditEventType.CAREER_FLOWS_REORDERED]: {
    type: AuditEventType.CAREER_FLOWS_REORDERED,
    data: {
      flowIds: ["string"],
    },
    message: (data) => `Career flows reordered to ${data.flowIds.join(", ")}`,
  },

  [AuditEventType.CAREER_FLOW_DELETED]: {
    type: AuditEventType.CAREER_FLOW_DELETED,
    data: {
      flowId: "string",
      name: "string",
      slug: "string",
    },
    message: (data) =>
      `Career flow "${data.name}" (${data.slug}) deleted (${data.flowId})`,
  },

  [AuditEventType.CAREER_FLOW_RESTORED]: {
    type: AuditEventType.CAREER_FLOW_RESTORED,
    data: {
      flowId: "string",
      name: "string",
      slug: "string",
    },
    message: (data) =>
      `Career flow "${data.name}" restored with slug "${data.slug}" (${data.flowId})`,
  },

  [AuditEventType.CAREER_FLOW_ROLE_ACCESS_UPDATED]: {
    type: AuditEventType.CAREER_FLOW_ROLE_ACCESS_UPDATED,
    data: {
      flowId: "string",
      readRoleIds: ["string"],
      updateRoleIds: ["string"],
    },
    message: (data) =>
      `Career flow role access updated to ${data.readRoleIds.length} reading and ${data.updateRoleIds.length} editing role(s) (${data.flowId})`,
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

  [AuditEventType.IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED]: {
    type: AuditEventType.IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED,
    data: {
      count: 0,
    },
    message: (data) =>
      `Archived ${data.count} on-site notification(s) which aren't relevant anymore`,
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

  [AuditEventType.UPLOAD_DELETED]: {
    type: AuditEventType.UPLOAD_DELETED,
    data: {
      uploadId: "string",
      fileName: "file.png",
      mimeType: "image/png",
      uploadedById: "string",
      locations: ["Rollen-Icon: Aufklärer"],
    },
    message: (data) =>
      `Deleted upload "${data.fileName}" (${data.mimeType}) of user ${data.uploadedById}, used at: ${
        data.locations.length > 0 ? data.locations.join(", ") : "nowhere"
      }`,
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

  [AuditEventType.EVENT_CREATED_IN_APP]: {
    type: AuditEventType.EVENT_CREATED_IN_APP,
    data: {
      eventId: "string",
      name: "string",
    },
    message: (data) => `Event "${data.name}" created (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_UPDATED_IN_APP]: {
    type: AuditEventType.EVENT_UPDATED_IN_APP,
    data: {
      eventId: "string",
      changedFields: ["string"],
    },
    message: (data) =>
      `Event updated: ${data.changedFields.join(", ")} (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_DELETED_IN_APP]: {
    type: AuditEventType.EVENT_DELETED_IN_APP,
    data: {
      eventId: "string",
      name: "string",
    },
    message: (data) => `Event "${data.name}" deleted (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_VISIBILITY_UPDATED]: {
    type: AuditEventType.EVENT_VISIBILITY_UPDATED,
    data: {
      eventId: "string",
      visibility: "string",
      roleIds: ["string"],
    },
    message: (data) =>
      `Event visibility set to ${data.visibility}${
        data.roleIds.length > 0 ? ` (roles: ${data.roleIds.join(", ")})` : ""
      } (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_PUBLISHED_TO_DISCORD]: {
    type: AuditEventType.EVENT_PUBLISHED_TO_DISCORD,
    data: {
      eventId: "string",
      discordScheduledEventId: "string",
      discordChannelId: "string",
    },
    message: (data) =>
      `Event published to Discord as ${data.discordScheduledEventId} (${
        data.discordChannelId
          ? `channel ${data.discordChannelId}`
          : "external location"
      }) (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_UNPUBLISHED_FROM_DISCORD]: {
    type: AuditEventType.EVENT_UNPUBLISHED_FROM_DISCORD,
    data: {
      eventId: "string",
      discordScheduledEventId: "string",
    },
    message: (data) =>
      `Event unpublished from Discord (${data.discordScheduledEventId}) (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_DISCORD_PUBLICATION_CLEARED]: {
    type: AuditEventType.EVENT_DISCORD_PUBLICATION_CLEARED,
    data: {
      eventId: "string",
      discordScheduledEventId: "string",
    },
    message: (data) =>
      `Discord no longer knows the published event ${data.discordScheduledEventId}; publish state cleared (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_PARTICIPATION_SIGNED_UP]: {
    type: AuditEventType.EVENT_PARTICIPATION_SIGNED_UP,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} signed up for event ${data.eventId}`,
  },

  [AuditEventType.EVENT_PARTICIPATION_COMMENT_UPDATED]: {
    type: AuditEventType.EVENT_PARTICIPATION_COMMENT_UPDATED,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} updated their participation comment for event ${data.eventId}`,
  },

  [AuditEventType.EVENT_PARTICIPATION_CANCELLED]: {
    type: AuditEventType.EVENT_PARTICIPATION_CANCELLED,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} cancelled their participation in event ${data.eventId}`,
  },

  [AuditEventType.EVENT_PARTICIPANT_ADDED_BY_MANAGER]: {
    type: AuditEventType.EVENT_PARTICIPANT_ADDED_BY_MANAGER,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} was added as a participant to event ${data.eventId} by a manager`,
  },

  [AuditEventType.EVENT_PARTICIPANT_REMOVED_BY_MANAGER]: {
    type: AuditEventType.EVENT_PARTICIPANT_REMOVED_BY_MANAGER,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} was removed as a participant from event ${data.eventId} by a manager`,
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

  [AuditEventType.APP_FAVORITE_ADDED]: {
    type: AuditEventType.APP_FAVORITE_ADDED,
    data: {
      appKey: "string",
      citizenId: "string",
    },
    message: (data) => `App saved as a favorite (${data.appKey})`,
  },

  [AuditEventType.APP_FAVORITE_REMOVED]: {
    type: AuditEventType.APP_FAVORITE_REMOVED,
    data: {
      appKey: "string",
      citizenId: "string",
    },
    message: (data) => `App removed from favorites (${data.appKey})`,
  },

  [AuditEventType.CITIZEN_PROFILE_UPDATED]: {
    type: AuditEventType.CITIZEN_PROFILE_UPDATED,
    data: {
      citizenId: "string",
      timezoneSet: true,
      birthdaySet: true,
    },
    message: (data) =>
      `Citizen ${data.citizenId} updated their profile (time zone ${data.timezoneSet ? "set" : "not set"}, birthday ${data.birthdaySet ? "set" : "not set"})`,
  },

  [AuditEventType.BIRTHDAY_GREETINGS_SENT]: {
    type: AuditEventType.BIRTHDAY_GREETINGS_SENT,
    data: {
      citizenCount: 0,
    },
    message: (data) => `Sent ${data.citizenCount} birthday greeting(s)`,
  },

  [AuditEventType.ONBOARDING_TASK_COMPLETED]: {
    type: AuditEventType.ONBOARDING_TASK_COMPLETED,
    data: {
      citizenId: "string",
      taskKey: "string",
      completionMethod: "string",
    },
    message: (data) =>
      `Onboarding task ${data.taskKey} completed (${
        data.completionMethod === "SKIPPED"
          ? "marked as done manually"
          : "finished the tour"
      })`,
  },
};
