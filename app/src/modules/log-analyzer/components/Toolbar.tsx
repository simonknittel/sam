import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { FaInfoCircle, FaSpinner } from "react-icons/fa";
import { TfiReload } from "react-icons/tfi";
import type { IEntry } from "../utils/PATTERNS";
import { EntryFilters } from "./EntryFilters";
import { OverlayButton } from "./OverlayButton";
import { OverlayProvider } from "./OverlayContext";

interface Props {
  readonly className?: string;
  readonly isPending: boolean;
  readonly isLiveModeEnabled: boolean;
  readonly onToggleLiveMode: (checked: boolean) => void;
  readonly isAutostartEnabled: boolean;
  readonly onToggleAutostart: (checked: boolean) => void;
  readonly onRefresh: () => void;
  readonly filteredEntries: IEntry[];
}

export const Toolbar = ({
  className,
  isPending,
  isLiveModeEnabled,
  onToggleLiveMode,
  isAutostartEnabled,
  onToggleAutostart,
  onRefresh,
  filteredEntries,
}: Props) => (
  <div
    className={clsx(
      "bg-secondary rounded-primary p-2 flex items-center gap-4",
      className,
    )}
  >
    <Button2
      type="button"
      variant={Button2Variant.Secondary}
      disabled={isPending}
      onClick={onRefresh}
    >
      {isPending ? <FaSpinner className="animate-spin" /> : <TfiReload />}
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
      onChange={(e) => onToggleLiveMode(e.target.checked)}
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
      onChange={(e) => onToggleAutostart(e.target.checked)}
    />

    <OverlayProvider>
      <OverlayButton entries={filteredEntries} />
    </OverlayProvider>

    <EntryFilters />
  </div>
);
