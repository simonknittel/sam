import type { GenericEntityLogType } from "@/types";

export interface PermissionSet {
  // TODO: Use ENUM (https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums)
  resource:
    | GenericEntityLogType
    | "login"
    | "event"
    | "operation"
    | "orgFleet"
    | "ship"
    | "manufacturersSeriesAndVariants"
    | "citizen"
    | "organization"
    | "organizationMembership"
    | "noteType"
    | "user"
    | "role"
    | "classificationLevel"
    | "analytics"
    | "lastSeen"
    | "otherRole"
    | "note"
    | "eventFleet"
    | "documentAlliance"
    | "documentOnboarding"
    | "documentA1"
    | "documentA2"
    | "documentA3"
    | "documentMember"
    | "documentRecon"
    | "documentDogfight"
    | "documentAdvancedDogfight"
    | "documentHandsOnDeck"
    | "documentEngineering"
    | "documentBootsOnTheGround"
    | "documentCaptainOnTheBridge"
    | "documentMissiles"
    | "documentBombardment"
    | "documentInterdictAndDisable"
    | "documentLeadership"
    | "documentTechAndTactic"
    | "documentFrontline"
    | "documentLeadThePack"
    | "documentSupervisor"
    | "documentManager"
    | "documentSalvage"
    | "documentMining"
    | "documentTradeAndTransport"
    | "documentScavenger"
    | "documentMarketeer"
    | "documentPolaris"
    | "algolia"
    | "spynetActivity"
    | "spynetCitizen"
    | "spynetNotes"
    | "spynetOther"
    | "career"
    | "leaderboards"
    | "penaltyEntry"
    | "ownPenaltyEntry"
    | "othersEventPosition"
    | "silcBalanceOfOtherCitizen"
    | "silcBalanceOfCurrentCitizen"
    | "silcTransactionOfOtherCitizen"
    | "silcTransactionOfCurrentCitizen"
    | "silcSetting"
    | "task";
  // TODO: Use ENUM (https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums)
  operation:
    | "create"
    | "read"
    | "readRedacted"
    | "update"
    | "delete"
    | "manage"
    | "confirm"
    | "assign"
    | "dismiss"
    | "negate";
  attributes?: PermissionSetAttribute[];
}

export interface PermissionSetAttribute {
  // TODO: Use ENUM (https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums)
  key:
    | "confirmed"
    | "noteTypeId"
    | "classificationLevelId"
    | "alsoUnconfirmed"
    | "roleId"
    | "alsoVisibilityRedacted"
    | "flowId"
    | "taskVisibility"
    | "taskRewardType"
    | "taskDeleted";
  value: string | boolean;
}
