/**
 * The states of a reporter which the Live-Status shows next to the session.
 * The order of the values is the order of the panel.
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
      readonly type: LiveStatusSignalType.SessionEnd;
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
    };

export const SESSION_END_SIGNAL: LiveStatusSignal = {
  type: LiveStatusSignalType.SessionEnd,
};

/** Some lines give only zeros, which identify no mission. */
const NO_MISSION_ID = "00000000-0000-0000-0000-000000000000";

export const toMissionKey = (missionId: string | undefined) =>
  missionId && missionId !== NO_MISSION_ID ? missionId : null;

/**
 * A kind with one state at most shows the message of its newest entry, as
 * the table shows it, for example the newest jurisdiction, or "Verlassen" for
 * a zone. A new message replaces the old one, thus the state needs no key.
 */
export const createLatestMessageSignal = (
  kind: LiveStatusKind,
  message: string,
): LiveStatusSignal => ({
  type: LiveStatusSignalType.StateStart,
  kind,
  key: null,
  label: message,
});
