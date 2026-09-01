import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { FaInfoCircle } from "react-icons/fa";
import { TfiReload } from "react-icons/tfi";
import { EntryFilters } from "./EntryFilters";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";
import { OverlayButton } from "./OverlayButton";
import { SharingSettings } from "./SharingSettings";

interface Props {
  readonly className?: string;
  readonly onRefresh: () => void;
}

export const Toolbar = ({ className, onRefresh }: Props) => {
  const {
    isPending,
    isAutostartEnabled,
    setIsAutostartEnabled,
    isLiveModeEnabled,
    setIsLiveModeEnabled,
    isSharingAvailable,
  } = useLogAnalyzerContext();

  return (
    <div
      className={clsx(
        "bg-secondary rounded-primary p-2 flex flex-wrap items-center gap-4",
        className,
      )}
    >
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        disabled={isPending}
        onClick={onRefresh}
      >
        {isPending ? <AsciiSpinner /> : <TfiReload />}
        Aktualisieren
      </Button2>

      <YesNoCheckbox
        yesLabel={
          <span className="flex items-center gap-2 text-sm">
            Automatisch aktualisieren
            <Tooltip triggerChildren={<FaInfoCircle />}>
              <p>Aktualisiert die Logs alle 10 Sekunden.</p>
              <p className="mt-1">
                Neue Einträge werden für 60 Sekunden hervorgehoben.
              </p>
            </Tooltip>
          </span>
        }
        noLabel={
          <span className="flex items-center gap-2 text-sm">
            Automatisch aktualisieren
            <Tooltip triggerChildren={<FaInfoCircle />}>
              <p>Aktualisiert die Logs alle 10 Sekunden.</p>
              <p className="mt-1">
                Neue Einträge werden für 30 Sekunden hervorgehoben.
              </p>
            </Tooltip>
          </span>
        }
        labelClassName="w-auto"
        checked={isLiveModeEnabled}
        onChange={(e) => setIsLiveModeEnabled(e.target.checked)}
      />

      <YesNoCheckbox
        yesLabel={
          <span className="flex items-center gap-2 text-sm">
            Autostart
            <Tooltip triggerChildren={<FaInfoCircle />}>
              <p>
                Startet den Log Analyzer beim Aufruf der App automatisch mit dem
                zuletzt verwendeten Ordner.
              </p>
            </Tooltip>
          </span>
        }
        noLabel={
          <span className="flex items-center gap-2 text-sm">
            Autostart
            <Tooltip triggerChildren={<FaInfoCircle />}>
              <p>
                Startet den Log Analyzer beim Aufruf der App automatisch mit dem
                zuletzt verwendeten Ordner.
              </p>
            </Tooltip>
          </span>
        }
        labelClassName="w-auto"
        checked={isAutostartEnabled}
        onChange={(e) => setIsAutostartEnabled(e.target.checked)}
      />

      <OverlayButton />

      <EntryFilters />

      {isSharingAvailable && <SharingSettings />}
    </div>
  );
};
