import { env } from "@/env";
import { type Entity } from "@sam-monorepo/database/client";
import { algoliasearch } from "algoliasearch";

export const indexName = "spynet_entities";

export function getClient() {
  return algoliasearch(
    env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    env.ALGOLIA_ADMIN_API_KEY,
  );
}

export function saveObject(
  entityId: Entity["id"],
  attributes: Record<string, unknown>,
) {
  const client = getClient();

  return client.saveObject({
    indexName,
    body: {
      objectID: entityId,
      ...attributes,
    },
  });
}

export function updateObject(
  entityId: Entity["id"],
  attributes: Record<string, unknown>,
) {
  const client = getClient();

  return client.partialUpdateObject({
    indexName,
    objectID: entityId,
    attributesToUpdate: attributes,
    // algoliasearch v4's `partialUpdateObject` defaulted to not creating
    // missing objects. Keep that behavior since the v5 default is `true`.
    createIfNotExists: false,
  });
}

export function deleteObject(entityId: Entity["id"]) {
  const client = getClient();

  return client.deleteObject({
    indexName,
    objectID: entityId,
  });
}
