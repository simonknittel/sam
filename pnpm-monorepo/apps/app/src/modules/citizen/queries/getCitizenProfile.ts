import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import {
  getCitizenProfile as getCitizenProfileUseCase,
  NotFoundError,
} from "@sam-monorepo/application";
import type { Citizen } from "@sam-monorepo/database/client";
import { cache } from "react";

export type { CitizenProfile } from "@sam-monorepo/application";

/** Null when the citizen does not exist */
export const getCitizenProfile = cache(async (id: Citizen["id"]) => {
  try {
    return await getCitizenProfileUseCase(
      getApplicationContext(),
      await getRequestActor(),
      { citizen_id: id },
    );
  } catch (error) {
    if (error instanceof NotFoundError) return null;

    return throwApplicationErrorForPage(error);
  }
});
