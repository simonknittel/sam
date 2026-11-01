import { requireAuthenticationPage } from "@/modules/auth/server";
import { CitizenCellLink } from "@/modules/common/components/CitizenCellLink";
import { TRow } from "@/modules/common/components/Table";
import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import type { SilcBalanceRow } from "@sam-monorepo/application";
import clsx from "clsx";
import {
  createLoader,
  parseAsStringEnum,
  type SearchParams,
} from "nuqs/server";
import { getSilcBalanceOfAllCitizens } from "../queries/getSilcBalanceOfAllCitizens";
import { SilcBalanceSort } from "../utils/silcBalanceSort";
import { CreateOrUpdateSilcTransaction } from "./CreateOrUpdateSilcTransaction";

const COLUMNS: TableColumn[] = [
  {
    key: "citizen",
    label: "Citizen",
    track: "minmax(160px,1fr)",
    minWidth: 160,
  },
  { key: "balance", label: "Kontostand", track: "96px", minWidth: 96 },
  { key: "earned", label: "Verdient", track: "96px", minWidth: 96 },
];

const loadSearchParams = createLoader({
  sort: parseAsStringEnum(Object.values(SilcBalanceSort)).withDefault(
    SilcBalanceSort.BalanceDescending,
  ),
});

/** Rows with the same amount keep the order of their handles */
const compareHandles = (a: SilcBalanceRow, b: SilcBalanceRow) =>
  sortAscWithAndNullLast(a.handle, b.handle);

const compareRows = (
  sort: SilcBalanceSort,
  a: SilcBalanceRow,
  b: SilcBalanceRow,
) => {
  switch (sort) {
    case SilcBalanceSort.BalanceDescending:
      return (
        sortDescAndNullLast(a.silcBalance, b.silcBalance) ||
        compareHandles(a, b)
      );
    case SilcBalanceSort.BalanceAscending:
      return (
        sortAscWithAndNullLast(a.silcBalance, b.silcBalance) ||
        compareHandles(a, b)
      );
    case SilcBalanceSort.TotalEarnedDescending:
      return (
        sortDescAndNullLast(a.totalEarnedSilc, b.totalEarnedSilc) ||
        compareHandles(a, b)
      );
    case SilcBalanceSort.TotalEarnedAscending:
      return (
        sortAscWithAndNullLast(a.totalEarnedSilc, b.totalEarnedSilc) ||
        compareHandles(a, b)
      );
    case SilcBalanceSort.HandleAscending:
      return compareHandles(a, b);
    case SilcBalanceSort.HandleDescending:
      return sortDescAndNullLast(a.handle, b.handle);
    default:
      throw new Error(`Unknown sort: ${sort satisfies never}`);
  }
};

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

export const SilcBalancesTable = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthenticationPage();
  const [showCreate, { sort }, rows] = await Promise.all([
    authentication.authorize("silcTransactionOfOtherCitizen", "create"),
    loadSearchParams(searchParams),
    getSilcBalanceOfAllCitizens(),
  ]);

  const sortedRows = rows.toSorted((a, b) => compareRows(sort, a, b));

  return (
    <TableTile
      className={className}
      heading="Übersicht"
      cta={showCreate ? <CreateOrUpdateSilcTransaction /> : null}
      columns={COLUMNS}
      isEmpty={sortedRows.length === 0}
      emptyMessage="Bisher wurden keine SILC verteilt."
    >
      {sortedRows.map((row) => (
        <BalanceRow key={row.id} row={row} />
      ))}
    </TableTile>
  );
};

interface BalanceRowProps {
  readonly row: SilcBalanceRow;
}

const BalanceRow = ({ row }: BalanceRowProps) => {
  return (
    <TRow>
      <td className="overflow-hidden">
        <CitizenCellLink citizen={row} page="/silc" className="h-8" />
      </td>

      <td
        className={clsx("font-bold", {
          "text-green-500": row.silcBalance > 0,
          "text-red-500": row.silcBalance < 0,
        })}
      >
        {row.silcBalance}
      </td>

      <td className="font-bold">{row.totalEarnedSilc}</td>
    </TRow>
  );
};
