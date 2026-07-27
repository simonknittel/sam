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
import type { PatternConfig } from "./types";

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
}

const shardRegex = /^pub_(?<region>[a-z0-9]+)_\w+_(?<number>\d+)$/m;

type Patterns = Record<EntryType, Pattern>;

interface Pattern {
  title: string;
  icon: IconType;
  regex: RegExp;
  renderMessage?: (groups: Record<string, string>) => ReactNode;
}

export const PATTERNS: Patterns = {
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

/**
 * Serializable pattern configs for Web Worker (regex source + flags, without renderMessage which contains JSX)
 */
export const PATTERN_CONFIGS: PatternConfig[] = Object.entries(PATTERNS).map(
  ([key, pattern]) => ({
    key,
    regexSource: pattern.regex.source,
    regexFlags: pattern.regex.flags,
  }),
);
