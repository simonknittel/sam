import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  type CitizenLogTableType,
  getCitizenLogTablePage,
  getConfirmationFilterWhere,
  getFilterValues,
  getReadableCitizenLogWhere,
} from "@/modules/citizen/queries/getCitizenLogTablePage";
import { toConfirmationState } from "@/modules/citizen/utils/citizenLogConfirmation";
import Pagination from "@/modules/common/components/Pagination";
import { getCurrentPageFromSearchParams } from "@/modules/common/utils/pagination";
import type { CitizenLogType } from "@/types";
import type { Prisma } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { OtherFilters } from "./OtherFilters";
import { type Row, OtherTable } from "./OtherTable";

const IDENTITY_LOG_TYPES: readonly CitizenLogTableType[] = [
  "handle",
  "discord-id",
  "teamspeak-id",
  "community-moniker",
  "citizen-id",
];

interface Props {
  readonly className?: string;
  readonly searchParams: URLSearchParams;
}

const OtherTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  const visibleWhere = await getReadableCitizenLogWhere(
    IDENTITY_LOG_TYPES,
    authentication,
  );

  const filters = searchParams.get("filters")?.split(",") ?? [];
  const types = getFilterValues(filters, "type-");
  const filteredWhere: Prisma.CitizenLogWhereInput = {
    AND: [
      visibleWhere,
      getConfirmationFilterWhere(filters) ?? {},
      types.length > 0 ? { type: { in: types } } : {},
    ],
  };

  const [{ logs, totalPages }, options] = await Promise.all([
    getCitizenLogTablePage(
      filteredWhere,
      searchParams.get("sort"),
      getCurrentPageFromSearchParams(searchParams),
    ),
    prisma.citizenLog.groupBy({
      by: ["type", "confirmed"],
      where: visibleWhere,
    }),
  ]);

  const rows = logs.map((citizenLog): Row => ({
    entity: citizenLog.citizen,
    confirmationState: toConfirmationState(citizenLog.confirmed),
    confirmedAt: citizenLog.confirmedAt ?? undefined,
    confirmedBy: citizenLog.confirmedBy,
    citizenLog,
  }));

  const confirmationStates = [
    ...new Set(
      options.map(
        (option) => toConfirmationState(option.confirmed) ?? "unconfirmed",
      ),
    ),
  ];
  const optionTypes = [
    ...new Set(options.map((option) => option.type as CitizenLogType)),
  ];

  return (
    <section
      className={clsx(
        "p-6 bg-neutral-800/50 rounded-primary overflow-auto",
        className,
      )}
    >
      <div className="mb-6">
        <OtherFilters
          confirmationStates={confirmationStates}
          types={optionTypes}
        />
      </div>

      <OtherTable rows={rows} searchParams={searchParams} />

      <div className="flex justify-center mt-6">
        <Pagination
          totalPages={totalPages}
          currentPage={getCurrentPageFromSearchParams(searchParams)}
          searchParams={searchParams}
        />
      </div>
    </section>
  );
};

export default OtherTableTile;
