import { type requireAuthentication } from "@/modules/auth/server";
import { getNotePermissionAttributes } from "@/modules/citizen/utils/notePermissionAttributes";
import { type CitizenLog } from "@sam-monorepo/database/client";

export default function isAllowedToReadRedacted(
  note: Pick<CitizenLog, "noteTypeId" | "classificationLevelId" | "confirmed">,
  authentication: Awaited<ReturnType<typeof requireAuthentication>>,
) {
  return authentication.authorize(
    "note",
    "readRedacted",
    getNotePermissionAttributes(note),
  );
}
