import { type requireAuthentication } from "@/modules/auth/server";
import getLatestNoteAttributes from "@/modules/common/utils/getLatestNoteAttributes";
import { type EntityLog, type EntityLogAttribute } from "@prisma/client";

export default function isAllowedToRead(
  note: EntityLog & {
    attributes: EntityLogAttribute[];
  },
  authentication: Awaited<ReturnType<typeof requireAuthentication>>,
) {
  const attributes = [];

  const { noteTypeId, classificationLevelId, confirmed } =
    getLatestNoteAttributes(note);

  if (noteTypeId?.value) {
    attributes.push({
      key: "noteTypeId",
      value: noteTypeId.value,
    });
  }

  if (classificationLevelId?.value) {
    attributes.push({
      key: "classificationLevelId",
      value: classificationLevelId.value,
    });
  }

  if (confirmed?.value !== "confirmed") {
    attributes.push({
      key: "alsoUnconfirmed",
      value: true,
    });
  }

  // @ts-expect-error The authorization types need to get overhauled
  return authentication.authorize("note", "read", attributes);
}
