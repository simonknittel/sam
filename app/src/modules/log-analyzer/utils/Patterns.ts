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
  // {
  //   id: "kill",
  //   regex:
  //     /^<(?<isoDate>[\d\-T:.Z]+)>.+CActor::Kill.+'(?<target>.*)'.+'(?<zone>.*)'.+'(?<killer>.*)'.+'(?<weapon>.*)'.+'(?<damageType>.*)'.+$/gm,
  //   matchMapping: (date, groups): Omit<IKillEntry, "isoDate"> => {
  //     const key = `${date.getTime()}_${groups.target}`;

  //     return {
  //       key,
  //       type: EntryType.Kill,
  //       target: groups.target,
  //       zone: groups.zone,
  //       killer: groups.killer,
  //       weapon: groups.weapon,
  //       damageType: groups.damageType,
  //     };
  //   },
  // },

  // {
  //   id: "corpse",
  //   // <2025-05-28T22:14:04.694Z> [Notice] <[ActorState] Corpse> [ACTOR STATE][SSCActorStateCVars::LogCorpse] Player 'Test' <remote client>: Running corpsify for corpse. [Team_ActorFeatures][Actor]
  //   regex: /^<(?<isoDate>[\d\-T:.Z]+)>.+'(?<target>.*)'.+Running corpsify.+$/gm,
  //   matchMapping: (date, groups): Omit<ICorpseEntry, "isoDate"> => {
  //     const key = `${date.getTime()}_${groups.target}`;

  //     return {
  //       key,
  //       type: EntryType.Corpse,
  //       target: groups.target,
  //     };
  //   },
  // },

  // {
  //   id: "corpse2",
  //   regex: /^<(?<isoDate>[\d\-T:.Z]+)>.+LogCorpse.+'(?<target>.*)'.+$/gm,
  // },

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

  // {
  //   id: "contestedZoneElevator",
  //   // <2025-09-25T18:10:58.240Z> [Notice] <TransitCarriageStartTransit> [TRANSITDEBUG] [TRANSIT CARRIAGE] [ECarriageGeneral] : Carriage 0 (Id: 6282799725663) for manager TransitManager_TransitDungeonRewardRoom_A_6136502412541 starting transit in zone rs_cz_rewards_001 at position x: -0.000001, y: 135.000002, z: 0.249999 [Team_CGP2][TransitSystem]
  //   regex:
  //     /^<(?<isoDate>[\d\-T:.Z]+)>.*TransitManager_(?<elevatorName>[a-zA-Z]*Dungeon[a-zA-Z_]*)_\d+.*starting.*$/gm,
  //   matchMapping: (
  //     date,
  //     groups,
  //   ): Omit<IContestedZoneElevatorEntry, "isoDate"> => {
  //     const key = `${date.getTime()}_${groups.elevatorName}`;

  //     return {
  //       key,
  //       type: EntryType.ContestedZoneElevator,
  //       elevatorName: groups.elevatorName,
  //     };
  //   },
  // },

  // {
  //   id: "asdElevator",
  //   regex:
  //     /^<(?<isoDate>[\d\-T:.Z]+)>.*TransitManager_(?<elevatorName>ASD_[a-zA-Z_]*)_\d+.*starting.*$/gm,
  //   matchMapping: (date, groups): Omit<IAsdElevatorEntry, "isoDate"> => {
  //     const key = `${date.getTime()}_${groups.elevatorName}`;

  //     return {
  //       key,
  //       type: EntryType.AsdElevator,
  //       elevatorName: groups.elevatorName,
  //     };
  //   },
  // },

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
