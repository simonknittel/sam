import { useLogAnalyzerContext } from "./LogAnalyzerContext";

/** An item of the toolbar, thus it stays next to the buttons */
export const FeedStatus = () => {
  const { feed } = useLogAnalyzerContext();

  if (!feed.isLoading) return null;

  return <p className="text-sm text-white/60">Lade Einträge …</p>;
};
