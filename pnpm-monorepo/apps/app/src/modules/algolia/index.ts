import { env } from "@/env";
import { log } from "@/modules/logging";
import { type Entity } from "@sam-monorepo/database/client";
import { algoliasearch } from "algoliasearch";
import { serializeError } from "serialize-error";

export const indexName = "spynet_entities";

export function getClient() {
  return algoliasearch(
    env.NEXT_PUBLIC_ALGOLIA_APP_ID,
    env.ALGOLIA_ADMIN_API_KEY,
  );
}

/**
 * Mirrors a database write into the search index. Every caller runs this
 * after its own write has already been committed, so a failing index must
 * not turn a completed create or delete into an error for the user — it is
 * logged and the request carries on with a stale index instead.
 */
const mirrorIntoIndex = async (
  operation: () => Promise<unknown>,
  context: Record<string, unknown>,
) => {
  try {
    await operation();
  } catch (error) {
    log.error("Search index update failed", {
      ...context,
      error: serializeError(error),
    });
  }
};

export function saveObject(
  entityId: Entity["id"],
  attributes: Record<string, unknown>,
) {
  const client = getClient();

  return mirrorIntoIndex(
    () =>
      client.saveObject({
        indexName,
        body: {
          objectID: entityId,
          ...attributes,
        },
      }),
    { operation: "saveObject", entityId },
  );
}

export function updateObject(
  entityId: Entity["id"],
  attributes: Record<string, unknown>,
) {
  const client = getClient();

  return mirrorIntoIndex(
    () =>
      client.partialUpdateObject({
        indexName,
        objectID: entityId,
        attributesToUpdate: attributes,
        // algoliasearch v4's `partialUpdateObject` defaulted to not creating
        // missing objects. Keep that behavior since the v5 default is `true`.
        createIfNotExists: false,
      }),
    { operation: "updateObject", entityId },
  );
}

export function deleteObject(entityId: Entity["id"]) {
  const client = getClient();

  return mirrorIntoIndex(
    () =>
      client.deleteObject({
        indexName,
        objectID: entityId,
      }),
    { operation: "deleteObject", entityId },
  );
}
