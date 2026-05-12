import { env } from "@/env";
import { type Entity } from "@/generated/prisma/client";
import algoliasearch from "algoliasearch";

export function getIndex() {
  const client = algoliasearch(
    env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    env.ALGOLIA_ADMIN_API_KEY,
  );

  return client.initIndex("spynet_entities");
}

export function saveObject(
  entityId: Entity["id"],
  attributes: Record<string, any>,
) {
  const index = getIndex();

  return index.saveObject({
    objectID: entityId,
    ...attributes,
  });
}

export function updateObject(
  entityId: Entity["id"],
  attributes: Record<string, any>,
) {
  const index = getIndex();

  return index.partialUpdateObject({
    objectID: entityId,
    ...attributes,
  });
}

export function deleteObject(entityId: Entity["id"]) {
  const index = getIndex();

  return index.deleteObject(entityId);
}
