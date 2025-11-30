import clsx from "clsx";
import { useMemo } from "react";
import { EntryType, type IEntry, type IJoinPuEntry } from "./Entry";

interface Props {
  readonly className?: string;
  readonly entry: IEntry;
}

export const TargetCell = ({ className, entry }: Props) => {
  return (
    <td className={clsx("overflow-hidden", className)}>
      {/* {entry.type === EntryType.Kill && <RSILink handle={entry.target} />} */}

      {/* {entry.type === EntryType.Corpse && <RSILink handle={entry.target} />} */}

      {entry.type === EntryType.JoinPu && <JoinPuCell entry={entry} />}

      {/* {entry.type === EntryType.ContestedZoneElevator && (
        <div className="px-2 h-full flex items-center">
          <span title={entry.elevatorName} className="truncate">
            {entry.elevatorName}
          </span>
        </div>
      )} */}

      {/* {entry.type === EntryType.AsdElevator && (
        <div className="px-2 h-full flex items-center">
          <span title={entry.elevatorName} className="truncate">
            {entry.elevatorName}
          </span>
        </div>
      )} */}
    </td>
  );
};

interface JoinPuProps {
  readonly className?: string;
  readonly entry: IJoinPuEntry;
}

const shardRegex = /^pub_(?<region>[a-z0-9]+)_\w+_(?<number>\d+)$/m;

const JoinPuCell = ({ className, entry }: JoinPuProps) => {
  const text = useMemo(() => {
    const match = shardRegex.exec(entry.shard);
    if (!match?.groups) return entry.shard;

    let region = match.groups.region;
    if (region.startsWith("eu")) region = "EU";
    if (region.startsWith("us")) region = "USA";
    if (region.startsWith("ape")) region = "ASIA";
    if (region.startsWith("apse")) region = "AUS";

    let number = match.groups.number;
    number = number.replace(/^0+/, "");

    return (
      <>
        {region} {number}{" "}
        <span className="text-neutral-500">({entry.shard})</span>
      </>
    );
  }, [entry.shard]);

  return (
    <div className={clsx("px-2 h-full flex items-center", className)}>
      <span title={entry.shard} className="truncate">
        {text}
      </span>
    </div>
  );
};
