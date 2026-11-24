import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findManagedRole } from "@sam-monorepo/application";
import { cache } from "react";

export const getRoleById = cache(
  withTrace("getRoleById", async (id: string) => {
    try {
      return await findManagedRole(
        getApplicationContext(),
        await getRequestActor(),
        id,
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
