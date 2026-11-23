"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { TRow } from "@/modules/common/components/Table";
import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import { PATTERNS } from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { QuickLookToggle } from "./QuickLookToggle";

interface Props {
  readonly type: LogAnalyzerEntryType;
}

/**
 * The checkboxes carry the title of the type in their name, because their
 * Ja/Nein text is their state.
 */
export const EntryTypeSettingsRow = ({ type }: Props) => {
  const {
    ownEntryTypes,
    setOwnEntryTypes,
    othersEntryTypes,
    setOthersEntryTypes,
  } = useLogAnalyzerContext();

  const { title, icon: Icon } = PATTERNS[type];

  return (
    <TRow>
      <td className="flex items-center gap-2">
        <Icon className="shrink-0 text-white/40" />

        <span className="min-w-0 flex-1 truncate" title={title}>
          {title}
        </span>

        <QuickLookToggle type={type} />
      </td>

      <td className="text-center">
        <YesNoCheckbox
          hideLabel
          aria-label={`${title}: Eigene anzeigen`}
          checked={ownEntryTypes[type]}
          onChange={(event) => setOwnEntryTypes([type], event.target.checked)}
        />
      </td>

      <td className="text-center">
        <YesNoCheckbox
          hideLabel
          aria-label={`${title}: Andere anzeigen`}
          checked={othersEntryTypes[type]}
          onChange={(event) =>
            setOthersEntryTypes([type], event.target.checked)
          }
        />
      </td>
    </TRow>
  );
};
