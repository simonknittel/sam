import { type requireAuthentication } from "@/modules/auth/server";
import {
  type CitizenLog,
  type CitizenLogAttribute,
} from "@sam-monorepo/database/client";

export default async function isAllowedToRead(
  citizenLog: Pick<CitizenLog, "type"> & {
    readonly attributes: readonly Pick<CitizenLogAttribute, "key" | "value">[];
  },
  authentication: Awaited<ReturnType<typeof requireAuthentication>>,
) {
  if (["discord-id", "teamspeak-id"].includes(citizenLog.type)) {
    const allowedToRead = await authentication.authorize(
      // @ts-expect-error The authorization types need to get improved
      citizenLog.type,
      "read",
    );

    if (!allowedToRead) return false;
  }

  const confirmed = citizenLog.attributes.find(
    (attribute) => attribute.key === "confirmed",
  );

  if (confirmed?.value !== "confirmed") {
    // @ts-expect-error The authorization types need to get improved
    return authentication.authorize(citizenLog.type, "confirm");
  }

  return true;
}
