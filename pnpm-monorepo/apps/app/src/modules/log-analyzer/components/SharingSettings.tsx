"use client";

import { useHasLinkedCitizen } from "@/modules/auth/hooks/useHasLinkedCitizen";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { FaShareNodes } from "react-icons/fa6";
import { SORTED_ENTRY_TYPES } from "../utils/PATTERNS";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { SharingEntryTypeCheckbox } from "./SharingEntryTypeCheckbox";

interface Props {
  readonly className?: string;
}

export const SharingSettings = ({ className }: Props) => {
  const {
    isSharingEnabled,
    setIsSharingEnabled,
    isSharedViewEnabled,
    setIsSharedViewEnabled,
  } = useLogAnalyzerContext();

  const hasLinkedCitizen = useHasLinkedCitizen();

  return (
    <PopoverBaseUI
      title="Teilen"
      trigger={
        <>
          <FaShareNodes />
          Teilen
        </>
      }
      triggerRender={<Button2 variant={Button2Variant.Secondary} />}
      triggerClassName={className}
      childrenClassName="flex flex-col gap-2 w-96"
      openOnHover={false}
    >
      <YesNoCheckbox
        yesLabel={<span className="text-sm">Eigene Einträge teilen</span>}
        noLabel={<span className="text-sm">Eigene Einträge teilen</span>}
        labelClassName="flex-1"
        checked={isSharingEnabled}
        disabled={!hasLinkedCitizen}
        onChange={(event) => setIsSharingEnabled(event.target.checked)}
      />

      <p className="text-sm text-white/60">
        {hasLinkedCitizen
          ? "Die unten aktivierten Events werden auf den Server hochgeladen und sind für andere sichtbar."
          : "Zum Teilen muss dein Account mit einem Spynet-Citizen verknüpft sein."}
      </p>

      <div className="flex flex-col gap-1 border-t border-white/20 pt-2">
        {SORTED_ENTRY_TYPES.map((type) => (
          <SharingEntryTypeCheckbox
            key={type}
            type={type}
            disabled={!isSharingEnabled || !hasLinkedCitizen}
          />
        ))}
      </div>

      <div className="border-t border-white/20 pt-2">
        <YesNoCheckbox
          className="w-full"
          yesLabel={
            <span className="text-sm">Einträge anderer Citizens anzeigen</span>
          }
          noLabel={
            <span className="text-sm">Einträge anderer Citizens anzeigen</span>
          }
          labelClassName="flex-1"
          checked={isSharedViewEnabled}
          onChange={(event) => setIsSharedViewEnabled(event.target.checked)}
        />
      </div>
    </PopoverBaseUI>
  );
};
