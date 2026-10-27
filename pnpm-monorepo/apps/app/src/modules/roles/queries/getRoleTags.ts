import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findManagedRoleTag,
  findManagedRoleTags,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * All tags with all of their roles, for the tag list of the IAM app.
 * Requires `role;manage`.
 */
export const getManagedRoleTags = cache(
  withTrace("getManagedRoleTags", async () => {
    try {
      return await findManagedRoleTags(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);

/**
 * The tag of the tag page, or null when it does not exist. Requires
 * `role;manage`.
 */
export const getManagedRoleTag = cache(
  withTrace("getManagedRoleTag", async (id: string) => {
    try {
      return await findManagedRoleTag(
        getApplicationContext(),
        await getRequestActor(),
        id,
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
