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
