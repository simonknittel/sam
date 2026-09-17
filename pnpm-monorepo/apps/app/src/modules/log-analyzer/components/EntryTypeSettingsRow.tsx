"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { TRow } from "@/modules/common/components/Table";
import { PATTERNS, type EntryType } from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly type: EntryType;
  readonly showSharingColumns: boolean;
  /** False while the user cannot share, for example without a citizen */
  readonly canShare: boolean;
}

/**
 * One row of the settings table. The checkboxes carry the title of the type
 * in their name, because their Ja/Nein text is their state and not their
 * name.
 */
export const EntryTypeSettingsRow = ({
  type,
  showSharingColumns,
  canShare,
}: Props) => {
  const {
    ownEntryTypes,
    setOwnEntryType,
    sharingEntryTypes,
    setSharingEntryType,
    othersEntryTypes,
    setOthersEntryType,
  } = useLogAnalyzerContext();

  const { title, icon: Icon } = PATTERNS[type];

  return (
    <TRow>
      <td className="flex items-center gap-2 truncate" title={title}>
        <Icon className="shrink-0 text-white/40" />
        {title}
      </td>

      <td className="text-center">
        <YesNoCheckbox
          hideLabel
          aria-label={`${title}: Eigene anzeigen`}
          checked={ownEntryTypes[type]}
          onChange={(event) => setOwnEntryType(type, event.target.checked)}
        />
      </td>

      {showSharingColumns && (
        <>
          <td className="text-center">
            <YesNoCheckbox
              hideLabel
              aria-label={`${title}: Teilen`}
              checked={sharingEntryTypes[type]}
              disabled={!canShare}
              onChange={(event) =>
                setSharingEntryType(type, event.target.checked)
              }
            />
          </td>

          <td className="text-center">
            <YesNoCheckbox
              hideLabel
              aria-label={`${title}: Andere anzeigen`}
              checked={othersEntryTypes[type]}
              onChange={(event) =>
                setOthersEntryType(type, event.target.checked)
              }
            />
          </td>
        </>
      )}
    </TRow>
  );
};
