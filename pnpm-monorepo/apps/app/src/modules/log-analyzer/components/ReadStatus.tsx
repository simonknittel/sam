import type { LogSelection } from "../utils/selectLogFiles";
import type { ReadProgress } from "../utils/types";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const BYTES_PER_MEGABYTE = 1_000_000;

const megabyteFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

const formatMegabytes = (byteCount: number) =>
  megabyteFormat.format(byteCount / BYTES_PER_MEGABYTE);

interface Props {
  readonly logSelection: LogSelection | null;
  readonly readProgress: ReadProgress | null;
  readonly isLoadingSharedEntries: boolean;
}

/**
 * What the Log Analyzer reads, also while the dialogs are closed. The lines
 * are items of the toolbar, thus the short ones stay next to the buttons.
 */
export const ReadStatus = ({
  logSelection,
  readProgress,
  isLoadingSharedEntries,
}: Props) => {
  const { isLivePaused } = useLogAnalyzerContext();

  /** A live read holds one file and ends at once */
  const isLargeRead = readProgress !== null && readProgress.fileCount > 1;

  return (
    <>
      {isLargeRead ? (
        <p className="text-sm text-white/60">
          Lese {readProgress.readFileCount} von {readProgress.fileCount} Dateien
          ({formatMegabytes(readProgress.readByteCount)} von{" "}
          {formatMegabytes(readProgress.byteCount)} MB)
        </p>
      ) : (
        logSelection && (
          <p className="text-sm text-white/60">
            {logSelection.selectedFileCount} von {logSelection.fileCount}{" "}
            Sessions, {formatMegabytes(logSelection.selectedByteCount)} MB
          </p>
        )
      )}

      {isLoadingSharedEntries && (
        <p className="text-sm text-white/60">Lade geteilte Einträge …</p>
      )}

      {isLivePaused && (
        <p className="w-full text-sm text-white/60">
          Automatisch aktualisieren ist pausiert, weil der Zeitraum in der
          Vergangenheit endet.
        </p>
      )}
    </>
  );
};
