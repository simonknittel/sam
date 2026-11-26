"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import {
  ENTRY_CATEGORY_TITLES,
  ENTRY_TYPES_BY_CATEGORY,
  EntryCategory,
  PATTERNS,
} from "@/modules/log-analyzer/utils/PATTERNS";
import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { useId, useState, type ReactNode } from "react";
import {
  countLogEntryTypesThatAreOn,
  formatLogEntryTypeCount,
  type LogEntryTypeRules,
} from "./logEntryTypeRules";
import { SharingPopoverCollapsible } from "./SharingPopoverCollapsible";

type ChangeLogEntryTypes = (
  types: readonly LogAnalyzerEntryType[],
  isOn: boolean,
) => void;

interface Props {
  readonly logEntryTypes: LogEntryTypeRules;
  readonly onChange: ChangeLogEntryTypes;
}

/**
 * The rules of the local access layer for each log entry type, by the
 * categories of the Log Analyzer. A list shows only the newest version of a
 * type: one rule applies to all versions of a type.
 */
export const LogEntryTypeSettings = ({ logEntryTypes, onChange }: Props) => {
  const onCount = countLogEntryTypesThatAreOn(logEntryTypes);
  // Without a type that is on, the list is the next step of the owner
  const [isExpanded, setIsExpanded] = useState(onCount === 0);

  return (
    <SharingPopoverCollapsible
      heading="Typen auswählen"
      summary={`${formatLogEntryTypeCount(logEntryTypes)} ausgewählt`}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    >
      <div className="gap-x-8 sm:columns-2">
        {Object.values(EntryCategory).map((category) => (
          <CategorySettings
            key={category}
            category={category}
            logEntryTypes={logEntryTypes}
            onChange={onChange}
          />
        ))}
      </div>
    </SharingPopoverCollapsible>
  );
};

interface CategorySettingsProps {
  readonly category: EntryCategory;
  readonly logEntryTypes: LogEntryTypeRules;
  readonly onChange: ChangeLogEntryTypes;
}

/** The types of one category, and one switch for all of them */
const CategorySettings = ({
  category,
  logEntryTypes,
  onChange,
}: CategorySettingsProps) => {
  const types = ENTRY_TYPES_BY_CATEGORY[category];
  if (types.length === 0) return null;

  const onCount = types.filter((type) => logEntryTypes[type]).length;

  return (
    <fieldset className="mb-4 flex break-inside-avoid flex-col gap-1">
      <legend className="mb-1 font-mono text-xs text-neutral-500 uppercase">
        {ENTRY_CATEGORY_TITLES[category]}
      </legend>

      <ul className="flex flex-col gap-1">
        <TypeRuleRow
          label="Alle"
          isOn={onCount === types.length}
          isPartlyOn={onCount > 0 && onCount < types.length}
          onChange={(isOn) => onChange(types, isOn)}
        />

        {types.map((type) => {
          const { title, icon: Icon } = PATTERNS[type];

          return (
            <TypeRuleRow
              key={type}
              label={title}
              icon={<Icon aria-hidden className="flex-none text-white/40" />}
              isOn={logEntryTypes[type]}
              onChange={(isOn) => onChange([type], isOn)}
            />
          );
        })}
      </ul>
    </fieldset>
  );
};

interface TypeRuleRowProps {
  readonly label: string;
  readonly icon?: ReactNode;
  readonly isOn: boolean;
  /** Only a part of the types of the row is on */
  readonly isPartlyOn?: boolean;
  readonly onChange: (isOn: boolean) => void;
}

const TypeRuleRow = ({
  label,
  icon,
  isOn,
  isPartlyOn = false,
  onChange,
}: TypeRuleRowProps) => {
  const id = useId();

  return (
    <li className="flex items-center gap-2 text-sm">
      <label
        htmlFor={id}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 hover:text-white active:text-neutral-300"
      >
        {icon}

        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
      </label>

      <YesNoCheckbox
        id={id}
        hideLabel
        checked={isOn}
        isIndeterminate={isPartlyOn}
        onChange={(event) => onChange(event.target.checked)}
      />
    </li>
  );
};
