/**
 * The states of a reporter which the Live-Status shows next to the session
 * and the party. The order of the values is the order of the panel.
 */
export enum LiveStatusKind {
  Jurisdiction = "jurisdiction",
  ArmisticeZone = "armisticeZone",
  MonitoredSpace = "monitoredSpace",
  PrivateProperty = "privateProperty",
  RestrictedArea = "restrictedArea",
  Instance = "instance",
  Contract = "contract",
}

export enum LiveStatusSignalType {
  SessionStart = "sessionStart",
  SessionEnd = "sessionEnd",
  StateStart = "stateStart",
  StateEnd = "stateEnd",
  PartyStart = "partyStart",
  PartyEnd = "partyEnd",
  PartyMemberJoin = "partyMemberJoin",
  PartyMemberLeave = "partyMemberLeave",
  PartyLeaderChange = "partyLeaderChange",
}

/**
 * What one entry tells the Live-Status. A pattern derives it from the capture
 * groups of its line (see `Pattern.liveStatusSignal`).
 */
export type LiveStatusSignal =
  | {
      readonly type: LiveStatusSignalType.SessionStart;
      readonly shard: string;
    }
  | {
      readonly type:
        | LiveStatusSignalType.SessionEnd
        | LiveStatusSignalType.PartyStart
        | LiveStatusSignalType.PartyEnd;
    }
  | {
      readonly type:
        LiveStatusSignalType.StateStart | LiveStatusSignalType.StateEnd;
      readonly kind: LiveStatusKind;
      /**
       * Identifies one of several states of a kind, for example the mission
       * id of a contract. Null when the line has no such id.
       */
      readonly key: string | null;
      /** The text of the panel. An end needs it only to find its start. */
      readonly label: string | null;
    }
  | {
      readonly type:
        | LiveStatusSignalType.PartyMemberJoin
        | LiveStatusSignalType.PartyMemberLeave
        | LiveStatusSignalType.PartyLeaderChange;
      readonly handle: string;
    };

export const SESSION_END_SIGNAL: LiveStatusSignal = {
  type: LiveStatusSignalType.SessionEnd,
};

export const PARTY_START_SIGNAL: LiveStatusSignal = {
  type: LiveStatusSignalType.PartyStart,
};

export const PARTY_END_SIGNAL: LiveStatusSignal = {
  type: LiveStatusSignalType.PartyEnd,
};

/** Some lines give only zeros, which identify no mission. */
const NO_MISSION_ID = "00000000-0000-0000-0000-000000000000";

export const toMissionKey = (missionId: string | undefined) =>
  missionId && missionId !== NO_MISSION_ID ? missionId : null;

/** The value of a zone or a party while the reporter is in it */
export const INSIDE_LABEL = "in";

/** The value of a zone or a party after the reporter left it */
export const OUTSIDE_LABEL = "out";

/**
 * A zone shows inside and outside of it. Leaving the zone replaces "in" with
 * "out", as a new jurisdiction replaces the old one. A zone has one state at
 * most, thus it needs no key.
 */
export const createZoneSignal = (
  kind: LiveStatusKind,
  isInside: boolean,
): LiveStatusSignal => ({
  type: LiveStatusSignalType.StateStart,
  kind,
  key: null,
  label: isInside ? INSIDE_LABEL : OUTSIDE_LABEL,
});

/** The game writes "Entering" and "Leaving", or "Entered" and "Exited" */
const ENTERING_DIRECTIONS = new Set(["Entering", "Entered"]);

export const isEnteringDirection = (direction: string) =>
  ENTERING_DIRECTIONS.has(direction);
