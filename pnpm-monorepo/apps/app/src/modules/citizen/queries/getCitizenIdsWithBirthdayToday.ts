import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { listCitizenIdsWithBirthdayToday } from "@sam-monorepo/application";
import { cache } from "react";

export const getCitizenIdsWithBirthdayToday = cache(
  withTrace("getCitizenIdsWithBirthdayToday", async () =>
    listCitizenIdsWithBirthdayToday(
      getApplicationContext(),
      await getRequestActor(),
    ),
  ),
);
