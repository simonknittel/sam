import { prisma } from "@/db";

/**
 * Deletes the permission strings that refer to one object through the
 * attribute `<key>=<id>`, for example `otherRole;assign;roleId=<id>`. After
 * the object is deleted, such a string grants nothing. Run it in the same
 * transaction as the delete of the object.
 */
export const deletePermissionStringsReferencing = (key: string, id: string) =>
  prisma.permissionString.deleteMany({
    where: {
      OR: [
        { permissionString: { contains: `;${key}=${id};` } },
        { permissionString: { endsWith: `;${key}=${id}` } },
      ],
    },
  });
