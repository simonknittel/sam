import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  getCitizenLogTablePage,
  getConfirmationFilterWhere,
  getReadableCitizenLogWhere,
  type CitizenLogTableType,
} from "@/modules/citizen/queries/getCitizenLogTablePage";
import { loadCitizenLogTableSearchParams } from "@/modules/citizen/utils/citizenLogTableSearchParams";
import { getFilterValues } from "@/modules/common/utils/filterCheckboxListParsers";
import type { CitizenLogType } from "@/types";
import type { Prisma } from "@sam-monorepo/database/client";
import clsx from "clsx";
import type { SearchParams } from "nuqs/server";
import { CitizenLogTablePagination } from "./CitizenLogTableLinks";
import { OtherFilters } from "./OtherFilters";
import { OtherTable } from "./OtherTable";

const IDENTITY_LOG_TYPES: readonly CitizenLogTableType[] = [
  "handle",
  "discord-id",
  "teamspeak-id",
  "community-moniker",
  "citizen-id",
];

interface Props {
  readonly className?: string;
  readonly searchParams: Promise<SearchParams>;
}

const OtherTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  const { filters, sort, page } =
    await loadCitizenLogTableSearchParams(searchParams);

  const visibleWhere = await getReadableCitizenLogWhere(
    IDENTITY_LOG_TYPES,
    authentication,
  );

  const types = getFilterValues(filters, "type");
  const filteredWhere: Prisma.CitizenLogWhereInput = {
    AND: [
      visibleWhere,
      getConfirmationFilterWhere(filters) ?? {},
      types.length > 0 ? { type: { in: types } } : {},
    ],
  };

  const [{ logs, totalPages }, options] = await Promise.all([
    getCitizenLogTablePage(filteredWhere, sort, page),
    prisma.citizenLog.groupBy({
      by: ["type", "confirmed"],
      where: visibleWhere,
    }),
  ]);

  const confirmationStates = [
    ...new Set(options.map((option) => option.confirmed)),
  ];
  const optionTypes = [
    ...new Set(options.map((option) => option.type as CitizenLogType)),
  ];

  return (
    <section
      className={clsx(
        "overflow-auto rounded-primary bg-neutral-800/50 p-6",
        className,
      )}
    >
      <div className="mb-6">
        <OtherFilters
          confirmationStates={confirmationStates}
          types={optionTypes}
        />
      </div>

      <OtherTable rows={logs} />

      <div className="mt-6 flex justify-center">
        <CitizenLogTablePagination totalPages={totalPages} />
      </div>
    </section>
  );
};

export default OtherTableTile;
