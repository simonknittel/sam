import { SmallBadge } from "@/modules/common/components/SmallBadge";

interface Props {
  readonly gameEnvironment: string | null;
  readonly gameBuild: string | null;
}

/**
 * The game environment and the build number of the log file of an entry, as
 * the log file connector read them (principle 15 of
 * `docs/remote-control-program/README.md`). Empty when both are unknown.
 */
export const EntryGameBuildCell = ({ gameEnvironment, gameBuild }: Props) => {
  const text = [gameEnvironment, gameBuild]
    .filter((value) => value !== null)
    .join(" ");

  return (
    <td
      className="flex min-w-0 items-center gap-1 overflow-hidden"
      title={text || undefined}
    >
      {gameEnvironment !== null && (
        <SmallBadge value={gameEnvironment} className="shrink-0" />
      )}

      {gameBuild !== null && (
        <span className="min-w-0 truncate text-white/60">{gameBuild}</span>
      )}
    </td>
  );
};
