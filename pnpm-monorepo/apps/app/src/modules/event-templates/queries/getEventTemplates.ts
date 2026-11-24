import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  EVENT_TEMPLATE_LIST_QUERY_MAXIMUM_LENGTH,
  findEventTemplateListRows,
  findEventTemplateOwners,
  type EventTemplateListFilters,
} from "@sam-monorepo/application";
import { cache } from "react";

export const getEventTemplates = cache(
  withTrace("getEventTemplates", async (filters: EventTemplateListFilters) =>
    findEventTemplateListRows(
      getApplicationContext(),
      await getRequestActor(),
      {
        ...filters,
        // The search term comes straight from the URL
        query:
          filters.query?.slice(0, EVENT_TEMPLATE_LIST_QUERY_MAXIMUM_LENGTH) ??
          null,
      },
    ),
  ),
);

/** For `event;manage` holders */
export const getEventTemplateOwners = cache(
  withTrace("getEventTemplateOwners", async () =>
    findEventTemplateOwners(getApplicationContext(), await getRequestActor()),
  ),
);
