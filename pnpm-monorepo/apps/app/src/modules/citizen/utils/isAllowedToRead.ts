import {
  type EntityLog,
  type EntityLogAttribute,
} from "@/generated/prisma/client";
import { type requireAuthentication } from "@/modules/auth/server";

export default async function isAllowedToRead(
  entityLog: EntityLog & {
    attributes: EntityLogAttribute[];
  },
  authentication: Awaited<ReturnType<typeof requireAuthentication>>,
) {
  if (["discord-id", "teamspeak-id"].includes(entityLog.type)) {
    const allowedToRead = await authentication.authorize(
      // @ts-expect-error
      entityLog.type,
      "read",
    );

    if (!allowedToRead) return false;
  }

  const confirmed = entityLog.attributes.find(
    (attribute) => attribute.key === "confirmed",
  );

  if (confirmed?.value !== "confirmed") {
    // @ts-expect-error
    return authentication.authorize(entityLog.type, "confirm");
  }

  return true;
}
