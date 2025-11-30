import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { formatDate } from "@/modules/common/utils/formatDate";
import clsx from "clsx";
import { memo } from "react";
import styles from "./Entry.module.css";
import { gridTemplateColumns } from "./LogAnalyzer";
import { TargetCell } from "./TargetCell";

export enum EntryType {
  Kill,
  Corpse,
  JoinPu,
  ContestedZoneElevator,
  AsdElevator,
  OwnDeath,
}

interface IBaseEntry {
  readonly key: string;
  readonly isoDate: Date;
  readonly isNew?: boolean;
}

export interface IKillEntry extends IBaseEntry {
  readonly type: EntryType.Kill;
  readonly target: string;
  readonly zone: string;
  readonly killer: string;
  readonly weapon: string;
  readonly damageType: string;
}

export interface ICorpseEntry extends IBaseEntry {
  readonly type: EntryType.Corpse;
  readonly target: string;
}

export interface IJoinPuEntry extends IBaseEntry {
  readonly type: EntryType.JoinPu;
  readonly shard: string;
}

export interface IContestedZoneElevatorEntry extends IBaseEntry {
  readonly type: EntryType.ContestedZoneElevator;
  readonly elevatorName: string;
}

export interface IAsdElevatorEntry extends IBaseEntry {
  readonly type: EntryType.AsdElevator;
  readonly elevatorName: string;
}

export interface IOwnDeathEntry extends IBaseEntry {
  readonly type: EntryType.OwnDeath;
}

export type IEntry =
  | IKillEntry
  | ICorpseEntry
  | IJoinPuEntry
  | IContestedZoneElevatorEntry
  | IAsdElevatorEntry
  | IOwnDeathEntry;

interface Props {
  readonly className?: string;
  readonly entry: IEntry;
}

export const Entry = memo(
  function Entry({ className, entry }: Props) {
    const now = new Date();
    const showRelativeDate =
      entry.isoDate.getTime() > now.getTime() - 1000 * 60 * 60 * 24;

    return (
      <tr
        className={clsx(
          "grid gap-4 h-10 -mx-2 first:mt-2",
          { [styles.Row]: entry.isNew },
          className,
        )}
        style={{
          gridTemplateColumns,
        }}
      >
        <td className="p-2 flex items-center relative">
          {showRelativeDate ? (
            <RelativeDate date={entry.isoDate} updateInterval={10_000} />
          ) : (
            <time
              dateTime={entry.isoDate.toISOString()}
              title={formatDate(entry.isoDate) || undefined}
            >
              {formatDate(entry.isoDate)}
            </time>
          )}

          {entry.isNew && (
            <div
              className={clsx(
                "absolute left-0 top-0 bg-amber-500 text-black uppercase text-xs px-1 rounded-br-secondary",
                styles.New,
              )}
            >
              Neu
            </div>
          )}
        </td>

        <TargetCell entry={entry} />

        <td className="overflow-hidden">
          {/* {entry.type === EntryType.Kill && <RSILink handle={entry.killer} />} */}

          {/* {entry.type === EntryType.Corpse && (
            <div className="text-neutral-500 p-2 h-full flex items-center">
              <span className="truncate" title="Leiche entdeckt">
                Leiche entdeckt
              </span>
            </div>
          )} */}

          {entry.type === EntryType.JoinPu && (
            <div className="text-neutral-500 p-2 h-full flex items-center">
              <span className="truncate" title="Shard beigetreten">
                Shard beigetreten
              </span>
            </div>
          )}

          {/* {entry.type === EntryType.ContestedZoneElevator && (
            <div className="text-neutral-500 p-2 h-full flex items-center">
              <span
                className="truncate"
                title="Aufzug (Contested Zone) benutzt"
              >
                Aufzug (Contested Zone) benutzt
              </span>
            </div>
          )} */}

          {/* {entry.type === EntryType.AsdElevator && (
            <div className="text-neutral-500 p-2 h-full flex items-center">
              <span className="truncate" title="Aufzug (ASD) benutzt">
                Aufzug (ASD) benutzt
              </span>
            </div>
          )} */}

          {entry.type === EntryType.OwnDeath && (
            <div className="text-neutral-500 p-2 h-full flex items-center">
              <span className="truncate" title="Gestorben">
                Gestorben
              </span>
            </div>
          )}
        </td>

        <td className="p-2 flex items-center truncate">
          {/* {entry.type === EntryType.Kill && (
            <span className="truncate" title={entry.weapon}>
              {entry.weapon}
            </span>
          )} */}
        </td>

        <td className="p-2 flex items-center truncate">
          {/* {entry.type === EntryType.Kill && (
            <span className="truncate" title={entry.damageType}>
              {entry.damageType}
            </span>
          )} */}
        </td>

        <td className="p-2 flex items-center truncate">
          {/* {entry.type === EntryType.Kill && (
            <span className="truncate" title={entry.zone}>
              {entry.zone}
            </span>
          )} */}
        </td>
      </tr>
    );
  },
  (previousProps, nextProps) => previousProps.entry.key === nextProps.entry.key,
);
