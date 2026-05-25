import type { ReactNode } from "react";

export enum EntryType {
  JoinPu = "joinPu",
  OwnDeath = "ownDeath",
  BlueprintReceivedNotification = "blueprintReceivedNotification",
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
  regex: RegExp;
  matchMapping: (
    date: Date,
    groups: Record<string, string>,
  ) => Omit<IEntry, "isoDate">;
}

export const PATTERNS: Patterns = {
  joinPu: {
    title: "Shard-Beitritte",
    // <2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.+<Join PU>.+shard\[(?<shard>[\d\w_]+)\].+$/gm,
    matchMapping: (date, groups): Omit<IEntry, "isoDate"> => {
      const key = `${date.getTime()}_${groups.shard}`;

      const match = shardRegex.exec(groups.shard);
      if (!match?.groups) {
        const message = (
          <span
            className="truncate"
            title={`Shard beigetreten: ${groups.shard}`}
          >
            <span className="text-white/40">Shard beigetreten:</span>{" "}
            {groups.shard}
          </span>
        );

        return {
          key,
          type: EntryType.JoinPu,
          message,
        };
      }

      let region = match.groups.region;
      if (region.startsWith("eu")) region = "EU";
      if (region.startsWith("us")) region = "USA";
      if (region.startsWith("ape")) region = "ASIA";
      if (region.startsWith("apse")) region = "AUS";

      let number = match.groups.number;
      number = number.replace(/^0+/, "");

      const message = (
        <span
          className="truncate"
          title={`Shard beigetreten: ${region} ${number} (${groups.shard})`}
        >
          <span className="text-white/40">Shard beigetreten:</span> {region}{" "}
          {number} <span className="text-white/40">({groups.shard})</span>
        </span>
      );

      return {
        key,
        type: EntryType.JoinPu,
        message,
      };
    },
  },

  ownDeath: {
    title: "Eigene Tode",
    // <2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'ind3x' [202028778295] ejected from zone 'RSI_Zeus_CL_7838674991315' [7838674991315] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]
    regex: /^<(?<isoDate>[\d\-T:.Z]+)>.*\<\[ActorState\] Dead\>.*$/gm,
    matchMapping: (date, groups): Omit<IEntry, "isoDate"> => {
      const key = `${date.getTime()}_${groups.elevatorName}`;

      return {
        key,
        type: EntryType.OwnDeath,
        message: (
          <span className="truncate" title="Gestorben">
            Gestorben
          </span>
        ),
      };
    },
  },

  blueprintReceivedNotification: {
    title: "Blueprint erhalten",
    // <2026-05-14T14:45:40.207Z> [Notice] <SHUDEvent_OnNotification> Added notification "Received Blueprint: Morozov-SH Helmet Thule: " [25] to queue. New queue size: 3, MissionId: [00000000-0000-0000-0000-000000000000], ObjectiveId: [] [Team_CoreGameplayFeatures][Missions][Comms]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.*\<SHUDEvent_OnNotification\> Added notification "Received Blueprint: (?<blueprint>.+): " \[\d+\] to queue.*$/gm,
    matchMapping: (date, groups): Omit<IEntry, "isoDate"> => {
      const key = `${date.getTime()}_${groups.blueprint}`;

      return {
        key,
        type: EntryType.BlueprintReceivedNotification,
        message: (
          <span
            className="truncate"
            title={`Blueprint erhalten: ${groups.blueprint}`}
          >
            <span className="text-white/40">Blueprint erhalten:</span>{" "}
            {groups.blueprint}
          </span>
        ),
      };
    },
  },
};
