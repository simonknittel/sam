import type { PrismaClientType } from "@sam-monorepo/database";
import type { Prisma } from "@sam-monorepo/database/client";

/**
 * After the object is deleted, such a string grants nothing. Run it in the same
 * transaction as the delete of the object.
 *
 * No permission check: the caller deletes the object and checks its permission.
 * The function is not `async`: it gives the `PrismaPromise`, thus a batch
 * `$transaction([...])` accepts it.
 */
export const deletePermissionStringsReferencing = (
  client: Pick<PrismaClientType, "permissionString">,
  key: string,
  id: string,
): Prisma.PrismaPromise<Prisma.BatchPayload> =>
  client.permissionString.deleteMany({
    where: {
      OR: [
        { permissionString: { contains: `;${key}=${id};` } },
        { permissionString: { endsWith: `;${key}=${id}` } },
      ],
    },
  });
