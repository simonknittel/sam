import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import {
  CITIZEN_LOG_ATTRIBUTE_SELECT,
  CITIZEN_LOG_TABLE_SELECT,
} from "@/modules/citizen/queries/citizenLogTableSelect";
import isAllowedToRead from "@/modules/citizen/utils/isAllowedToRead";
import Pagination from "@/modules/common/components/Pagination";
import {
  getCurrentPageFromSearchParams,
  limitRows,
  PER_PAGE,
} from "@/modules/common/utils/pagination";
import {
  sortAscWithAndNullLast,
  sortDescAndNullLast,
} from "@/modules/common/utils/sorting";
import type { CitizenLogConfirmationState } from "@/types";
import clsx from "clsx";
import { OtherFilters } from "./OtherFilters";
import { type Row, OtherTable } from "./OtherTable";

interface Props {
  readonly className?: string;
  readonly searchParams: URLSearchParams;
}

const OtherTableTile = async ({ className, searchParams }: Props) => {
  const authentication = await requireAuthentication();

  const currentPage = getCurrentPageFromSearchParams(searchParams);

  const citizenLogs = await prisma.citizenLog.findMany({
    where: {
      type: {
        in: [
          "handle",
          "discord-id",
          "teamspeak-id",
          "community-moniker",
          "citizen-id",
        ],
      },
    },
    select: {
      ...CITIZEN_LOG_TABLE_SELECT,
      attributes: {
        where: {
          key: "confirmed",
        },
        select: CITIZEN_LOG_ATTRIBUTE_SELECT,
      },
    },
  });

  const rows = citizenLogs.map((citizenLog): Row => {
    const confirmed = citizenLog.attributes.find(
      (attribute) => attribute.key === "confirmed",
    );

    return {
      entity: citizenLog.citizen,
      confirmationState: confirmed?.value as
        CitizenLogConfirmationState | undefined,
      confirmedAt: confirmed?.createdAt,
      confirmedBy: confirmed?.createdBy,
      citizenLog,
    };
  });

  const authenticatedRows = (
    await Promise.all(
      rows.map(async (row) => {
        return {
          row,
          canRead: await isAllowedToRead(row.citizenLog, authentication),
        };
      }),
    )
  )
    .filter((rowWithAuthCheck) => rowWithAuthCheck.canRead)
    .map((rowWithAuthCheck) => rowWithAuthCheck.row);

  const filters = searchParams.get("filters")?.split(",");
  const filteredRows = authenticatedRows.filter((row) => {
    if (!filters) return true;

    let confirmation;
    if (filters.some((filter) => filter.startsWith("confirmation-"))) {
      if (
        (filters.includes("confirmation-unconfirmed") &&
          !row.confirmationState) ||
        (filters.includes("confirmation-confirmed") &&
          row.confirmationState === "confirmed") ||
        (filters.includes("confirmation-false-report") &&
          row.confirmationState === "false-report")
      ) {
        confirmation = true;
      } else {
        confirmation = false;
      }
    } else {
      confirmation = true;
    }

    let type;
    if (filters.some((filter) => filter.startsWith("type-"))) {
      if (filters.includes(`type-${row.citizenLog.type}`)) {
        type = true;
      } else {
        type = false;
      }
    } else {
      type = true;
    }

    return confirmation && type;
  });

  const sortedRows = filteredRows.toSorted((a, b) => {
    switch (searchParams.get("sort")) {
      case "confirmed-at-asc":
        return sortAscWithAndNullLast(
          a.confirmedAt?.getTime(),
          b.confirmedAt?.getTime(),
        );
      case "confirmed-at-desc":
        return sortDescAndNullLast(
          a.confirmedAt?.getTime(),
          b.confirmedAt?.getTime(),
        );

      case "created-at-asc":
        return sortAscWithAndNullLast(
          a.citizenLog.createdAt.getTime(),
          b.citizenLog.createdAt.getTime(),
        );

      default:
        return sortDescAndNullLast(
          a.citizenLog.createdAt.getTime(),
          b.citizenLog.createdAt.getTime(),
        );
    }
  });

  const limitedRows = limitRows(sortedRows, currentPage);

  return (
    <section
      className={clsx(
        "p-6 bg-neutral-800/50 rounded-primary overflow-auto",
        className,
      )}
    >
      <div className="mb-6">
        <OtherFilters rows={authenticatedRows} />
      </div>

      <OtherTable rows={limitedRows} searchParams={searchParams} />

      <div className="flex justify-center mt-6">
        <Pagination
          totalPages={Math.ceil(sortedRows.length / PER_PAGE)}
          currentPage={currentPage}
          searchParams={searchParams}
        />
      </div>
    </section>
  );
};

export default OtherTableTile;
