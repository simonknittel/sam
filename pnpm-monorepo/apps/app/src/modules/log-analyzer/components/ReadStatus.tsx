import { useBrowserRuntime } from "@/modules/remote-control-program/runtime/useBrowserRuntime";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

const BYTES_PER_MEGABYTE = 1_000_000;

const megabyteFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

const formatMegabytes = (byteCount: number) =>
  megabyteFormat.format(byteCount / BYTES_PER_MEGABYTE);

/**
 * The lines are items of the toolbar, thus the short ones stay next to the
 * buttons.
 */
export const ReadStatus = () => {
  const { isLivePaused, feed } = useLogAnalyzerContext();
  const runtime = useBrowserRuntime();
  const readProgress = runtime?.state.readProgress ?? null;
  const logSelection = runtime?.state.logSelection ?? null;

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

      {feed.isLoading && (
        <p className="text-sm text-white/60">Lade Einträge …</p>
      )}

      {isLivePaused && (
        <p className="w-full text-sm text-white/60">
          Neue Einträge erscheinen nicht, weil der Zeitraum in der Vergangenheit
          endet.
        </p>
      )}
    </>
  );
};
