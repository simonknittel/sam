export {
  AuditEventType,
  type AuditEventDataByType,
} from "@sam-monorepo/domain";
import {
  AuditEventType,
  ReadMarkerSubject,
  type AuditEventDataByType,
} from "@sam-monorepo/domain";

/**
 * The app of a type: the groups of the type filter of the system log. The
 * values are the names of the apps. `Other` holds the types that belong to no
 * app.
 */
export enum SystemLogApp {
  Account = "Account",
  Calendar = "Kalender",
  Career = "Karriere",
  Changelog = "Changelog",
  Events = "Events",
  Fleet = "Flotte",
  Iam = "IAM",
  LogAnalyzer = "Log Analyzer",
  Mcp = "MCP",
  Notifications = "Benachrichtigungen",
  Other = "Sonstiges",
  PenaltyPoints = "Strafpunkte",
  ProfitDistribution = "SINcome",
  Silc = "SILC",
  Spynet = "Spynet",
  Statistics = "Statistiken",
  SystemLog = "System Log",
  Tasks = "Tasks",
  Uploads = "Uploads",
  Wiki = "Wiki",
}

const formatDiscordTwoFactorStatus = (enabled: boolean | null) => {
  if (enabled === null) return "unknown";

  return enabled ? "enabled" : "disabled";
};

/** A read access gives the query parameters of the read */
const toReadMessage = (subject: string, data: { arguments: object }) =>
  `${subject}: ${JSON.stringify(data.arguments)}`;

interface AuditEventDefinition<Type extends AuditEventType> {
  type: Type;
  app: SystemLogApp;
  data: AuditEventDataByType[Type];
  message: (data: AuditEventDataByType[Type]) => string;
}

