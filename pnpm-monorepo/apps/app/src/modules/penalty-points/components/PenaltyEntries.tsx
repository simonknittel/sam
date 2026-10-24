import { requireAuthenticationPage } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { PenaltyEntryStatus } from "@sam-monorepo/application";
import clsx from "clsx";
import { parseAsStringEnum, type SearchParams } from "nuqs/server";
import { getPenaltyEntriesPaginated } from "../queries/getPenaltyEntriesPaginated";
import { CreatePenaltyEntryButton } from "./CreatePenaltyEntry/CreatePenaltyEntryButton";
import { PenaltyEntriesTable } from "./PenaltyEntriesTable";

const loadSearchParams = createCursorPaginationLoader({
  status: parseAsStringEnum([
    PenaltyEntryStatus.Active,
    PenaltyEntryStatus.Inactive,
    PenaltyEntryStatus.Deleted,
  ]).withDefault(PenaltyEntryStatus.Active),
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const PenaltyEntries = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthenticationPage();
  const { status, cursor, direction } = await loadSearchParams(searchParams);

  const { entries, nextCursor, prevCursor } = await getPenaltyEntriesPaginated(
    status,
    cursor,
    direction,
  );

  const hasEntries = entries.length > 0;

  const [showCreate, showDelete] = await Promise.all([
    authentication.authorize("penaltyEntry", "create"),
    authentication.authorize("penaltyEntry", "delete"),
  ]);

  return (
    <Tile
      heading="Strafpunkte"
      cta={showCreate ? <CreatePenaltyEntryButton /> : null}
      className={clsx(className)}
    >
      {hasEntries ? (
        <div className="flex flex-col gap-4">
          <PenaltyEntriesTable rows={entries} showDelete={showDelete} />

          <CursorPaginationControls
            nextCursor={nextCursor}
            prevCursor={prevCursor}
          />
        </div>
      ) : (
        <p className="italic">Keine Strafpunkte gefunden.</p>
      )}
    </Tile>
  );
};
