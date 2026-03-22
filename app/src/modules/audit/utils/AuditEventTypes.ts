export enum AuditEventType {
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  USER_FIRST_VISIT_OF_THE_DAY = "USER_FIRST_VISIT_OF_THE_DAY",
  SHIP_CREATED = "SHIP_CREATED",
  WEB_PUSH_SUBSCRIBED = "WEB_PUSH_SUBSCRIBED",
}

export interface AuditEventDataByType {
  [AuditEventType.USER_LOGIN]: {
    userId: string;
  };

  [AuditEventType.USER_LOGOUT]: {
    sessionId: string;
    userId: string;
  };

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY]: {
    userId: string;
  };

  [AuditEventType.SHIP_CREATED]: {
    shipId: string;
    ownerId: string;
    variantId: string;
  };

  [AuditEventType.WEB_PUSH_SUBSCRIBED]: {
    subscriptionId: string;
    citizenId: string;
  };
}

interface AuditEventDefinition<Type extends AuditEventType> {
  type: Type;
  data: AuditEventDataByType[Type];
}

export const AuditEventDefinitions: {
  [Key in AuditEventType]: AuditEventDefinition<Key>;
} = {
  [AuditEventType.USER_LOGIN]: {
    type: AuditEventType.USER_LOGIN,
    data: {
      userId: "string",
    },
  },

  [AuditEventType.USER_LOGOUT]: {
    type: AuditEventType.USER_LOGOUT,
    data: {
      sessionId: "string",
      userId: "string",
    },
  },

  [AuditEventType.USER_FIRST_VISIT_OF_THE_DAY]: {
    type: AuditEventType.USER_FIRST_VISIT_OF_THE_DAY,
    data: {
      userId: "string",
    },
  },

  [AuditEventType.SHIP_CREATED]: {
    type: AuditEventType.SHIP_CREATED,
    data: {
      shipId: "string",
      ownerId: "string",
      variantId: "string",
    },
  },

  [AuditEventType.WEB_PUSH_SUBSCRIBED]: {
    type: AuditEventType.WEB_PUSH_SUBSCRIBED,
    data: {
      subscriptionId: "string",
      citizenId: "string",
    },
  },
};
