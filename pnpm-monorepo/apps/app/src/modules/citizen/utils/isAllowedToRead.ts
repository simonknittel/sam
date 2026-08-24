import { type requireAuthentication } from "@/modules/auth/server";
import {
  type EntityLog,
  type EntityLogAttribute,
} from "@sam-monorepo/database/client";

export default async function isAllowedToRead(
  entityLog: Pick<EntityLog, "type"> & {
    readonly attributes: readonly Pick<EntityLogAttribute, "key" | "value">[];
  },
  authentication: Awaited<ReturnType<typeof requireAuthentication>>,
) {
  if (["discord-id", "teamspeak-id"].includes(entityLog.type)) {
    const allowedToRead = await authentication.authorize(
      // @ts-expect-error The authorization types need to get improved
      entityLog.type,
      "read",
    );

    if (!allowedToRead) return false;
  }

  const confirmed = entityLog.attributes.find(
    (attribute) => attribute.key === "confirmed",
  );

  if (confirmed?.value !== "confirmed") {
    // @ts-expect-error The authorization types need to get improved
    return authentication.authorize(entityLog.type, "confirm");
  }

  return true;
}
