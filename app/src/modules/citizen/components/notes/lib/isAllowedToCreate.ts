import {
  type ClassificationLevel,
  type NoteType,
} from "@/generated/prisma/client";
import { type requireAuthentication } from "@/modules/auth/server";

export default function isAllowedToCreate(
  classificationLevelId: ClassificationLevel["id"],
  authentication: Awaited<ReturnType<typeof requireAuthentication>>,
  noteTypeId?: NoteType["id"],
) {
  const attributes = [
    {
      key: "classificationLevelId",
      value: classificationLevelId,
    },
  ];

  if (noteTypeId) {
    attributes.push({
      key: "noteTypeId",
      value: noteTypeId,
    });
  }

  // @ts-expect-error Don't know how to fix this
  return authentication.authorize("note", "create", attributes);
}