export const AuditEventDefinitions: {
  [Key in AuditEventType]: AuditEventDefinition<Key>;
} = {
  [AuditEventType.USER_LOGIN]: {
    type: AuditEventType.USER_LOGIN,
    app: SystemLogApp.Account,
    data: {
      userId: "string",
    },
    message: (data) => `User ${data.userId} logged in`,
  },

  [AuditEventType.USER_LOGIN_V2]: {
    type: AuditEventType.USER_LOGIN_V2,
    app: SystemLogApp.Account,
    data: {
      userId: "string",
      userEmail: "string",
      userName: "string",
    },
    message: (data) =>
      `User ${data.userName ?? data.userId} (${data.userEmail ?? "unknown email"}) logged in`,
  },

  [AuditEventType.USER_LOGIN_V3]: {
    type: AuditEventType.USER_LOGIN_V3,
    app: SystemLogApp.Account,
    data: {
      userId: "string",
      userEmail: "string",
      userName: "string",
      discordTwoFactorEnabled: true,
    },
    message: (data) =>
      `User ${data.userName ?? data.userId} (${data.userEmail ?? "unknown email"}) logged in (Discord two-factor authentication: ${formatDiscordTwoFactorStatus(data.discordTwoFactorEnabled)})`,
  },

  [AuditEventType.USER_LOGOUT]: {
    type: AuditEventType.USER_LOGOUT,
    app: SystemLogApp.Account,
    data: {
      sessionId: "string",
      userId: "string",
    },
    message: (data) => `User ${data.userId} logged out`,
  },

  [AuditEventType.USER_SESSION_DELETED]: {
    type: AuditEventType.USER_SESSION_DELETED,
    app: SystemLogApp.Account,
    data: {
      sessionId: "string",
      userId: "string",
    },
    message: (data) =>
      `User ${data.userId} deleted their session ${data.sessionId}`,
  },

  [AuditEventType.EXPIRED_AUTHENTICATION_RECORDS_PURGED]: {
    type: AuditEventType.EXPIRED_AUTHENTICATION_RECORDS_PURGED,
    app: SystemLogApp.Account,
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
    app: SystemLogApp.Account,
    data: {
      userId: "string",
    },
    message: (data) => `User ${data.userId} - first visit of the day`,
  },

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2]: {
    type: AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2,
    app: SystemLogApp.Account,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
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
    app: SystemLogApp.Fleet,
    data: {
      manufacturerId: "string",
      name: "string",
    },
    message: (data) => `Manufacturer deleted: "${data.name}"`,
  },

  [AuditEventType.WEB_PUSH_SUBSCRIBED]: {
    type: AuditEventType.WEB_PUSH_SUBSCRIBED,
    app: SystemLogApp.Notifications,
    data: {
      subscriptionId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Web push subscription created for citizen ${data.citizenId}`,
  },

  [AuditEventType.WEB_PUSH_UNSUBSCRIBED]: {
    type: AuditEventType.WEB_PUSH_UNSUBSCRIBED,
    app: SystemLogApp.Notifications,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) =>
      `Unsubscribed from web push notifications (${data.count} subscription(s) removed)`,
  },

  [AuditEventType.ROLE_CREATED]: {
    type: AuditEventType.ROLE_CREATED,
    app: SystemLogApp.Iam,
    data: {
      roleId: "string",
      name: "string",
    },
    message: (data) => `Role created: "${data.name}" (${data.roleId})`,
  },

  [AuditEventType.ROLE_UPDATED]: {
    type: AuditEventType.ROLE_UPDATED,
    app: SystemLogApp.Iam,
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
    app: SystemLogApp.Iam,
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
    app: SystemLogApp.Iam,
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

  [AuditEventType.ROLE_UPDATED_V4]: {
    type: AuditEventType.ROLE_UPDATED_V4,
    app: SystemLogApp.Iam,
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
      previousMaxLevel: 0,
      newMaxLevel: 0,
    },
    message: (data) =>
      `Role updated: "${data.previousName}" → "${data.newName}"`,
  },

  [AuditEventType.ROLE_DELETED]: {
    type: AuditEventType.ROLE_DELETED,
    app: SystemLogApp.Iam,
    data: {
      roleId: "string",
      name: "string",
    },
    message: (data) => `Role deleted: "${data.name}" (${data.roleId})`,
  },

  [AuditEventType.ROLE_PERMISSIONS_UPDATED]: {
    type: AuditEventType.ROLE_PERMISSIONS_UPDATED,
    app: SystemLogApp.Iam,
    data: {
      roleId: "string",
    },
    message: (data) => `Permissions updated for role ${data.roleId}`,
  },

  [AuditEventType.ROLE_PERMISSION_TOGGLED]: {
    type: AuditEventType.ROLE_PERMISSION_TOGGLED,
    app: SystemLogApp.Iam,
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
    app: SystemLogApp.Iam,
    data: {
      roleId: "string",
    },
    message: (data) => `Role inheritance updated for role ${data.roleId}`,
  },

  [AuditEventType.ROLE_INHERITANCE_TOGGLED]: {
    type: AuditEventType.ROLE_INHERITANCE_TOGGLED,
    app: SystemLogApp.Iam,
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
    app: SystemLogApp.Iam,
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
    app: SystemLogApp.Iam,
    data: {
      citizenId: "string",
      roleId: "string",
    },
    message: (data) =>
      `Role assignment deleted for citizen ${data.citizenId} (role: ${data.roleId})`,
  },

  [AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED]: {
    type: AuditEventType.ROLE_ASSIGNMENT_LEVEL_INCREASED,
    app: SystemLogApp.Iam,
    data: {
      citizenId: "string",
      roleId: "string",
    },
    message: (data) =>
      `Role assignment level increased for citizen ${data.citizenId} (role: ${data.roleId})`,
  },

  [AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED]: {
    type: AuditEventType.ROLE_ASSIGNMENT_LEVEL_DECREASED,
    app: SystemLogApp.Iam,
    data: {
      citizenId: "string",
      roleId: "string",
    },
    message: (data) =>
      `Role assignment level decreased for citizen ${data.citizenId} (role: ${data.roleId})`,
  },

  [AuditEventType.ROLE_AUTO_ASSIGNED]: {
    type: AuditEventType.ROLE_AUTO_ASSIGNED,
    app: SystemLogApp.Iam,
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
    app: SystemLogApp.Iam,
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
    app: SystemLogApp.Silc,
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
    app: SystemLogApp.Silc,
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
    app: SystemLogApp.Silc,
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
    app: SystemLogApp.Silc,
    data: {
      roleIds: ["string"],
    },
    message: () => `Salary config updated`,
  },

  [AuditEventType.PENALTY_ENTRY_CREATED]: {
    type: AuditEventType.PENALTY_ENTRY_CREATED,
    app: SystemLogApp.PenaltyPoints,
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
    app: SystemLogApp.PenaltyPoints,
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
    app: SystemLogApp.ProfitDistribution,
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
    app: SystemLogApp.ProfitDistribution,
    data: {
      cycleId: "string",
    },
    message: (data) =>
      `Profit distribution cycle collection ended (${data.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED]: {
    type: AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED,
    app: SystemLogApp.ProfitDistribution,
    data: {
      cycleId: "string",
    },
    message: (data) =>
      `Profit distribution cycle payout started (${data.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED]: {
    type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
    app: SystemLogApp.ProfitDistribution,
    data: {
      cycleId: "string",
    },
    message: (data) =>
      `Profit distribution cycle payout ended (${data.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PARTICIPANT_UPDATED]: {
    type: AuditEventType.PROFIT_CYCLE_PARTICIPANT_UPDATED,
    app: SystemLogApp.ProfitDistribution,
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
    app: SystemLogApp.ProfitDistribution,
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
    app: SystemLogApp.ProfitDistribution,
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
    app: SystemLogApp.Tasks,
    data: {
      taskIds: ["string"],
      visibility: "PUBLIC",
      rewardType: "TEXT",
    },
    message: () => `Task(s) created`,
  },

  [AuditEventType.TASK_COMPLETED]: {
    type: AuditEventType.TASK_COMPLETED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      completionistIds: ["string"],
      rewardType: "TEXT",
    },
    message: (data) => `Task completed (${data.taskId})`,
  },

  [AuditEventType.TASK_DELETED]: {
    type: AuditEventType.TASK_DELETED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      title: "string",
    },
    message: (data) => `Task deleted: "${data.title}" (${data.taskId})`,
  },

  [AuditEventType.TASK_CANCELLED]: {
    type: AuditEventType.TASK_CANCELLED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      title: "string",
    },
    message: (data) => `Task cancelled: "${data.title}" (${data.taskId})`,
  },

  [AuditEventType.TASK_ASSIGNMENTS_UPDATED]: {
    type: AuditEventType.TASK_ASSIGNMENTS_UPDATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
    },
    message: (data) => `Task assignments updated (${data.taskId})`,
  },

  [AuditEventType.TASK_TITLE_UPDATED]: {
    type: AuditEventType.TASK_TITLE_UPDATED,
    app: SystemLogApp.Tasks,
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
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      previousDescription: "Old description",
      newDescription: "New description",
    },
    message: (data) => `Task description updated (${data.taskId})`,
  },

  [AuditEventType.TASK_EXPIRES_AT_UPDATED]: {
    type: AuditEventType.TASK_EXPIRES_AT_UPDATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      previousExpiresAt: null,
      newExpiresAt: new Date(),
    },
    message: (data) => `Task expiry updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REPEATABLE_UPDATED]: {
    type: AuditEventType.TASK_REPEATABLE_UPDATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      previousRepeatable: 1,
      newRepeatable: 2,
    },
    message: (data) => `Task repeatable updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REQUIRED_ROLES_UPDATED]: {
    type: AuditEventType.TASK_REQUIRED_ROLES_UPDATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
    },
    message: (data) => `Task required roles updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REWARD_TEXT_UPDATED]: {
    type: AuditEventType.TASK_REWARD_TEXT_UPDATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      previousValue: "Old reward",
      newValue: "New reward",
    },
    message: (data) => `Task reward text updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REWARD_SILC_UPDATED]: {
    type: AuditEventType.TASK_REWARD_SILC_UPDATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      previousValue: 10,
      newValue: 20,
    },
    message: (data) => `Task SILC reward updated (${data.taskId})`,
  },

  [AuditEventType.TASK_REWARD_NEW_SILC_UPDATED]: {
    type: AuditEventType.TASK_REWARD_NEW_SILC_UPDATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      previousValue: 100,
      newValue: 200,
    },
    message: (data) => `Task new SILC reward updated (${data.taskId})`,
  },

  [AuditEventType.TASK_SELF_ASSIGNMENT_CREATED]: {
    type: AuditEventType.TASK_SELF_ASSIGNMENT_CREATED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Task self-assignment created (task: ${data.taskId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.TASK_SELF_ASSIGNMENT_DELETED]: {
    type: AuditEventType.TASK_SELF_ASSIGNMENT_DELETED,
    app: SystemLogApp.Tasks,
    data: {
      taskId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Task self-assignment deleted (task: ${data.taskId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.EVENT_POSITION_CREATED]: {
    type: AuditEventType.EVENT_POSITION_CREATED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      managerIds: ["string"],
    },
    message: (data) => `Event managers assigned (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_MANAGER_REMOVED]: {
    type: AuditEventType.EVENT_MANAGER_REMOVED,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      managerId: "string",
    },
    message: (data) =>
      `Event manager removed (event: ${data.eventId}, manager: ${data.managerId})`,
  },

  [AuditEventType.EVENT_LINEUP_STATUS_CHANGED]: {
    type: AuditEventType.EVENT_LINEUP_STATUS_CHANGED,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      enabled: true,
    },
    message: (data) =>
      `Event lineup ${data.enabled ? "enabled" : "disabled"} (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_PARTICIPATION_STATUS_CHANGED]: {
    type: AuditEventType.EVENT_PARTICIPATION_STATUS_CHANGED,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      enabled: false,
      cancelledParticipantCount: 0,
      clearedPositionCount: 0,
      deletedApplicationCount: 0,
    },
    message: (data) =>
      data.enabled
        ? `Event participation enabled (event: ${data.eventId})`
        : `Event participation disabled (event: ${data.eventId}, cancelled sign-ups: ${data.cancelledParticipantCount}, cleared positions: ${data.clearedPositionCount}, deleted applications: ${data.deletedApplicationCount})`,
  },

  [AuditEventType.EVENT_LINEUP_ORDER_CHANGED]: {
    type: AuditEventType.EVENT_LINEUP_ORDER_CHANGED,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
    },
    message: (data) => `Event lineup order changed (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED]: {
    type: AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      sourceEventId: "string",
      targetEventId: "string",
    },
    message: (data) =>
      `Event lineup copied from ${data.sourceEventId} to ${data.targetEventId}`,
  },

  [AuditEventType.EVENT_POSITION_COPIED]: {
    type: AuditEventType.EVENT_POSITION_COPIED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      templateId: "string",
    },
    message: (data) =>
      `Event template lineup order changed (template: ${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_POSITION_COPIED]: {
    type: AuditEventType.EVENT_TEMPLATE_POSITION_COPIED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      templateId: "string",
      name: "string",
    },
    message: (data) =>
      `Event template "${data.name}" created (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_UPDATED]: {
    type: AuditEventType.EVENT_TEMPLATE_UPDATED,
    app: SystemLogApp.Events,
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

  [AuditEventType.EVENT_TEMPLATE_UPDATED_V2]: {
    type: AuditEventType.EVENT_TEMPLATE_UPDATED_V2,
    app: SystemLogApp.Events,
    data: {
      templateId: "string",
      previousName: "string",
      name: "string",
      visibility: "PUBLIC",
      visibilityRoleIds: ["string"],
      coverImageChanged: false,
      participationEnabled: true,
    },
    message: (data) =>
      `Event template "${data.name}" updated (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_DUPLICATED]: {
    type: AuditEventType.EVENT_TEMPLATE_DUPLICATED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      templateId: "string",
      name: "string",
    },
    message: (data) =>
      `Event template "${data.name}" deleted (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_RESTORED]: {
    type: AuditEventType.EVENT_TEMPLATE_RESTORED,
    app: SystemLogApp.Events,
    data: {
      templateId: "string",
      name: "string",
    },
    message: (data) =>
      `Event template "${data.name}" restored (${data.templateId})`,
  },

  [AuditEventType.EVENT_TEMPLATE_ROLE_ACCESS_UPDATED]: {
    type: AuditEventType.EVENT_TEMPLATE_ROLE_ACCESS_UPDATED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Spynet,
    data: {
      citizenId: "string",
      spectrumId: "string",
    },
    message: (data) =>
      `Citizen created: ${data.spectrumId} (${data.citizenId})`,
  },

  [AuditEventType.CITIZEN_DELETED]: {
    type: AuditEventType.CITIZEN_DELETED,
    app: SystemLogApp.Spynet,
    data: {
      citizenId: "string",
      spectrumId: "string",
    },
    message: (data) =>
      `Citizen deleted: ${data.spectrumId} (${data.citizenId})`,
  },

  [AuditEventType.ENTITY_LOG_CREATED]: {
    type: AuditEventType.ENTITY_LOG_CREATED,
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
    data: {
      organizationId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Organization membership removed (org: ${data.organizationId}, citizen: ${data.citizenId})`,
  },

  [AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED]: {
    type: AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED,
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
    data: {
      classificationLevelId: "string",
      name: "string",
    },
    message: (data) => `Classification level created: "${data.name}"`,
  },

  [AuditEventType.CLASSIFICATION_LEVEL_UPDATED]: {
    type: AuditEventType.CLASSIFICATION_LEVEL_UPDATED,
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
    data: {
      classificationLevelId: "string",
      name: "string",
    },
    message: (data) => `Classification level deleted: "${data.name}"`,
  },

  [AuditEventType.NOTE_TYPE_CREATED]: {
    type: AuditEventType.NOTE_TYPE_CREATED,
    app: SystemLogApp.Spynet,
    data: {
      noteTypeId: "string",
      name: "string",
    },
    message: (data) => `Note type created: "${data.name}"`,
  },

  [AuditEventType.NOTE_TYPE_UPDATED]: {
    type: AuditEventType.NOTE_TYPE_UPDATED,
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Spynet,
    data: {
      noteTypeId: "string",
      name: "string",
    },
    message: (data) => `Note type deleted: "${data.name}"`,
  },

  [AuditEventType.UPLOAD_CREATED]: {
    type: AuditEventType.UPLOAD_CREATED,
    app: SystemLogApp.Uploads,
    data: {
      uploadId: "string",
      fileName: "file.png",
      mimeType: "image/png",
    },
    message: (data) => `File uploaded: "${data.fileName}" (${data.mimeType})`,
  },

  [AuditEventType.RESOURCE_IMAGE_ASSIGNED]: {
    type: AuditEventType.RESOURCE_IMAGE_ASSIGNED,
    app: SystemLogApp.Uploads,
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
    app: SystemLogApp.Account,
    data: {
      userId: "string",
    },
    message: (data) => `Email verified for user ${data.userId}`,
  },

  [AuditEventType.EMAIL_CONFIRMATION_REQUESTED]: {
    type: AuditEventType.EMAIL_CONFIRMATION_REQUESTED,
    app: SystemLogApp.Account,
    data: {
      userId: "string",
      email: "user@example.com",
    },
    message: (data) =>
      `Email confirmation requested for user ${data.userId} (${data.email})`,
  },

  [AuditEventType.EMAIL_VERIFIED_VIA_TOKEN]: {
    type: AuditEventType.EMAIL_VERIFIED_VIA_TOKEN,
    app: SystemLogApp.Account,
    data: {
      userId: "string",
    },
    message: (data) => `Email verified via token for user ${data.userId}`,
  },

  [AuditEventType.USER_BANNED]: {
    type: AuditEventType.USER_BANNED,
    app: SystemLogApp.Iam,
    data: {
      userId: "string",
      reason: "string",
    },
    message: (data) =>
      `User ${data.userId} banned${data.reason ? ` (reason: ${data.reason})` : ""}`,
  },

  [AuditEventType.USER_UNBANNED]: {
    type: AuditEventType.USER_UNBANNED,
    app: SystemLogApp.Iam,
    data: {
      userId: "string",
    },
    message: (data) => `User ${data.userId} unbanned`,
  },

  [AuditEventType.USER_LOGIN_BLOCKED]: {
    type: AuditEventType.USER_LOGIN_BLOCKED,
    app: SystemLogApp.Iam,
    data: {
      userId: "string",
    },
    message: (data) => `Login attempt of banned user ${data.userId} blocked`,
  },

  [AuditEventType.WIKI_PAGE_CREATED]: {
    type: AuditEventType.WIKI_PAGE_CREATED,
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      title: "string",
      parentId: null,
    },
    message: (data) => `Wiki page created: "${data.title}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_UPDATED,
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
    },
    message: (data) => `Wiki page content updated (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_RENAMED]: {
    type: AuditEventType.WIKI_PAGE_RENAMED,
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      previousParentId: null,
      newParentId: "string",
    },
    message: (data) => `Wiki page moved (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_DUPLICATED]: {
    type: AuditEventType.WIKI_PAGE_DUPLICATED,
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      title: "string",
      subtreePageIds: ["string"],
    },
    message: (data) => `Wiki page deleted: "${data.title}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_RESTORED]: {
    type: AuditEventType.WIKI_PAGE_RESTORED,
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      title: "string",
      restoredPageIds: ["string"],
    },
    message: (data) => `Wiki page restored: "${data.title}" (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_DESTROYED]: {
    type: AuditEventType.WIKI_PAGE_DESTROYED,
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
    data: {
      setting: "string",
      value: "string",
    },
    message: (data) => `Wiki settings updated: ${data.setting}`,
  },

  [AuditEventType.WIKI_PAGE_REPORTED]: {
    type: AuditEventType.WIKI_PAGE_REPORTED,
    app: SystemLogApp.Wiki,
    data: {
      reportId: "string",
      pageId: "string",
      uploadId: "string",
    },
    message: (data) => `Wiki page reported (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_REPORT_RESOLVED]: {
    type: AuditEventType.WIKI_PAGE_REPORT_RESOLVED,
    app: SystemLogApp.Wiki,
    data: {
      reportId: "string",
      pageId: "string",
    },
    message: (data) => `Wiki page report resolved (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_SNAPSHOT_RESTORED]: {
    type: AuditEventType.WIKI_PAGE_SNAPSHOT_RESTORED,
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      snapshotId: "string",
    },
    message: (data) => `Wiki page snapshot restored (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_CONTENT_IMPORTED]: {
    type: AuditEventType.WIKI_PAGE_CONTENT_IMPORTED,
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
    },
    message: (data) => `Wiki page content imported (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_SIDEBAR_MODE_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_SIDEBAR_MODE_UPDATED,
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      addedTagNames: ["string"],
      removedTagNames: [],
    },
    message: (data) => `Wiki page tags updated (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_ICON_UPDATED]: {
    type: AuditEventType.WIKI_PAGE_ICON_UPDATED,
    app: SystemLogApp.Wiki,
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
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      citizenId: "string",
    },
    message: (data) => `Wiki page saved as a favorite (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_FAVORITE_REMOVED]: {
    type: AuditEventType.WIKI_PAGE_FAVORITE_REMOVED,
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      citizenId: "string",
    },
    message: (data) => `Wiki page removed from favorites (${data.pageId})`,
  },

  [AuditEventType.WIKI_PAGE_VISITED]: {
    type: AuditEventType.WIKI_PAGE_VISITED,
    app: SystemLogApp.Wiki,
    data: {
      pageId: "string",
      citizenId: "string",
    },
    message: (data) => `Wiki page visited (${data.pageId})`,
  },

  [AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT]: {
    type: AuditEventType.WIKI_CITIZEN_MENTIONS_SWEPT,
    app: SystemLogApp.Wiki,
    data: {
      notifiedCount: 0,
      suppressedCount: 0,
    },
    message: (data) =>
      `Swept pending wiki citizen mentions: ${data.notifiedCount} notified, ${data.suppressedCount} suppressed`,
  },

  [AuditEventType.TRASHED_WIKI_PAGES_PURGED]: {
    type: AuditEventType.TRASHED_WIKI_PAGES_PURGED,
    app: SystemLogApp.Wiki,
    data: {
      count: 0,
    },
    message: (data) => `Permanently deleted ${data.count} trashed wiki page(s)`,
  },

  [AuditEventType.ORPHANED_WIKI_TAGS_PURGED]: {
    type: AuditEventType.ORPHANED_WIKI_TAGS_PURGED,
    app: SystemLogApp.Wiki,
    data: {
      count: 0,
    },
    message: (data) => `Deleted ${data.count} orphaned wiki tag(s)`,
  },

  [AuditEventType.MANUFACTURER_CREATED]: {
    type: AuditEventType.MANUFACTURER_CREATED,
    app: SystemLogApp.Fleet,
    data: {
      manufacturerId: "string",
      name: "string",
    },
    message: (data) =>
      `Manufacturer ${data.name} created (${data.manufacturerId})`,
  },

  [AuditEventType.SERIES_CREATED]: {
    type: AuditEventType.SERIES_CREATED,
    app: SystemLogApp.Fleet,
    data: {
      seriesId: "string",
      name: "string",
      manufacturerId: "string",
    },
    message: (data) => `Series ${data.name} created (${data.seriesId})`,
  },

  [AuditEventType.ENTITY_LOG_CONFIRMED]: {
    type: AuditEventType.ENTITY_LOG_CONFIRMED,
    app: SystemLogApp.Spynet,
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
    app: SystemLogApp.Career,
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
    app: SystemLogApp.Career,
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
    app: SystemLogApp.Career,
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
    app: SystemLogApp.Career,
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
    app: SystemLogApp.Career,
    data: {
      flowIds: ["string"],
    },
    message: (data) => `Career flows reordered to ${data.flowIds.join(", ")}`,
  },

  [AuditEventType.CAREER_FLOW_DELETED]: {
    type: AuditEventType.CAREER_FLOW_DELETED,
    app: SystemLogApp.Career,
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
    app: SystemLogApp.Career,
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
    app: SystemLogApp.Career,
    data: {
      flowId: "string",
      readRoleIds: ["string"],
      updateRoleIds: ["string"],
    },
    message: (data) =>
      `Career flow role access updated to ${data.readRoleIds.length} reading and ${data.updateRoleIds.length} editing role(s) (${data.flowId})`,
  },

  [AuditEventType.IAM_SETTING_UPDATED]: {
    type: AuditEventType.IAM_SETTING_UPDATED,
    app: SystemLogApp.Iam,
    data: {
      key: "string",
      value: "string",
    },
    message: (data) => `IAM setting updated: ${data.key}`,
  },

  [AuditEventType.SILC_SETTING_UPDATED]: {
    type: AuditEventType.SILC_SETTING_UPDATED,
    app: SystemLogApp.Silc,
    data: {
      key: "string",
      value: "string",
    },
    message: (data) => `SILC setting ${data.key} set to ${data.value}`,
  },

  [AuditEventType.SILC_ALL_EXPIRED]: {
    type: AuditEventType.SILC_ALL_EXPIRED,
    app: SystemLogApp.Silc,
    data: {
      citizenCount: 0,
      expiredValue: 0,
    },
    message: (data) =>
      `Expired ${data.expiredValue} SILC of ${data.citizenCount} citizen(s)`,
  },

  [AuditEventType.SILC_BALANCES_REFRESHED]: {
    type: AuditEventType.SILC_BALANCES_REFRESHED,
    app: SystemLogApp.Silc,
    data: {
      citizenCount: 0,
    },
    message: (data) =>
      `Recalculated the SILC balances of ${data.citizenCount} citizen(s)`,
  },

  [AuditEventType.ROLE_SALARIES_DISBURSED]: {
    type: AuditEventType.ROLE_SALARIES_DISBURSED,
    app: SystemLogApp.Silc,
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
    app: SystemLogApp.Notifications,
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
    app: SystemLogApp.Notifications,
    data: {
      count: 0,
      notificationTypes: ["string"],
    },
    message: (data) =>
      `Created ${data.count} on-site notification(s) of type ${data.notificationTypes.join(", ")}`,
  },

  [AuditEventType.ON_SITE_NOTIFICATIONS_READ]: {
    type: AuditEventType.ON_SITE_NOTIFICATIONS_READ,
    app: SystemLogApp.Notifications,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) => `Marked ${data.count} notification(s) as read`,
  },

  [AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ]: {
    type: AuditEventType.ON_SITE_NOTIFICATIONS_ALL_READ,
    app: SystemLogApp.Notifications,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) =>
      `Marked all ${data.count} unread notification(s) as read`,
  },

  [AuditEventType.ON_SITE_NOTIFICATION_UNREAD]: {
    type: AuditEventType.ON_SITE_NOTIFICATION_UNREAD,
    app: SystemLogApp.Notifications,
    data: {
      citizenId: "string",
      notificationId: "string",
    },
    message: (data) => `Marked notification ${data.notificationId} as unread`,
  },

  [AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED]: {
    type: AuditEventType.ON_SITE_NOTIFICATION_ARCHIVED,
    app: SystemLogApp.Notifications,
    data: {
      citizenId: "string",
      notificationId: "string",
    },
    message: (data) => `Archived notification ${data.notificationId}`,
  },

  [AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED]: {
    type: AuditEventType.ON_SITE_NOTIFICATIONS_READ_ARCHIVED,
    app: SystemLogApp.Notifications,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) => `Archived ${data.count} read notification(s)`,
  },

  [AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED]: {
    type: AuditEventType.ON_SITE_NOTIFICATION_UNARCHIVED,
    app: SystemLogApp.Notifications,
    data: {
      citizenId: "string",
      notificationId: "string",
    },
    message: (data) => `Restored notification ${data.notificationId}`,
  },

  [AuditEventType.IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED]: {
    type: AuditEventType.IRRELEVANT_ON_SITE_NOTIFICATIONS_ARCHIVED,
    app: SystemLogApp.Notifications,
    data: {
      count: 0,
    },
    message: (data) =>
      `Archived ${data.count} on-site notification(s) which aren't relevant anymore`,
  },

  [AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED]: {
    type: AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED,
    app: SystemLogApp.Notifications,
    data: {
      count: 0,
      reason: "expired",
    },
    message: (data) =>
      `Deleted ${data.count} ${data.reason} Web Push subscription(s)`,
  },

  [AuditEventType.CHANGELOG_ENTRIES_SEEN]: {
    type: AuditEventType.CHANGELOG_ENTRIES_SEEN,
    app: SystemLogApp.Changelog,
    data: {
      citizenId: "string",
      count: 0,
    },
    message: (data) => `Read ${data.count} new changelog entry/entries`,
  },

  [AuditEventType.UNUSED_UPLOADS_DELETED]: {
    type: AuditEventType.UNUSED_UPLOADS_DELETED,
    app: SystemLogApp.Uploads,
    data: {
      databaseCount: 0,
      bucketCount: 0,
    },
    message: (data) =>
      `Deleted ${data.databaseCount} unused upload(s) and ${data.bucketCount} orphaned bucket object(s)`,
  },

  [AuditEventType.UPLOAD_DELETED]: {
    type: AuditEventType.UPLOAD_DELETED,
    app: SystemLogApp.Uploads,
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

  [AuditEventType.UPLOAD_DELETED_V2]: {
    type: AuditEventType.UPLOAD_DELETED_V2,
    app: SystemLogApp.Uploads,
    data: {
      uploadId: "string",
      fileName: "file.png",
      mimeType: "image/png",
      uploadedById: "string",
      locations: ["Rollen-Icon: Aufklärer"],
    },
    message: (data) =>
      `Deleted upload "${data.fileName}" (${data.mimeType}) of ${
        data.uploadedById ? `user ${data.uploadedById}` : "an unknown user"
      }, used at: ${
        data.locations.length > 0 ? data.locations.join(", ") : "nowhere"
      }`,
  },

  [AuditEventType.EVENT_IMPORTED_FROM_DISCORD]: {
    type: AuditEventType.EVENT_IMPORTED_FROM_DISCORD,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      eventIds: ["string"],
    },
    message: (data) =>
      `Deleted ${data.eventIds.length} event(s) cancelled on Discord`,
  },

  [AuditEventType.EVENT_PARTICIPANTS_SYNCED]: {
    type: AuditEventType.EVENT_PARTICIPANTS_SYNCED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      name: "string",
    },
    message: (data) => `Event "${data.name}" created (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_UPDATED_IN_APP]: {
    type: AuditEventType.EVENT_UPDATED_IN_APP,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      changedFields: ["string"],
    },
    message: (data) =>
      `Event updated: ${data.changedFields.join(", ")} (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_DELETED_IN_APP]: {
    type: AuditEventType.EVENT_DELETED_IN_APP,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      name: "string",
    },
    message: (data) => `Event "${data.name}" deleted (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_VISIBILITY_UPDATED]: {
    type: AuditEventType.EVENT_VISIBILITY_UPDATED,
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
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
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      discordScheduledEventId: "string",
    },
    message: (data) =>
      `Event unpublished from Discord (${data.discordScheduledEventId}) (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_DISCORD_PUBLICATION_CLEARED]: {
    type: AuditEventType.EVENT_DISCORD_PUBLICATION_CLEARED,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      discordScheduledEventId: "string",
    },
    message: (data) =>
      `Discord no longer knows the published event ${data.discordScheduledEventId}; publish state cleared (event: ${data.eventId})`,
  },

  [AuditEventType.EVENT_PARTICIPATION_SIGNED_UP]: {
    type: AuditEventType.EVENT_PARTICIPATION_SIGNED_UP,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} signed up for event ${data.eventId}`,
  },

  [AuditEventType.EVENT_PARTICIPATION_COMMENT_UPDATED]: {
    type: AuditEventType.EVENT_PARTICIPATION_COMMENT_UPDATED,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} updated their participation comment for event ${data.eventId}`,
  },

  [AuditEventType.EVENT_PARTICIPATION_CANCELLED]: {
    type: AuditEventType.EVENT_PARTICIPATION_CANCELLED,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} cancelled their participation in event ${data.eventId}`,
  },

  [AuditEventType.EVENT_PARTICIPANT_ADDED_BY_MANAGER]: {
    type: AuditEventType.EVENT_PARTICIPANT_ADDED_BY_MANAGER,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} was added as a participant to event ${data.eventId} by a manager`,
  },

  [AuditEventType.EVENT_PARTICIPANT_REMOVED_BY_MANAGER]: {
    type: AuditEventType.EVENT_PARTICIPANT_REMOVED_BY_MANAGER,
    app: SystemLogApp.Events,
    data: {
      eventId: "string",
      citizenId: "string",
    },
    message: (data) =>
      `Citizen ${data.citizenId} was removed as a participant from event ${data.eventId} by a manager`,
  },

  [AuditEventType.CITIZENS_PER_ROLE_COUNTED]: {
    type: AuditEventType.CITIZENS_PER_ROLE_COUNTED,
    app: SystemLogApp.Statistics,
    data: {
      roleCount: 0,
    },
    message: (data) =>
      `Saved the citizen count statistic of ${data.roleCount} role(s)`,
  },

  [AuditEventType.SHIPS_PER_VARIANT_COUNTED]: {
    type: AuditEventType.SHIPS_PER_VARIANT_COUNTED,
    app: SystemLogApp.Statistics,
    data: {
      variantCount: 0,
    },
    message: (data) =>
      `Saved the ship count statistic of ${data.variantCount} variant(s)`,
  },

  [AuditEventType.UNIQUE_LOGINS_COUNTED]: {
    type: AuditEventType.UNIQUE_LOGINS_COUNTED,
    app: SystemLogApp.Statistics,
    data: {
      date: "string",
      count: 0,
    },
    message: (data) => `Counted ${data.count} unique login(s) on ${data.date}`,
  },

  [AuditEventType.MCP_USAGE_COUNTED]: {
    type: AuditEventType.MCP_USAGE_COUNTED,
    app: SystemLogApp.Statistics,
    data: {
      date: "string",
      count: 0,
    },
    message: (data) =>
      `Counted ${data.count} system log entries through the MCP server on ${data.date}`,
  },

  [AuditEventType.APP_FAVORITE_ADDED]: {
    type: AuditEventType.APP_FAVORITE_ADDED,
    app: SystemLogApp.Other,
    data: {
      appKey: "string",
      citizenId: "string",
    },
    message: (data) => `App saved as a favorite (${data.appKey})`,
  },

  [AuditEventType.APP_FAVORITE_REMOVED]: {
    type: AuditEventType.APP_FAVORITE_REMOVED,
    app: SystemLogApp.Other,
    data: {
      appKey: "string",
      citizenId: "string",
    },
    message: (data) => `App removed from favorites (${data.appKey})`,
  },

  [AuditEventType.CITIZEN_PROFILE_UPDATED]: {
    type: AuditEventType.CITIZEN_PROFILE_UPDATED,
    app: SystemLogApp.Account,
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
    app: SystemLogApp.Other,
    data: {
      citizenCount: 0,
    },
    message: (data) => `Sent ${data.citizenCount} birthday greeting(s)`,
  },

  [AuditEventType.NEW_YEAR_GREETINGS_SENT]: {
    type: AuditEventType.NEW_YEAR_GREETINGS_SENT,
    app: SystemLogApp.Other,
    data: {
      citizenCount: 0,
    },
    message: (data) => `Sent ${data.citizenCount} New Year greeting(s)`,
  },

  [AuditEventType.ONBOARDING_TASK_COMPLETED]: {
    type: AuditEventType.ONBOARDING_TASK_COMPLETED,
    app: SystemLogApp.Other,
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

  [AuditEventType.LOG_ANALYZER_ENTRIES_UPLOADED]: {
    type: AuditEventType.LOG_ANALYZER_ENTRIES_UPLOADED,
    app: SystemLogApp.LogAnalyzer,
    data: {
      citizenId: "string",
      entryCount: 0,
      newEntryCount: 0,
    },
    message: (data) =>
      `Citizen ${data.citizenId} uploaded ${data.entryCount} log analyzer entries (${data.newEntryCount} new)`,
  },

  [AuditEventType.SEASONAL_THEME_SETTINGS_UPDATED]: {
    type: AuditEventType.SEASONAL_THEME_SETTINGS_UPDATED,
    app: SystemLogApp.Account,
    data: {
      citizenId: "string",
      enabled: ["string"],
      disabled: [],
    },
    message: (data) =>
      `Citizen ${data.citizenId} updated their seasonal theme settings (switched on: ${
        data.enabled.join(", ") || "none"
      }, switched off: ${data.disabled.join(", ") || "none"})`,
  },

  [AuditEventType.CALENDAR_ENTRY_TYPE_SETTINGS_UPDATED]: {
    type: AuditEventType.CALENDAR_ENTRY_TYPE_SETTINGS_UPDATED,
    app: SystemLogApp.Calendar,
    data: {
      citizenId: "string",
      enabled: ["string"],
      disabled: [],
    },
    message: (data) =>
      `Citizen ${data.citizenId} updated their calendar entry types (switched on: ${
        data.enabled.join(", ") || "none"
      }, switched off: ${data.disabled.join(", ") || "none"})`,
  },

  [AuditEventType.ASSUME_USER_STARTED]: {
    type: AuditEventType.ASSUME_USER_STARTED,
    app: SystemLogApp.Iam,
    data: {
      assumedUserId: "string",
      assumedUserName: "string",
    },
    message: (data) =>
      `Admin started to assume user ${data.assumedUserName ?? data.assumedUserId}`,
  },

  [AuditEventType.ASSUME_USER_ENDED]: {
    type: AuditEventType.ASSUME_USER_ENDED,
    app: SystemLogApp.Iam,
    data: {
      assumedUserId: "string",
      assumedUserName: "string",
    },
    message: (data) =>
      `Admin stopped to assume user ${data.assumedUserName ?? data.assumedUserId}`,
  },

  [AuditEventType.READ_MARKER_CREATED]: {
    type: AuditEventType.READ_MARKER_CREATED,
    app: SystemLogApp.Other,
    data: {
      citizenId: "string",
      subject: ReadMarkerSubject.Task,
      subjectId: "string",
    },
    message: (data) => `Marked ${data.subject} as read (${data.subjectId})`,
  },

  [AuditEventType.CITIZEN_WELCOMED]: {
    type: AuditEventType.CITIZEN_WELCOMED,
    app: SystemLogApp.Other,
    data: {
      citizenId: "string",
    },
    message: (data) =>
      `Welcomed citizen ${data.citizenId} on their first visit with access to the app`,
  },

  [AuditEventType.OAUTH_GRANT_CREATED]: {
    type: AuditEventType.OAUTH_GRANT_CREATED,
    app: SystemLogApp.Mcp,
    data: {
      grantId: "string",
      clientId: "string",
      clientName: "string",
    },
    message: (data) =>
      `OAuth client ${data.clientName} connected (${data.clientId}, grant ${data.grantId})`,
  },

  [AuditEventType.OAUTH_GRANT_REVOKED]: {
    type: AuditEventType.OAUTH_GRANT_REVOKED,
    app: SystemLogApp.Mcp,
    data: {
      grantId: "string",
      clientId: "string",
    },
    message: (data) =>
      `OAuth client disconnected (${data.clientId}, grant ${data.grantId})`,
  },

  [AuditEventType.OAUTH_GRANT_ADMIN_MODE_UPDATED]: {
    type: AuditEventType.OAUTH_GRANT_ADMIN_MODE_UPDATED,
    app: SystemLogApp.Mcp,
    data: {
      grantId: "string",
      clientId: "string",
      enabled: true,
    },
    message: (data) =>
      `Admin mode ${data.enabled ? "enabled" : "disabled"} for OAuth client ${data.clientId} (grant ${data.grantId})`,
  },

  [AuditEventType.MCP_TOOL_SETTING_UPDATED]: {
    type: AuditEventType.MCP_TOOL_SETTING_UPDATED,
    app: SystemLogApp.Mcp,
    data: {
      toolName: "string",
      enabled: true,
    },
    message: (data) =>
      `MCP tool ${data.toolName} ${data.enabled ? "enabled" : "disabled"}`,
  },

  [AuditEventType.OAUTH_RECORDS_PURGED]: {
    type: AuditEventType.OAUTH_RECORDS_PURGED,
    app: SystemLogApp.Mcp,
    data: {
      authorizationCodeCount: 0,
      refreshTokenCount: 0,
      grantCount: 0,
      clientMetadataCount: 0,
    },
    message: (data) =>
      `Deleted ${data.authorizationCodeCount} expired OAuth authorization code(s), ${data.refreshTokenCount} expired OAuth refresh token(s), ${data.grantCount} OAuth grant(s) without a token and ${data.clientMetadataCount} expired OAuth client metadata document(s)`,
  },

  [AuditEventType.MANUAL_NOTIFICATION_CREATED]: {
    type: AuditEventType.MANUAL_NOTIFICATION_CREATED,
    app: SystemLogApp.Notifications,
    data: {
      manualNotificationId: "string",
      title: "string",
      receiverCitizenIds: ["string"],
      receiverRoleIds: ["string"],
    },
    message: (data) => `Manual notification "${data.title}" sent`,
  },

  [AuditEventType.OAUTH_GRANT_CREATED_V2]: {
    type: AuditEventType.OAUTH_GRANT_CREATED_V2,
    app: SystemLogApp.Mcp,
    data: {
      grantId: "string",
      clientId: "string",
      clientName: "string",
      customName: "string",
      disabledToolNames: ["string"],
    },
    message: (data) =>
      `OAuth client ${data.clientName} connected (${data.clientId}, grant ${data.grantId})${data.customName ? ` as ${data.customName}` : ""}${data.disabledToolNames.length > 0 ? ` with ${data.disabledToolNames.length} disabled MCP tool(s)` : ""}`,
  },

  [AuditEventType.OAUTH_GRANT_RENAMED]: {
    type: AuditEventType.OAUTH_GRANT_RENAMED,
    app: SystemLogApp.Mcp,
    data: {
      grantId: "string",
      clientId: "string",
      customName: "string",
    },
    message: (data) =>
      data.customName
        ? `OAuth client renamed to ${data.customName} (${data.clientId}, grant ${data.grantId})`
        : `Own name of OAuth client removed (${data.clientId}, grant ${data.grantId})`,
  },

  [AuditEventType.MCP_TOOL_SETTING_UPDATED_V2]: {
    type: AuditEventType.MCP_TOOL_SETTING_UPDATED_V2,
    app: SystemLogApp.Mcp,
    data: {
      grantId: "string",
      clientId: "string",
      toolName: "string",
      enabled: true,
    },
    message: (data) =>
      `MCP tool ${data.toolName} ${data.enabled ? "enabled" : "disabled"} for OAuth client ${data.clientId} (grant ${data.grantId})`,
  },

  [AuditEventType.READ_MARKERS_CREATED]: {
    type: AuditEventType.READ_MARKERS_CREATED,
    app: SystemLogApp.Other,
    data: {
      citizenId: "string",
      markers: [{ subject: ReadMarkerSubject.Task, subjectId: "string" }],
    },
    message: (data) =>
      `Marked ${data.markers.length} item(s) as read: ${data.markers.map((marker) => `${marker.subject} ${marker.subjectId}`).join(", ")}`,
  },

  [AuditEventType.ROLE_TAG_CREATED]: {
    type: AuditEventType.ROLE_TAG_CREATED,
    app: SystemLogApp.Iam,
    data: {
      tagId: "string",
      name: "string",
      description: null,
    },
    message: (data) => `Role tag created: "${data.name}" (${data.tagId})`,
  },

  [AuditEventType.ROLE_TAG_UPDATED]: {
    type: AuditEventType.ROLE_TAG_UPDATED,
    app: SystemLogApp.Iam,
    data: {
      tagId: "string",
      previousName: "string",
      newName: "string",
      previousDescription: null,
      newDescription: null,
    },
    message: (data) =>
      `Role tag updated: "${data.previousName}" → "${data.newName}" (${data.tagId})`,
  },

  [AuditEventType.ROLE_TAG_DELETED]: {
    type: AuditEventType.ROLE_TAG_DELETED,
    app: SystemLogApp.Iam,
    data: {
      tagId: "string",
      name: "string",
      roleIds: ["string"],
    },
    message: (data) =>
      `Role tag deleted: "${data.name}" (${data.tagId}), removed from ${data.roleIds.length} role(s)`,
  },

  [AuditEventType.ROLE_TAG_ASSIGNMENTS_UPDATED]: {
    type: AuditEventType.ROLE_TAG_ASSIGNMENTS_UPDATED,
    app: SystemLogApp.Iam,
    data: {
      added: [{ roleId: "string", tagId: "string" }],
      removed: [{ roleId: "string", tagId: "string" }],
    },
    message: (data) =>
      `Role tags updated: ${data.added.length} link(s) added, ${data.removed.length} link(s) removed`,
  },

  [AuditEventType.CURRENT_USER_READ]: {
    type: AuditEventType.CURRENT_USER_READ,
    app: SystemLogApp.Account,
    data: { arguments: {} },
    message: (data) => toReadMessage("Current user read", data),
  },

  [AuditEventType.USER_READ]: {
    type: AuditEventType.USER_READ,
    app: SystemLogApp.Iam,
    data: { arguments: {} },
    message: (data) => toReadMessage("User read", data),
  },

  [AuditEventType.USERS_LISTED]: {
    type: AuditEventType.USERS_LISTED,
    app: SystemLogApp.Iam,
    data: { arguments: {} },
    message: (data) => toReadMessage("Users listed", data),
  },

  [AuditEventType.CITIZEN_READ]: {
    type: AuditEventType.CITIZEN_READ,
    app: SystemLogApp.Spynet,
    data: { arguments: {} },
    message: (data) => toReadMessage("Citizen read", data),
  },

  [AuditEventType.ORGANIZATION_READ]: {
    type: AuditEventType.ORGANIZATION_READ,
    app: SystemLogApp.Spynet,
    data: { arguments: {} },
    message: (data) => toReadMessage("Organization read", data),
  },

  [AuditEventType.CITIZEN_NOTES_LISTED]: {
    type: AuditEventType.CITIZEN_NOTES_LISTED,
    app: SystemLogApp.Spynet,
    data: { arguments: {} },
    message: (data) => toReadMessage("Citizen notes listed", data),
  },

  [AuditEventType.CITIZENS_LISTED]: {
    type: AuditEventType.CITIZENS_LISTED,
    app: SystemLogApp.Spynet,
    data: { arguments: {} },
    message: (data) => toReadMessage("Citizens listed", data),
  },

  [AuditEventType.CITIZENS_AND_ORGANIZATIONS_SEARCHED]: {
    type: AuditEventType.CITIZENS_AND_ORGANIZATIONS_SEARCHED,
    app: SystemLogApp.Spynet,
    data: { arguments: {} },
    message: (data) =>
      toReadMessage("Citizens and organizations searched", data),
  },

  [AuditEventType.ROLE_READ]: {
    type: AuditEventType.ROLE_READ,
    app: SystemLogApp.Iam,
    data: { arguments: {} },
    message: (data) => toReadMessage("Role read", data),
  },

  [AuditEventType.ROLES_LISTED]: {
    type: AuditEventType.ROLES_LISTED,
    app: SystemLogApp.Iam,
    data: { arguments: {} },
    message: (data) => toReadMessage("Roles listed", data),
  },

  [AuditEventType.ROLE_TAGS_LISTED]: {
    type: AuditEventType.ROLE_TAGS_LISTED,
    app: SystemLogApp.Iam,
    data: { arguments: {} },
    message: (data) => toReadMessage("Role tags listed", data),
  },

  [AuditEventType.PERMISSION_CATALOG_READ]: {
    type: AuditEventType.PERMISSION_CATALOG_READ,
    app: SystemLogApp.Iam,
    data: { arguments: {} },
    message: (data) => toReadMessage("Permission catalog read", data),
  },

  [AuditEventType.PENALTY_ENTRIES_LISTED]: {
    type: AuditEventType.PENALTY_ENTRIES_LISTED,
    app: SystemLogApp.PenaltyPoints,
    data: { arguments: {} },
    message: (data) => toReadMessage("Penalty entries listed", data),
  },

  [AuditEventType.OWN_SHIPS_LISTED]: {
    type: AuditEventType.OWN_SHIPS_LISTED,
    app: SystemLogApp.Fleet,
    data: { arguments: {} },
    message: (data) => toReadMessage("Own ships listed", data),
  },

  [AuditEventType.ORGANIZATION_FLEET_LISTED]: {
    type: AuditEventType.ORGANIZATION_FLEET_LISTED,
    app: SystemLogApp.Fleet,
    data: { arguments: {} },
    message: (data) => toReadMessage("Organization fleet listed", data),
  },

  [AuditEventType.SHIP_VARIANTS_SEARCHED]: {
    type: AuditEventType.SHIP_VARIANTS_SEARCHED,
    app: SystemLogApp.Fleet,
    data: { arguments: {} },
    message: (data) => toReadMessage("Ship variants searched", data),
  },

  [AuditEventType.WIKI_PAGE_READ]: {
    type: AuditEventType.WIKI_PAGE_READ,
    app: SystemLogApp.Wiki,
    data: { arguments: {} },
    message: (data) => toReadMessage("Wiki page read", data),
  },

  [AuditEventType.WIKI_PAGES_LISTED]: {
    type: AuditEventType.WIKI_PAGES_LISTED,
    app: SystemLogApp.Wiki,
    data: { arguments: {} },
    message: (data) => toReadMessage("Wiki pages listed", data),
  },

  [AuditEventType.WIKI_SEARCHED]: {
    type: AuditEventType.WIKI_SEARCHED,
    app: SystemLogApp.Wiki,
    data: { arguments: {} },
    message: (data) => toReadMessage("Wiki searched", data),
  },

  [AuditEventType.EVENT_READ]: {
    type: AuditEventType.EVENT_READ,
    app: SystemLogApp.Events,
    data: { arguments: {} },
    message: (data) => toReadMessage("Event read", data),
  },

  [AuditEventType.EVENTS_LISTED]: {
    type: AuditEventType.EVENTS_LISTED,
    app: SystemLogApp.Events,
    data: { arguments: {} },
    message: (data) => toReadMessage("Events listed", data),
  },

  [AuditEventType.EVENT_LINEUP_READ]: {
    type: AuditEventType.EVENT_LINEUP_READ,
    app: SystemLogApp.Events,
    data: { arguments: {} },
    message: (data) => toReadMessage("Event lineup read", data),
  },

  [AuditEventType.TASK_READ]: {
    type: AuditEventType.TASK_READ,
    app: SystemLogApp.Tasks,
    data: { arguments: {} },
    message: (data) => toReadMessage("Task read", data),
  },

  [AuditEventType.TASKS_LISTED]: {
    type: AuditEventType.TASKS_LISTED,
    app: SystemLogApp.Tasks,
    data: { arguments: {} },
    message: (data) => toReadMessage("Tasks listed", data),
  },

  [AuditEventType.MANUAL_NOTIFICATIONS_LISTED]: {
    type: AuditEventType.MANUAL_NOTIFICATIONS_LISTED,
    app: SystemLogApp.Notifications,
    data: { arguments: {} },
    message: (data) => toReadMessage("Manual notifications listed", data),
  },

  [AuditEventType.OWN_NOTIFICATIONS_LISTED]: {
    type: AuditEventType.OWN_NOTIFICATIONS_LISTED,
    app: SystemLogApp.Notifications,
    data: { arguments: {} },
    message: (data) => toReadMessage("Own notifications listed", data),
  },

  [AuditEventType.CHANGELOG_ENTRIES_LISTED]: {
    type: AuditEventType.CHANGELOG_ENTRIES_LISTED,
    app: SystemLogApp.Changelog,
    data: { arguments: {} },
    message: (data) => toReadMessage("Changelog entries listed", data),
  },

  [AuditEventType.AUDIT_EVENTS_LISTED]: {
    type: AuditEventType.AUDIT_EVENTS_LISTED,
    app: SystemLogApp.SystemLog,
    data: { arguments: {} },
    message: (data) => toReadMessage("System log listed", data),
  },
};
