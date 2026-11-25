import { useLogAnalyzerContext } from "./LogAnalyzerContext";

/** The first line is an item of the toolbar, thus it stays next to the buttons */
export const FeedStatus = () => {
  const { isLivePaused, feed } = useLogAnalyzerContext();

  return (
    <>
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
