import { Button2 } from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { Popover } from "@/modules/common/components/Popover";
import clsx from "clsx";
import { FaFilter } from "react-icons/fa";
import { EntryFilterKey, useEntryFilterContext } from "./EntryFilterContext";

interface Props {
  readonly className?: string;
}

export const EntryFilters = ({ className }: Props) => {
  const { entryFilters, setEntryFilters } = useEntryFilterContext();

  return (
    <Popover
      trigger={
        <Button2 variant="secondary" className={clsx(className)}>
          <FaFilter />
          Filter
        </Button2>
      }
      childrenClassName="flex flex-col gap-1 w-80"
      enableHover
    >
      {/* <YesNoCheckbox
        yesLabel="Aufzüge (Contested Zone)"
        noLabel="Aufzüge (Contested Zone)"
        labelClassName="text-sm flex-1"
        checked={!entryFilters[EntryFilterKey.HideContestedZoneElevator]}
        onChange={(e) =>
          setEntryFilters(
            EntryFilterKey.HideContestedZoneElevator,
            !e.target.checked,
          )
        }
      />

      <YesNoCheckbox
        yesLabel="Aufzüge (ASD)"
        noLabel="Aufzüge (ASD)"
        labelClassName="text-sm flex-1"
        checked={!entryFilters[EntryFilterKey.HideAsdElevator]}
        onChange={(e) =>
          setEntryFilters(EntryFilterKey.HideAsdElevator, !e.target.checked)
        }
      /> */}

      <YesNoCheckbox
        yesLabel="Kills (NPCs)"
        noLabel="Kills (NPCs)"
        labelClassName="text-xs flex-1"
        checked={!entryFilters[EntryFilterKey.HideNpcKill]}
        onChange={(e) =>
          setEntryFilters(EntryFilterKey.HideNpcKill, !e.target.checked)
        }
      />

      <YesNoCheckbox
        yesLabel="Kills (Spieler)"
        noLabel="Kills (Spieler)"
        labelClassName="text-xs flex-1"
        checked={!entryFilters[EntryFilterKey.HidePlayerKill]}
        onChange={(e) =>
          setEntryFilters(EntryFilterKey.HidePlayerKill, !e.target.checked)
        }
      />

      <YesNoCheckbox
        yesLabel="Leichen"
        noLabel="Leichen"
        labelClassName="text-sm flex-1"
        checked={!entryFilters[EntryFilterKey.HideCorpse]}
        onChange={(e) =>
          setEntryFilters(EntryFilterKey.HideCorpse, !e.target.checked)
        }
      />

      <YesNoCheckbox
        yesLabel="Shard-Beitritte"
        noLabel="Shard-Beitritte"
        labelClassName="text-sm flex-1"
        checked={!entryFilters[EntryFilterKey.HideJoinPu]}
        onChange={(e) =>
          setEntryFilters(EntryFilterKey.HideJoinPu, !e.target.checked)
        }
      />
    </Popover>
  );
};
