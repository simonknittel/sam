import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
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
import type { EntityLogConfirmationState } from "@/types";
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

  const entityLogs = await prisma.entityLog.findMany({
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
    include: {
      entity: true,
      attributes: {
        where: {
          key: "confirmed",
        },
        include: {
          createdBy: true,
        },
      },
      submittedBy: true,
    },
  });

  const rows = entityLogs.map((entityLog): Row => {
    const confirmed = entityLog.attributes.find(
      (attribute) => attribute.key === "confirmed",
    );

    return {
      entity: entityLog.entity,
      confirmationState: confirmed?.value as
        EntityLogConfirmationState | undefined,
      confirmedAt: confirmed?.createdAt,
      confirmedBy: confirmed?.createdBy,
      entityLog,
    };
  });

  const authenticatedRows = (
    await Promise.all(
      rows.map(async (row) => {
        return {
          row,
          canRead: await isAllowedToRead(row.entityLog, authentication),
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
      if (filters.includes(`type-${row.entityLog.type}`)) {
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
          a.entityLog.createdAt.getTime(),
          b.entityLog.createdAt.getTime(),
        );

      default:
        return sortDescAndNullLast(
          a.entityLog.createdAt.getTime(),
          b.entityLog.createdAt.getTime(),
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
