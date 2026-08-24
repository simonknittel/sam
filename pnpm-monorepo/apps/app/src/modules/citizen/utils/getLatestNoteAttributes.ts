import { type EntityLogAttribute } from "@sam-monorepo/database/client";

/**
 * Generic over the attribute shape so a call site that also selected the
 * author keeps it on the returned attributes.
 */
export default function getLatestNoteAttributes<
  Attribute extends Pick<EntityLogAttribute, "key" | "createdAt">,
>(note: { readonly attributes: readonly Attribute[] }) {
  const attributes = note.attributes.toSorted(
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
