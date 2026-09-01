"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { PATTERNS, type EntryType } from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly type: EntryType;
  readonly disabled: boolean;
}

export const SharingEntryTypeCheckbox = ({ type, disabled }: Props) => {
  const { sharingEntryTypes, setSharingEntryTypes } = useLogAnalyzerContext();

  const { title, icon: Icon } = PATTERNS[type];

  const label = (
    <span className="flex items-center gap-2">
      <Icon className="shrink-0" />
      {title}
    </span>
  );

  return (
    <YesNoCheckbox
      yesLabel={label}
      noLabel={label}
      labelClassName="text-sm flex-1"
      checked={sharingEntryTypes[type]}
      disabled={disabled}
      onChange={(event) => setSharingEntryTypes(type, event.target.checked)}
    />
  );
};
