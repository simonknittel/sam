import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { CursorPaginationControls } from "@/modules/common/CursorPagination/CursorPaginationControls";
import { cursorPaginationParsers } from "@/modules/common/CursorPagination/cursorPaginationParsers";
import { forbidden } from "next/navigation";
import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type SearchParams,
} from "nuqs/server";
import { getMyFleet } from "../queries/getMyFleet";
import { AssignShip } from "./AssignShip";
import { MyFleetTable } from "./MyFleetTable";

const loadSearchParams = createLoader({
  flight_ready: parseAsStringLiteral(["all", "flight_ready"]).withDefault(
    "all",
  ),
  sort: parseAsStringLiteral(["name-asc", "name-desc"]).withDefault("name-asc"),
  variantTags: parseAsArrayOf(parseAsString),
  manufacturerIds: parseAsArrayOf(parseAsString),
  showDeleted: parseAsStringLiteral(["all", "deleted"]).withDefault("all"),
  q: parseAsString,
  ...cursorPaginationParsers,
});

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const MyFleetTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();
  if (!(await authentication.authorize("ship", "manage"))) forbidden();

  const {
    flight_ready,
    sort,
    variantTags,
    manufacturerIds,
    showDeleted,
    q,
    cursor,
    direction,
  } = await loadSearchParams(searchParams);

  const [{ ships, total, nextCursor, prevCursor }, allVariants] =
    await Promise.all([
      getMyFleet({
        flightReady: flight_ready,
        variantTagIds: variantTags?.length ? variantTags : [],
        manufacturerIds: manufacturerIds?.length ? manufacturerIds : [],
        sort,
        showDeleted,
        searchQuery: q,
        cursor,
        direction,
      }),
      prisma.manufacturer.findMany({
        include: {
          series: {
            include: {
              variants: true,
            },
          },
        },
      }),
    ]);

  return (
    <section className={className}>
      <div className="flex mb-1 items-center gap-4">
        <p className="text-neutral-500 text-sm">Anzahl: {total}</p>

        <AssignShip data={allVariants} />
      </div>

      <div className="rounded-primary bg-neutral-800/50 p-4 overflow-x-auto mt-2">
        {ships.length === 0 ? (
          <div className="grid place-content-center">
            <p className="text-white/90">Keine Schiffe gefunden</p>
          </div>
        ) : (
          <>
            <MyFleetTable ships={ships} />

            <CursorPaginationControls
              nextCursor={nextCursor}
              prevCursor={prevCursor}
              className="mt-4"
            />
          </>
        )}
      </div>
    </section>
  );
};
