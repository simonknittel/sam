import {
  type EntityLog,
  type EntityLogAttribute,
} from "@/generated/prisma/client";

export default function getLatestNoteAttributes(
  note: EntityLog & {
    attributes: EntityLogAttribute[];
  },
) {
  const attributes = note.attributes.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const noteTypeId = attributes.find(
    (attribute) => attribute.key === "noteTypeId",
  );

  const classificationLevelId = attributes.find(
    (attribute) => attribute.key === "classificationLevelId",
  );

  const confirmed = attributes.find(
    (attribute) => attribute.key === "confirmed",
  );

  return {
    noteTypeId,
    classificationLevelId,
    confirmed,
  };
}
