import { prisma } from "@/db";
import { Tile } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { mapOrganizationMembershipHistoryEntries } from "@/modules/spynet/components/ActivityTile/mapOrganizationMembershipHistoryEntries";
import { ConfirmationStatus } from "@prisma/client";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly id: string;
}

export const OrganizationMembershipHistory = async ({
  className,
  id,
}: Props) => {
  const result = await prisma.organizationMembershipHistoryEntry.findMany({
    orderBy: [
      {
        confirmedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    where: {
      confirmed: ConfirmationStatus.CONFIRMED,
      citizenId: id,
    },
    take: 15,
    include: {
      organization: true,
      citizen: true,
    },
  });

  const entries = await mapOrganizationMembershipHistoryEntries(result);

  const sortedEntries = entries.toSorted(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  return (
    <Tile heading="Verlauf" className={clsx(className)}>
      {sortedEntries.length > 0 ? (
        <ul className="flex flex-col gap-8">
          {sortedEntries.map((entry) => (
            <li key={entry.key}>
              <div className="text-sm flex gap-2 border-b pb-2 mb-2 items-center border-neutral-800/50 flex-wrap text-neutral-500">
                <p>
                  <time dateTime={entry.date.toISOString()}>
                    {formatDate(entry.date)}
                  </time>
                </p>
              </div>

              <div>{entry.message}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500">Keine Aktivität vorhanden</p>
      )}
    </Tile>
  );
};
