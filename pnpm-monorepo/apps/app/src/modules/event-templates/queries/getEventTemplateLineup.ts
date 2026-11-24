import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findEventTemplatePositionTree } from "@sam-monorepo/application";
import { cache } from "react";

export const getEventTemplateLineup = cache(
  withTrace("getEventTemplateLineup", async (templateId: string) => {
    try {
      return await findEventTemplatePositionTree(
        getApplicationContext(),
        await getRequestActor(),
        { templateId },
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
