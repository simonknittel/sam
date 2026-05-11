import { requireAuthentication } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import clsx from "clsx";
import {
  createLoader,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getSilcTransactionsPaginated } from "../queries";
import { SilcTransactionsTable } from "./SilcTransactionsTable";

const loadSearchParams = createLoader({
  showDeleted: parseAsStringLiteral(["alle", "deleted"]).withDefault("alle"),
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const AllSilcTransactionsTable = async ({
  className,
  searchParams,
}: Props) => {
  const authentication = await requireAuthentication();
  const { showDeleted, cursor, direction } =
    await loadSearchParams(searchParams);

  const { transactions, nextCursor, prevCursor } =
    await getSilcTransactionsPaginated(showDeleted, cursor, direction);

  const hasEntries = transactions.length > 0;

  const [showEdit, showDelete] = await Promise.all([
    authentication.authorize("silcTransactionOfOtherCitizen", "update"),
    authentication.authorize("silcTransactionOfOtherCitizen", "delete"),
  ]);

  return (
    <Tile heading="Transaktionen" className={clsx(className)}>
      {hasEntries ? (
        <div className="flex flex-col gap-4">
          <SilcTransactionsTable
            rows={transactions}
            showEdit={showEdit}
            showDelete={showDelete}
          />

          <CursorPaginationControls
            nextCursor={nextCursor}
            prevCursor={prevCursor}
            className="mt-4"
          />
        </div>
      ) : (
        <p className="italic">Bisher wurden keine SILC verteilt.</p>
      )}
    </Tile>
  );
};
