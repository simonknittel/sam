import type { Entity } from "@sam-monorepo/database/browser";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  FaCompassDrafting,
  FaFileCircleCheck,
  FaFileCircleXmark,
  FaFileSignature,
  FaPlugCircleXmark,
  FaRightToBracket,
  FaSkull,
} from "react-icons/fa6";

/**
 * A new log pattern needs a value here and an entry in `PATTERNS` below.
 * Nothing else: the database keeps the value of this enum verbatim, thus a
 * new type needs no migration.
 */
export enum EntryType {
  JoinPu = "joinPu",
  OwnDeath = "ownDeath",
  BlueprintReceivedNotification = "blueprintReceivedNotification",
  ContractAcceptedNotification = "contractAcceptedNotification",
  ContractCompleteNotification = "contractCompleteNotification",
  ContractFailedNotification = "contractFailedNotification",
  Disconnection = "disconnection",
}

export interface IEntry {
  readonly key: string;
  readonly type: EntryType;
  readonly isoDate: Date;
  readonly isNew?: boolean;
  readonly message: ReactNode;
  /**
   * The citizen the entry belongs to: the citizen who shared it, or the
   * current user for a local one. Null when the user has no linked citizen.
   */
  readonly citizen: Pick<Entity, "id" | "handle"> | null;
  /** True when another citizen shared the entry instead of the local parser. */
  readonly isShared: boolean;
  /**
   * True once the entry reached the server, whether this visit shared it or
   * an earlier one did. The upload learns the difference from the hashes the
   * server already holds.
   */
  readonly isUploaded: boolean;
}

const shardRegex = /^pub_(?<region>[a-z0-9]+)_\w+_(?<number>\d+)$/m;

interface Pattern {
  title: string;
  icon: IconType;
  /**
   * The expression scans whole log files, thus it carries the global and the
   * multiline flag. It must have an `isoDate` group, which gives the time of
   * the event.
   */
  regex: RegExp;
  renderMessage?: (groups: Record<string, string>) => ReactNode;
}

