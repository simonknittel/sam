import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import {
  listUpcomingBirthdays,
  UPCOMING_BIRTHDAYS_HANDLE_QUERY_MAXIMUM_LENGTH,
} from "@sam-monorepo/application";
import { cache } from "react";

export type { UpcomingBirthday } from "@sam-monorepo/application";

export const getUpcomingBirthdays = cache(
  async (handleQuery: string | null = null) => {
    try {
      return await listUpcomingBirthdays(
        getApplicationContext(),
        await getRequestActor(),
        {
          // The query comes from the URL, thus it can be longer
          handle_query:
            handleQuery?.slice(
              0,
              UPCOMING_BIRTHDAYS_HANDLE_QUERY_MAXIMUM_LENGTH,
            ) ?? null,
        },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  },
);
