import { Button2, Button2Variant } from "@/modules/common/components/Button2";
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
        <Button2 variant={Button2Variant.Secondary} className={clsx(className)}>
          <FaFilter />
          Filter
        </Button2>
      }
      childrenClassName="flex flex-col gap-1 w-80"
      enableHover
    >
      <YesNoCheckbox
        yesLabel="Shard-Beitritte"
        noLabel="Shard-Beitritte"
        labelClassName="text-sm flex-1"
        checked={!entryFilters[EntryFilterKey.HideJoinPu]}
        onChange={(e) =>
          setEntryFilters(EntryFilterKey.HideJoinPu, !e.target.checked)
        }
      />

      <YesNoCheckbox
        yesLabel="Eigene Tode"
        noLabel="Eigene Tode"
        labelClassName="text-sm flex-1"
        checked={!entryFilters[EntryFilterKey.OwnDeath]}
        onChange={(e) =>
          setEntryFilters(EntryFilterKey.OwnDeath, !e.target.checked)
        }
      />
    </Popover>
  );
};
