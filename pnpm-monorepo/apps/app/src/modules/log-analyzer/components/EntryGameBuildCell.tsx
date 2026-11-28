import { SmallBadge } from "@/modules/common/components/SmallBadge";

interface Props {
  readonly gameChannel: string | null;
  readonly gameVersion: string | null;
}

/**
 * The game channel and the game version of the log file of an entry, as the
 * log file connector read them (principle 15 of
 * `docs/remote-control-program/README.md`). Empty when both are unknown.
 */
export const EntryGameBuildCell = ({ gameChannel, gameVersion }: Props) => {
  const text = [gameChannel, gameVersion]
    .filter((value) => value !== null)
    .join(" ");

  return (
    <td
      className="flex min-w-0 items-center gap-1 overflow-hidden"
      title={text || undefined}
    >
      {gameChannel !== null && (
        <SmallBadge value={gameChannel} className="shrink-0" />
      )}

      {gameVersion !== null && (
        <span className="min-w-0 truncate text-white/60">{gameVersion}</span>
      )}
    </td>
  );
};
