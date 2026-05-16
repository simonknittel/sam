import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import { notFound } from "next/navigation";
import {
  createLoader,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getBlueprints } from "../queries/getBlueprints";
import { getGameVersions } from "../queries/getGameVersions";
import { BlueprintsTable } from "./BlueprintsTable";

const loadSearchParams = createLoader({
  gameVersionId: parseAsString.withDefault(""),
  unlockStatus: parseAsStringLiteral([
    "all",
    "unlocked",
    "not_unlocked",
  ]).withDefault("all"),
  sort: parseAsStringLiteral([
    "name-asc",
    "name-desc",
    "count-asc",
    "count-desc",
  ]).withDefault("count-desc"),
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const BlueprintsTile = async ({ className, searchParams }: Props) => {
  const gameVersions = await getGameVersions();

  const { gameVersionId, unlockStatus, sort, cursor, direction } =
    await loadSearchParams(searchParams);

  const _gameVersionId = gameVersionId || gameVersions.default;
  if (!_gameVersionId) notFound();

  const { blueprints, nextCursor, prevCursor } = await getBlueprints({
    gameVersionId: _gameVersionId,
    unlockStatus,
    sort,
    cursor,
    direction,
  });

  return (
    <section
      className={clsx(
        "rounded-primary bg-neutral-800/50 p-4 overflow-x-auto",
        className,
      )}
    >
      {blueprints.length === 0 ? (
        <div className="grid place-content-center">
          <p className="text-white/90">Keine Blaupausen gefunden</p>
        </div>
      ) : (
        <>
          <BlueprintsTable blueprints={blueprints} />

          <CursorPaginationControls
            nextCursor={nextCursor}
            prevCursor={prevCursor}
            className="mt-4"
          />
        </>
      )}
    </section>
  );
};
