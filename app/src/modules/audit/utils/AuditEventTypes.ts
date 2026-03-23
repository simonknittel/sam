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
  VARIANT_UPDATED = "VARIANT_UPDATED",
  VARIANT_DELETED = "VARIANT_DELETED",
  SERIES_UPDATED = "SERIES_UPDATED",
  SERIES_DELETED = "SERIES_DELETED",
  MANUFACTURER_UPDATED = "MANUFACTURER_UPDATED",
  MANUFACTURER_DELETED = "MANUFACTURER_DELETED",
  WEB_PUSH_SUBSCRIBED = "WEB_PUSH_SUBSCRIBED",
  ROLE_CREATED = "ROLE_CREATED",
  ROLE_UPDATED = "ROLE_UPDATED",
  ROLE_DELETED = "ROLE_DELETED",
  ROLE_PERMISSIONS_UPDATED = "ROLE_PERMISSIONS_UPDATED",
  ROLE_PERMISSION_TOGGLED = "ROLE_PERMISSION_TOGGLED",
  ROLE_INHERITANCE_UPDATED = "ROLE_INHERITANCE_UPDATED",
  ROLE_ASSIGNMENTS_UPDATED = "ROLE_ASSIGNMENTS_UPDATED",
  ROLE_ASSIGNMENT_DELETED = "ROLE_ASSIGNMENT_DELETED",
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

  [AuditEventType.VARIANT_UPDATED]: {
    variantId: string;
    seriesId: string;
    previousName: string;
    newName: string;
    previousStatus: string | null;
    newStatus: string | null;
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
}

interface AuditEventDefinition<Type extends AuditEventType> {
  type: Type;
  data: AuditEventDataByType[Type];
  message?: (data: AuditEventDataByType[Type]) => string;
}

