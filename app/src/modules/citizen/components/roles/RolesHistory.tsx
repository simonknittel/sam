import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { Tile } from "@/modules/common/components/Tile";
import { formatDate } from "@/modules/common/utils/formatDate";
import { SingleRole } from "@/modules/roles/components/SingleRole";
import { getVisibleRoles } from "@/modules/roles/utils/getRoles";
import { type Entity } from "@prisma/client";
import clsx from "clsx";

interface Props {
  readonly className?: string;
  readonly entity: Entity;
}

export const RolesHistory = async ({ className, entity }: Props) => {
  await requireAuthentication();

  const [logs, visibleRoles] = await Promise.all([
    prisma.entityLog.findMany({
      where: {
        entityId: entity.id,
        type: {
          in: ["role-added", "role-removed"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        content: true,
        submittedBy: {
          select: {
            name: true,
          },
        },
      },
    }),
    getVisibleRoles(),
  ]);

  const entries = logs
    .filter((log) => {
      if (!log.content) return false;
      return visibleRoles.some((visibleRole) => visibleRole.id === log.content);
    })
    .map((log) => {
      const role = visibleRoles.find((role) => role.id === log.content)!;

      let message;
      switch (log.type) {
        case "role-added":
          message = (
            <>
              Die Rolle <SingleRole key={role.id} role={role} /> wurde
              hinzugefügt.
            </>
          );
          break;
        case "role-removed":
          message = (
            <>
              Die Rolle <SingleRole key={role.id} role={role} /> wurde entfernt.
            </>
          );
          break;
      }

      return {
        id: log.id,
        date: log.createdAt,
        message,
        author: log.submittedBy?.name,
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

                  {entry.author ? <> • {entry.author}</> : null}
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