export const PATTERNS: Record<EntryType, Pattern> = {
  joinPu: {
    title: "Shard-Beitritt",
    icon: FaRightToBracket,
    // <2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.+<Join PU>.+shard\[(?<shard>[\d\w_]+)\].+$/gm,
    renderMessage: (groups) => {
      const match = shardRegex.exec(groups.shard);
      if (!match?.groups) {
        return (
          <span className="truncate" title={groups.shard}>
            {groups.shard}
          </span>
        );
      }

      let region = match.groups.region;
      if (region.startsWith("eu")) region = "EU";
      if (region.startsWith("us")) region = "USA";
      if (region.startsWith("ape")) region = "ASIA";
      if (region.startsWith("apse")) region = "AUS";

      let number = match.groups.number;
      number = number.replace(/^0+/, "");

      return (
        <span
          className="truncate"
          title={`${region} ${number} (${groups.shard})`}
        >
          {region} {number}{" "}
          <span className="text-white/40">({groups.shard})</span>
        </span>
      );
    },
  },

  ownDeath: {
    title: "Gestorben",
    icon: FaSkull,
    // <2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor '...' [...] ejected from zone 'RSI_Zeus_CL_...' [...] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]
    regex: /^<(?<isoDate>[\d\-T:.Z]+)>.*\<\[ActorState\] Dead\>.*$/gm,
  },

  blueprintReceivedNotification: {
    title: "Blueprint erhalten",
    icon: FaCompassDrafting,
    // <2026-05-14T14:45:40.207Z> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    // <2026-05-25T17:28:05.820Z> [Notice] <SHUDEvent_OnNotification> Added notification "<EM4>Received Blueprint: Arbor MH1 Mining Laser [BP]</EM4>: " [15] to queue. New queue size: 2, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Received Blueprint: (?<blueprint>.+): ".*$/gm,
    renderMessage: (groups) => {
      const blueprintName = groups.blueprint.replaceAll(/<.+?>/g, "");

      return (
        <span className="truncate" title={blueprintName}>
          {blueprintName}
        </span>
      );
    },
  },

  contractAcceptedNotification: {
    title: "Contract angenommen",
    icon: FaFileSignature,
    // <2026-05-25T07:45:33.982Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Accepted:  Wikelo Arrive to System: " [4] to queue. New queue size: 1, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Accepted: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => {
      const contractName = groups.contract.replaceAll(/<.+?>/g, "");

      return (
        <span className="truncate" title={contractName}>
          {contractName}
        </span>
      );
    },
  },

  contractCompleteNotification: {
    title: "Contract abgeschlossen",
    icon: FaFileCircleCheck,
    // <2026-06-01T10:15:20.123Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Complete:  Wikelo Arrive to System: " [5] to queue. New queue size: 2, MissionId: [bf7d2465-cf1e-480b-ae5c-25040d716e5f], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Complete: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => {
      const contractName = groups.contract.replaceAll(/<.+?>/g, "");

      return (
        <span className="truncate" title={contractName}>
          {contractName}
        </span>
      );
    },
  },

  contractFailedNotification: {
    title: "Contract fehlgeschlagen",
    icon: FaFileCircleXmark,
    // <2026-05-25T18:03:03.012Z> [Notice] <SHUDEvent_OnNotification> Added notification "Contract Failed: CRITICAL REFUEL REQUEST: Crusader Ares Star Fighter Ion <EM4>[200 Rep] [BP]*</EM4>: " [189] to queue. New queue size: 2, MissionId: [c54aa278-06e1-4c83-86d2-9e795f7691f3], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification ".*Contract Failed: (?<contract>.+): ".*$/gm,
    renderMessage: (groups) => {
      const contractName = groups.contract.replaceAll(/<.+?>/g, "");

      return (
        <span className="truncate" title={contractName}>
          {contractName}
        </span>
      );
    },
  },

  disconnection: {
    title: "Verbindung getrennt",
    icon: FaPlugCircleXmark,
    // <2026-05-25T08:40:17.864Z> [Notice] <Channel Disconnected> cause=30016 reason="Remote Disconnect - Player requested disconnect" frame=220001 isRemote=1 map="megamap" gamerules="SC_Default" hostType="Replicant" remoteAddr=... localAddr=0.0.0.0:64090 connection={4, 0} session=... node_id=bc4da5d3-3f05-e19e-4aa0-702432234095 nickname="..." playerGEID=... uptime_secs=3636.990234 [Team_Network][Network][Gateway][Disconnection]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)> \[Notice\] \<Channel Disconnected\>.*reason="Remote Disconnect - Player requested disconnect".*$/gm,
  },
};

/** The order in which every list of the entry types shows them. */
export const SORTED_ENTRY_TYPES = Object.values(EntryType).toSorted(
  (first, second) =>
    PATTERNS[first].title.localeCompare(PATTERNS[second].title),
);

const ENTRY_TYPES_BY_VALUE = new Map<string, EntryType>(
  Object.values(EntryType).map((type) => [type, type]),
);

/**
 * Reads a type back which the database keeps as text. Returns undefined for a
 * value which no longer belongs to a pattern, thus a removed pattern leaves
 * its shared entries in place without breaking the table.
 */
export const toEntryType = (value: string) => ENTRY_TYPES_BY_VALUE.get(value);

/**
 * The expressions of `PATTERNS` without the global flag and thus without a
 * `lastIndex`, so a single match never moves the state of a shared
 * expression. Compiled once: `matchEntryLine` runs for every shared entry of
 * a response.
 */
const SINGLE_LINE_REGEXES = Object.fromEntries(
  Object.values(EntryType).map((type) => {
    const { regex } = PATTERNS[type];
    return [type, new RegExp(regex.source, regex.flags.replaceAll("g", ""))];
  }),
) as Record<EntryType, RegExp>;

/**
 * Matches one single log line against the pattern of the given type and gives
 * back its capture groups. Returns null when the line is not of that type.
 */
export const matchEntryLine = (
  type: EntryType,
  rawLine: string,
): Record<string, string> | null =>
  SINGLE_LINE_REGEXES[type].exec(rawLine)?.groups ?? null;

/**
 * Identifies one entry in the entries map. The same line of the same type is
 * one entry, no matter whether the local parser or another citizen delivered
 * it.
 *
 * No value of `EntryType` holds an underscore, thus the separator cannot make
 * two different entries collide.
 */
export const createEntryKey = (type: EntryType, rawLine: string) =>
  `${type}_${rawLine}`;