export const AuditEventDefinitions: {
  [Key in AuditEventType]: AuditEventDefinition<Key>;
} = {
  [AuditEventType.USER_LOGIN]: {
    type: AuditEventType.USER_LOGIN,
    data: {
      userId: "string",
    },
    message: (d) => `User ${d.userId} logged in`,
  },

  [AuditEventType.USER_LOGIN_V2]: {
    type: AuditEventType.USER_LOGIN_V2,
    data: {
      userId: "string",
      userEmail: "string",
      userName: "string",
    },
    message: (d) => `User ${d.userName ?? d.userId} (${d.userEmail ?? "unknown email"}) logged in`,
  },

  [AuditEventType.USER_LOGOUT]: {
    type: AuditEventType.USER_LOGOUT,
    data: {
      sessionId: "string",
      userId: "string",
    },
    message: (d) => `User ${d.userId} logged out`,
  },

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY]: {
    type: AuditEventType.USER_FIRST_VISIT_OF_THE_DAY,
    data: {
      userId: "string",
    },
    message: (d) => `User ${d.userId} - first visit of the day`,
  },

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2]: {
    type: AuditEventType.USER_FIRST_VISIT_OF_THE_DAY_V2,
    data: {
      userId: "string",
      userEmail: "string",
      userName: "string",
    },
    message: (d) => `User ${d.userName ?? d.userId} - first visit of the day`,
  },

  [AuditEventType.SHIP_CREATED]: {
    type: AuditEventType.SHIP_CREATED,
    data: {
      shipId: "string",
      ownerId: "string",
      variantId: "string",
    },
    message: (d) => `Ship created (owner: ${d.ownerId}, variant: ${d.variantId})`,
  },

  [AuditEventType.SHIP_UPDATED]: {
    type: AuditEventType.SHIP_UPDATED,
    data: {
      shipId: "string",
      ownerId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (d) => `Ship updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.SHIP_DELETED]: {
    type: AuditEventType.SHIP_DELETED,
    data: {
      shipId: "string",
      ownerId: "string",
      name: "string",
      variantId: "string",
    },
    message: (d) => `Ship deleted: "${d.name}" (owner: ${d.ownerId})`,
  },

  [AuditEventType.VARIANT_CREATED]: {
    type: AuditEventType.VARIANT_CREATED,
    data: {
      variantId: "string",
      seriesId: "string",
      name: "string",
      status: "FLIGHT_READY",
    },
    message: (d) => `Variant created: "${d.name}" (series: ${d.seriesId})`,
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
    message: (d) => `Variant updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.VARIANT_DELETED]: {
    type: AuditEventType.VARIANT_DELETED,
    data: {
      variantId: "string",
      seriesId: "string",
      name: "string",
    },
    message: (d) => `Variant deleted: "${d.name}" (series: ${d.seriesId})`,
  },

  [AuditEventType.SERIES_UPDATED]: {
    type: AuditEventType.SERIES_UPDATED,
    data: {
      seriesId: "string",
      manufacturerId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (d) => `Series updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.SERIES_DELETED]: {
    type: AuditEventType.SERIES_DELETED,
    data: {
      seriesId: "string",
      manufacturerId: "string",
      name: "string",
    },
    message: (d) => `Series deleted: "${d.name}" (manufacturer: ${d.manufacturerId})`,
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
    message: (d) => `Manufacturer updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.MANUFACTURER_DELETED]: {
    type: AuditEventType.MANUFACTURER_DELETED,
    data: {
      manufacturerId: "string",
      name: "string",
    },
    message: (d) => `Manufacturer deleted: "${d.name}"`,
  },

  [AuditEventType.WEB_PUSH_SUBSCRIBED]: {
    type: AuditEventType.WEB_PUSH_SUBSCRIBED,
    data: {
      subscriptionId: "string",
      citizenId: "string",
    },
    message: (d) => `Web push subscription created for citizen ${d.citizenId}`,
  },

  [AuditEventType.ROLE_CREATED]: {
    type: AuditEventType.ROLE_CREATED,
    data: {
      roleId: "string",
      name: "string",
    },
    message: (d) => `Role created: "${d.name}" (${d.roleId})`,
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
    message: (d) => `Role updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.ROLE_DELETED]: {
    type: AuditEventType.ROLE_DELETED,
    data: {
      roleId: "string",
      name: "string",
    },
    message: (d) => `Role deleted: "${d.name}" (${d.roleId})`,
  },

  [AuditEventType.ROLE_PERMISSIONS_UPDATED]: {
    type: AuditEventType.ROLE_PERMISSIONS_UPDATED,
    data: {
      roleId: "string",
    },
    message: (d) => `Permissions updated for role ${d.roleId}`,
  },

  [AuditEventType.ROLE_PERMISSION_TOGGLED]: {
    type: AuditEventType.ROLE_PERMISSION_TOGGLED,
    data: {
      roleId: "string",
      permissionString: "string",
      enabled: true,
    },
    message: (d) => `Permission "${d.permissionString}" ${d.enabled ? "enabled" : "disabled"} for role ${d.roleId}`,
  },

  [AuditEventType.ROLE_INHERITANCE_UPDATED]: {
    type: AuditEventType.ROLE_INHERITANCE_UPDATED,
    data: {
      roleId: "string",
    },
    message: (d) => `Role inheritance updated for role ${d.roleId}`,
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
    message: (d) => `Role assignments updated for citizen ${d.citizenId}`,
  },

  [AuditEventType.ROLE_ASSIGNMENT_DELETED]: {
    type: AuditEventType.ROLE_ASSIGNMENT_DELETED,
    data: {
      citizenId: "string",
      roleId: "string",
    },
    message: (d) => `Role assignment deleted for citizen ${d.citizenId} (role: ${d.roleId})`,
  },

  [AuditEventType.SILC_TRANSACTION_CREATED]: {
    type: AuditEventType.SILC_TRANSACTION_CREATED,
    data: {
      transactionIds: ["string"],
      receiverIds: ["string"],
      value: 0,
      description: "string",
    },
    message: (d) => `SILC transaction created: ${d.value} SILC`,
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
    message: (d) => `SILC transaction updated: ${d.previousValue} → ${d.newValue} SILC`,
  },

  [AuditEventType.SILC_TRANSACTION_DELETED]: {
    type: AuditEventType.SILC_TRANSACTION_DELETED,
    data: {
      transactionId: "string",
      receiverId: "string",
      value: 0,
      description: "string",
    },
    message: (d) => `SILC transaction deleted (${d.transactionId})`,
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
    message: (d) => `Penalty entry created for citizen ${d.citizenId} (${d.points} points)`,
  },

  [AuditEventType.PENALTY_ENTRY_DELETED]: {
    type: AuditEventType.PENALTY_ENTRY_DELETED,
    data: {
      penaltyEntryId: "string",
      citizenId: "string",
      points: 0,
      reason: "string",
    },
    message: (d) => `Penalty entry deleted for citizen ${d.citizenId} (${d.points} points)`,
  },

  [AuditEventType.PROFIT_CYCLE_CREATED]: {
    type: AuditEventType.PROFIT_CYCLE_CREATED,
    data: {
      cycleId: "string",
      title: "string",
      collectionEndedAt: new Date(),
    },
    message: (d) => `Profit distribution cycle created: "${d.title}" (${d.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED]: {
    type: AuditEventType.PROFIT_CYCLE_COLLECTION_ENDED,
    data: {
      cycleId: "string",
    },
    message: (d) => `Profit distribution cycle collection ended (${d.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED]: {
    type: AuditEventType.PROFIT_CYCLE_PAYOUT_STARTED,
    data: {
      cycleId: "string",
    },
    message: (d) => `Profit distribution cycle payout started (${d.cycleId})`,
  },

  [AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED]: {
    type: AuditEventType.PROFIT_CYCLE_PAYOUT_ENDED,
    data: {
      cycleId: "string",
    },
    message: (d) => `Profit distribution cycle payout ended (${d.cycleId})`,
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
    message: (d) => `Profit cycle participant updated (cycle: ${d.cycleId})`,
  },

  [AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED]: {
    type: AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED,
    data: {
      cycleId: "string",
      citizenId: "string",
      value: true,
    },
    message: (d) => `Profit distribution accepted toggled to ${d.value} (cycle: ${d.cycleId})`,
  },

  [AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED]: {
    type: AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED,
    data: {
      cycleId: "string",
      citizenId: "string",
      value: true,
    },
    message: (d) => `Profit distribution ceded toggled to ${d.value} (cycle: ${d.cycleId})`,
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
    message: (d) => `Task completed (${d.taskId})`,
  },

  [AuditEventType.TASK_DELETED]: {
    type: AuditEventType.TASK_DELETED,
    data: {
      taskId: "string",
      title: "string",
    },
    message: (d) => `Task deleted: "${d.title}" (${d.taskId})`,
  },

  [AuditEventType.TASK_CANCELLED]: {
    type: AuditEventType.TASK_CANCELLED,
    data: {
      taskId: "string",
      title: "string",
    },
    message: (d) => `Task cancelled: "${d.title}" (${d.taskId})`,
  },

  [AuditEventType.TASK_ASSIGNMENTS_UPDATED]: {
    type: AuditEventType.TASK_ASSIGNMENTS_UPDATED,
    data: {
      taskId: "string",
    },
    message: (d) => `Task assignments updated (${d.taskId})`,
  },

  [AuditEventType.TASK_TITLE_UPDATED]: {
    type: AuditEventType.TASK_TITLE_UPDATED,
    data: {
      taskId: "string",
      previousTitle: "Old title",
      newTitle: "New title",
    },
    message: (d) => `Task title updated: "${d.previousTitle}" → "${d.newTitle}"`,
  },

  [AuditEventType.TASK_DESCRIPTION_UPDATED]: {
    type: AuditEventType.TASK_DESCRIPTION_UPDATED,
    data: {
      taskId: "string",
      previousDescription: "Old description",
      newDescription: "New description",
    },
    message: (d) => `Task description updated (${d.taskId})`,
  },

  [AuditEventType.TASK_EXPIRES_AT_UPDATED]: {
    type: AuditEventType.TASK_EXPIRES_AT_UPDATED,
    data: {
      taskId: "string",
      previousExpiresAt: null,
      newExpiresAt: new Date(),
    },
    message: (d) => `Task expiry updated (${d.taskId})`,
  },

  [AuditEventType.TASK_REPEATABLE_UPDATED]: {
    type: AuditEventType.TASK_REPEATABLE_UPDATED,
    data: {
      taskId: "string",
      previousRepeatable: 1,
      newRepeatable: 2,
    },
    message: (d) => `Task repeatable updated (${d.taskId})`,
  },

  [AuditEventType.TASK_REQUIRED_ROLES_UPDATED]: {
    type: AuditEventType.TASK_REQUIRED_ROLES_UPDATED,
    data: {
      taskId: "string",
    },
    message: (d) => `Task required roles updated (${d.taskId})`,
  },

  [AuditEventType.TASK_REWARD_TEXT_UPDATED]: {
    type: AuditEventType.TASK_REWARD_TEXT_UPDATED,
    data: {
      taskId: "string",
      previousValue: "Old reward",
      newValue: "New reward",
    },
    message: (d) => `Task reward text updated (${d.taskId})`,
  },

  [AuditEventType.TASK_REWARD_SILC_UPDATED]: {
    type: AuditEventType.TASK_REWARD_SILC_UPDATED,
    data: {
      taskId: "string",
      previousValue: 10,
      newValue: 20,
    },
    message: (d) => `Task SILC reward updated (${d.taskId})`,
  },

  [AuditEventType.TASK_REWARD_NEW_SILC_UPDATED]: {
    type: AuditEventType.TASK_REWARD_NEW_SILC_UPDATED,
    data: {
      taskId: "string",
      previousValue: 100,
      newValue: 200,
    },
    message: (d) => `Task new SILC reward updated (${d.taskId})`,
  },

  [AuditEventType.TASK_SELF_ASSIGNMENT_CREATED]: {
    type: AuditEventType.TASK_SELF_ASSIGNMENT_CREATED,
    data: {
      taskId: "string",
      citizenId: "string",
    },
    message: (d) => `Task self-assignment created (task: ${d.taskId}, citizen: ${d.citizenId})`,
  },

  [AuditEventType.TASK_SELF_ASSIGNMENT_DELETED]: {
    type: AuditEventType.TASK_SELF_ASSIGNMENT_DELETED,
    data: {
      taskId: "string",
      citizenId: "string",
    },
    message: (d) => `Task self-assignment deleted (task: ${d.taskId}, citizen: ${d.citizenId})`,
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
    message: (d) => `Event position "${d.name}" created (event: ${d.eventId})`,
  },

  [AuditEventType.EVENT_POSITION_UPDATED]: {
    type: AuditEventType.EVENT_POSITION_UPDATED,
    data: {
      eventId: "string",
      positionId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (d) => `Event position updated (event: ${d.eventId}, position: ${d.positionId})`,
  },

  [AuditEventType.EVENT_POSITION_DELETED]: {
    type: AuditEventType.EVENT_POSITION_DELETED,
    data: {
      eventId: "string",
      positionId: "string",
      name: "string",
    },
    message: (d) => `Event position deleted (event: ${d.eventId}, position: ${d.positionId})`,
  },

  [AuditEventType.EVENT_MANAGERS_ASSIGNED]: {
    type: AuditEventType.EVENT_MANAGERS_ASSIGNED,
    data: {
      eventId: "string",
      managerIds: ["string"],
    },
    message: (d) => `Event managers assigned (event: ${d.eventId})`,
  },

  [AuditEventType.EVENT_MANAGER_REMOVED]: {
    type: AuditEventType.EVENT_MANAGER_REMOVED,
    data: {
      eventId: "string",
      managerId: "string",
    },
    message: (d) => `Event manager removed (event: ${d.eventId}, manager: ${d.managerId})`,
  },

  [AuditEventType.EVENT_LINEUP_STATUS_CHANGED]: {
    type: AuditEventType.EVENT_LINEUP_STATUS_CHANGED,
    data: {
      eventId: "string",
      enabled: true,
    },
    message: (d) => `Event lineup ${d.enabled ? "enabled" : "disabled"} (event: ${d.eventId})`,
  },

  [AuditEventType.EVENT_LINEUP_ORDER_CHANGED]: {
    type: AuditEventType.EVENT_LINEUP_ORDER_CHANGED,
    data: {
      eventId: "string",
    },
    message: (d) => `Event lineup order changed (event: ${d.eventId})`,
  },

  [AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED]: {
    type: AuditEventType.EVENT_POSITION_CITIZEN_ASSIGNED,
    data: {
      eventId: "string",
      positionId: "string",
      citizenId: "string",
    },
    message: (d) => `Citizen assigned to event position (event: ${d.eventId}, citizen: ${d.citizenId})`,
  },

  [AuditEventType.EVENT_POSITION_CITIZEN_REMOVED]: {
    type: AuditEventType.EVENT_POSITION_CITIZEN_REMOVED,
    data: {
      eventId: "string",
      positionId: "string",
      previousCitizenId: "string",
    },
    message: (d) => `Citizen removed from event position (event: ${d.eventId}, previousCitizen: ${d.previousCitizenId})`,
  },

  [AuditEventType.EVENT_POSITION_NAME_UPDATED]: {
    type: AuditEventType.EVENT_POSITION_NAME_UPDATED,
    data: {
      eventId: "string",
      positionId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (d) => `Event position name updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.EVENT_POSITION_APPLICATION_CREATED]: {
    type: AuditEventType.EVENT_POSITION_APPLICATION_CREATED,
    data: {
      eventId: "string",
      positionId: "string",
      citizenId: "string",
      applicationId: "string",
    },
    message: (d) => `Application created for event position (event: ${d.eventId}, citizen: ${d.citizenId})`,
  },

  [AuditEventType.EVENT_POSITION_APPLICATION_DELETED]: {
    type: AuditEventType.EVENT_POSITION_APPLICATION_DELETED,
    data: {
      eventId: "string",
      positionId: "string",
      citizenId: "string",
      applicationId: "string",
    },
    message: (d) => `Application deleted for event position (event: ${d.eventId}, citizen: ${d.citizenId})`,
  },

  [AuditEventType.EVENT_LINEUP_COPIED]: {
    type: AuditEventType.EVENT_LINEUP_COPIED,
    data: {
      sourceEventId: "string",
      targetEventId: "string",
    },
    message: (d) => `Event lineup copied from ${d.sourceEventId} to ${d.targetEventId}`,
  },

  [AuditEventType.CITIZEN_CREATED]: {
    type: AuditEventType.CITIZEN_CREATED,
    data: {
      citizenId: "string",
      spectrumId: "string",
    },
    message: (d) => `Citizen created: ${d.spectrumId} (${d.citizenId})`,
  },

  [AuditEventType.CITIZEN_DELETED]: {
    type: AuditEventType.CITIZEN_DELETED,
    data: {
      citizenId: "string",
      spectrumId: "string",
    },
    message: (d) => `Citizen deleted: ${d.spectrumId} (${d.citizenId})`,
  },

  [AuditEventType.ENTITY_LOG_CREATED]: {
    type: AuditEventType.ENTITY_LOG_CREATED,
    data: {
      entityId: "string",
      logId: "string",
      logType: "string",
    },
    message: (d) => `Entity log created (entity: ${d.entityId}, type: ${d.logType})`,
  },

  [AuditEventType.ENTITY_LOG_UPDATED]: {
    type: AuditEventType.ENTITY_LOG_UPDATED,
    data: {
      entityId: "string",
      logId: "string",
      logType: "string",
    },
    message: (d) => `Entity log updated (entity: ${d.entityId}, log: ${d.logId})`,
  },

  [AuditEventType.ENTITY_LOG_DELETED]: {
    type: AuditEventType.ENTITY_LOG_DELETED,
    data: {
      entityId: "string",
      logId: "string",
      logType: "string",
    },
    message: (d) => `Entity log deleted (entity: ${d.entityId}, log: ${d.logId})`,
  },

  [AuditEventType.ORGANIZATION_CREATED]: {
    type: AuditEventType.ORGANIZATION_CREATED,
    data: {
      organizationId: "string",
      spectrumId: "string",
      name: "string",
    },
    message: (d) => `Organization created: "${d.name}" (${d.spectrumId})`,
  },

  [AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED]: {
    type: AuditEventType.ORGANIZATION_MEMBERSHIP_CREATED,
    data: {
      organizationId: "string",
      citizenId: "string",
      type: "MAIN",
    },
    message: (d) => `Organization membership created (org: ${d.organizationId}, citizen: ${d.citizenId})`,
  },

  [AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED]: {
    type: AuditEventType.ORGANIZATION_MEMBERSHIP_REMOVED,
    data: {
      organizationId: "string",
      citizenId: "string",
    },
    message: (d) => `Organization membership removed (org: ${d.organizationId}, citizen: ${d.citizenId})`,
  },

  [AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED]: {
    type: AuditEventType.ORGANIZATION_MEMBERSHIP_CONFIRMED,
    data: {
      historyEntryId: "string",
      citizenId: "string",
      confirmed: "CONFIRMED",
    },
    message: (d) => `Organization membership confirmation updated (citizen: ${d.citizenId})`,
  },

  [AuditEventType.CLASSIFICATION_LEVEL_CREATED]: {
    type: AuditEventType.CLASSIFICATION_LEVEL_CREATED,
    data: {
      classificationLevelId: "string",
      name: "string",
    },
    message: (d) => `Classification level created: "${d.name}"`,
  },

  [AuditEventType.CLASSIFICATION_LEVEL_UPDATED]: {
    type: AuditEventType.CLASSIFICATION_LEVEL_UPDATED,
    data: {
      classificationLevelId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (d) => `Classification level updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.CLASSIFICATION_LEVEL_DELETED]: {
    type: AuditEventType.CLASSIFICATION_LEVEL_DELETED,
    data: {
      classificationLevelId: "string",
      name: "string",
    },
    message: (d) => `Classification level deleted: "${d.name}"`,
  },

  [AuditEventType.NOTE_TYPE_CREATED]: {
    type: AuditEventType.NOTE_TYPE_CREATED,
    data: {
      noteTypeId: "string",
      name: "string",
    },
    message: (d) => `Note type created: "${d.name}"`,
  },

  [AuditEventType.NOTE_TYPE_UPDATED]: {
    type: AuditEventType.NOTE_TYPE_UPDATED,
    data: {
      noteTypeId: "string",
      previousName: "string",
      newName: "string",
    },
    message: (d) => `Note type updated: "${d.previousName}" → "${d.newName}"`,
  },

  [AuditEventType.NOTE_TYPE_DELETED]: {
    type: AuditEventType.NOTE_TYPE_DELETED,
    data: {
      noteTypeId: "string",
      name: "string",
    },
    message: (d) => `Note type deleted: "${d.name}"`,
  },

  [AuditEventType.UPLOAD_CREATED]: {
    type: AuditEventType.UPLOAD_CREATED,
    data: {
      uploadId: "string",
      fileName: "file.png",
      mimeType: "image/png",
    },
    message: (d) => `File uploaded: "${d.fileName}" (${d.mimeType})`,
  },

  [AuditEventType.RESOURCE_IMAGE_ASSIGNED]: {
    type: AuditEventType.RESOURCE_IMAGE_ASSIGNED,
    data: {
      resourceType: "manufacturer",
      resourceId: "string",
      resourceAttribute: "imageId",
      imageId: "string",
    },
    message: (d) => `Image assigned to ${d.resourceType} ${d.resourceId}`,
  },

  [AuditEventType.EMAIL_VERIFIED]: {
    type: AuditEventType.EMAIL_VERIFIED,
    data: {
      userId: "string",
    },
    message: (d) => `Email verified for user ${d.userId}`,
  },

  [AuditEventType.EMAIL_CONFIRMATION_REQUESTED]: {
    type: AuditEventType.EMAIL_CONFIRMATION_REQUESTED,
    data: {
      userId: "string",
      email: "user@example.com",
    },
    message: (d) => `Email confirmation requested for user ${d.userId} (${d.email})`,
  },

  [AuditEventType.EMAIL_VERIFIED_VIA_TOKEN]: {
    type: AuditEventType.EMAIL_VERIFIED_VIA_TOKEN,
    data: {
      userId: "string",
    },
    message: (d) => `Email verified via token for user ${d.userId}`,
  },
};
