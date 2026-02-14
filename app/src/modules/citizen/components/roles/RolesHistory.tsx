import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Tile } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { RoleAssignmentChangeType, type Entity } from "@prisma/client";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly entity: Entity;
}

export const RolesHistory = async ({ className, entity }: Props) => {
  await requireAuthentication();

  const [roleAssignmentChanges, visibleRoles] = await Promise.all([
    prisma.roleAssignmentChange.findMany({
      where: {
        citizenId: entity.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        roleId: true,
        type: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            handle: true,
          },
        },
      },
    }),

    getVisibleRoles(),
  ]);

  const entries = roleAssignmentChanges
    .filter((change) =>
      visibleRoles.some((visibleRole) => visibleRole.id === change.roleId),
    )
    .map((change) => {
      let message;
      switch (change.type) {
        case RoleAssignmentChangeType.ADD:
          message = (
            <>
              Die Rolle{" "}
              <SingleRoleBadge key={change.roleId} roleId={change.roleId} />{" "}
              wurde hinzugefügt.
            </>
          );
          break;
        case RoleAssignmentChangeType.REMOVE:
          message = (
            <>
              Die Rolle{" "}
              <SingleRoleBadge key={change.roleId} roleId={change.roleId} />{" "}
              wurde entfernt.
            </>
          );
          break;
        default:
          throw new Error(
            `Unknown change.type: ${change.type satisfies never}`,
          );
      }

      return {
        id: change.id,
        date: change.createdAt,
        message,
        author: change.createdBy,
      };
    });

  return (
    <Tile heading="Verlauf" className={clsx(className)}>
      {entries.length > 0 ? (
        <ul className="flex flex-col gap-8">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="text-sm flex gap-2 border-b pb-2 mb-2 items-center border-neutral-800/50 flex-wrap text-neutral-500">
                <p>
                  <time dateTime={entry.date.toISOString()}>
                    {formatDate(entry.date)}
                  </time>

                  {entry.author ? (
                    <>
                      {" "}
                      • <CitizenLink citizen={entry.author} />
                    </>
                  ) : null}
                </p>
              </div>

              <div className="flex items-center gap-1">{entry.message}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500">Keine Aktivität vorhanden</p>
      )}
    </Tile>
  );
};
