/**
 * The permission-set vocabulary of the permission model. The permission
 * logic in this directory has no session and no side effects: the callers
 * load the data (the session, the role assignments, the flows, the
 * templates, the pages) and give it to the resolvers.
 */
import type { GenericCitizenLogType } from "../spynet/citizenLogType.js";

export interface PermissionSet {
  resource:
    | GenericCitizenLogType
    | "login"
    | "event"
    | "eventTemplateShare"
    | "orgFleet"
    | "ship"
    | "otherShips"
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
    | "task"
    | "logAnalyzer"
    | "profitDistributionCycle"
    | "globalStatistics"
    | "systemLog"
    | "upload"
    | "wiki"
    | "mcp"
    | "manualNotification";
  operation:
    | "create"
    | "read"
    | "readRedacted"
    | "update"
    | "delete"
    | "manage"
    | "ban"
    | "confirm"
    | "assign"
    | "dismiss"
    | "negate"
    | "use";
  attributes?: PermissionSetAttribute[];
}

export interface PermissionSetAttribute {
  key:
    | "confirmed"
    | "noteTypeId"
    | "classificationLevelId"
    | "alsoUnconfirmed"
    | "roleId"
    | "alsoVisibilityRedacted"
    | "taskVisibility"
    | "taskRewardType"
    | "taskDeleted";
  value: string | boolean;
}
