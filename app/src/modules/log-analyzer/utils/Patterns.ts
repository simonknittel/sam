import {
  EntryType,
  type IEntry,
  type IJoinPuEntry,
  type IOwnDeathEntry,
} from "../components/Entry";

interface Pattern {
  id: string;
  regex: RegExp;
  matchMapping: (
    date: Date,
    groups: Record<string, string>,
  ) => Omit<IEntry, "isoDate">;
}

export const Patterns: Pattern[] = [
  {
    id: "joinPu",
    // <2025-06-22T09:59:12.293Z> [Notice] <Join PU> address[35.187.166.216] port[64336] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]
    regex:
      /^<(?<isoDate>[\d\-T:.Z]+)>.+<Join PU>.+shard\[(?<shard>[\d\w_]+)\].+$/gm,
    matchMapping: (date, groups): Omit<IJoinPuEntry, "isoDate"> => {
      const key = `${date.getTime()}_${groups.shard}`;

      return {
        key,
        type: EntryType.JoinPu,
        shard: groups.shard,
      };
    },
  },

  {
    id: "ownDeath",
    // <2025-11-30T13:13:55.134Z> [Notice] <[ActorState] Dead> [ACTOR STATE][CSCActorControlStateDead::PrePhysicsUpdate] Actor 'ind3x' [202028778295] ejected from zone 'RSI_Zeus_CL_7838674991315' [7838674991315] to zone 'pyro4' [7610665712799] due to previous zone being in a destroyed vehicle with detached interior. [Team_ActorFeatures][Actor]
    regex: /^<(?<isoDate>[\d\-T:.Z]+)>.*\<\[ActorState\] Dead\>.*$/gm,
    matchMapping: (date, groups): Omit<IOwnDeathEntry, "isoDate"> => {
      const key = `${date.getTime()}_${groups.elevatorName}`;

      return {
        key,
        type: EntryType.OwnDeath,
      };
    },
  },
];
