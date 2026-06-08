import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { Popover } from "@/modules/common/components/Popover";
import clsx from "clsx";
import { FaFilter } from "react-icons/fa";
import { type EntryType, PATTERNS } from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

export const EntryFilters = ({ className }: Props) => {
  const { entryFilters, setEntryFilters } = useLogAnalyzerContext();

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
      {Object.entries(PATTERNS)
        .toSorted((a, b) => a[1].title.localeCompare(b[1].title))
        .map(([key, pattern]) => (
          <YesNoCheckbox
            key={pattern.title}
            yesLabel={pattern.title}
            noLabel={pattern.title}
            labelClassName="text-sm flex-1"
            checked={!entryFilters[key as EntryType]}
            onChange={(e) =>
              setEntryFilters(key as EntryType, !e.target.checked)
            }
          />
        ))}
    </Popover>
  );
};
