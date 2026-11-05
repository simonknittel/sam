"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { TRow } from "@/modules/common/components/Table";
import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import {
  ENTRY_CATEGORY_TITLES,
  ENTRY_TYPES_BY_CATEGORY,
  type EntryCategory,
} from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface CheckboxCellProps {
  readonly label: string;
  readonly types: readonly LogAnalyzerEntryType[];
  readonly enabledTypes: Record<LogAnalyzerEntryType, boolean>;
  readonly disabled?: boolean;
  readonly onChange: (
    types: readonly LogAnalyzerEntryType[],
    isEnabled: boolean,
  ) => void;
}

/** A click on a section with only some enabled types enables all of them. */
const CheckboxCell = ({
  label,
  types,
  enabledTypes,
  disabled,
  onChange,
}: CheckboxCellProps) => {
  const enabledTypeCount = types.filter((type) => enabledTypes[type]).length;

  return (
    <td className="pt-2 text-center">
      <YesNoCheckbox
        hideLabel
        aria-label={label}
        checked={enabledTypeCount === types.length}
        isIndeterminate={
          enabledTypeCount > 0 && enabledTypeCount < types.length
        }
        disabled={disabled}
        onChange={(event) => onChange(types, event.target.checked)}
      />
    </td>
  );
};

interface Props {
  readonly category: EntryCategory;
  readonly showSharingColumns: boolean;
  /** False while the user cannot share, for example without a citizen */
  readonly canShare: boolean;
}

/** The heading of a section. Its checkboxes set all types of the section. */
export const EntryCategorySettingsRow = ({
  category,
  showSharingColumns,
  canShare,
}: Props) => {
  const {
    ownEntryTypes,
    setOwnEntryTypes,
    sharingEntryTypes,
    setSharingEntryTypes,
    othersEntryTypes,
    setOthersEntryTypes,
  } = useLogAnalyzerContext();

  const title = ENTRY_CATEGORY_TITLES[category];
  const types = ENTRY_TYPES_BY_CATEGORY[category];

  return (
    <TRow className="hover:bg-transparent">
      <td className="flex items-center pt-2 font-mono text-xs text-white/40 uppercase">
        {title}
      </td>

      <CheckboxCell
        label={`Bereich ${title}: Eigene anzeigen`}
        types={types}
        enabledTypes={ownEntryTypes}
        onChange={setOwnEntryTypes}
      />

      {showSharingColumns && (
        <>
          <CheckboxCell
            label={`Bereich ${title}: Teilen`}
            types={types}
            enabledTypes={sharingEntryTypes}
            disabled={!canShare}
            onChange={setSharingEntryTypes}
          />

          <CheckboxCell
            label={`Bereich ${title}: Andere anzeigen`}
            types={types}
            enabledTypes={othersEntryTypes}
            onChange={setOthersEntryTypes}
          />
        </>
      )}
    </TRow>
  );
};
