import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { findSpynetActivityActors } from "@sam-monorepo/application";
import { cache } from "react";

export const getSpynetActivityActors = cache(async () => {
  try {
    return await findSpynetActivityActors(
      getApplicationContext(),
      await getRequestActor(),
    );
  } catch (error) {
    return throwApplicationErrorForPage(error);
  }
});
