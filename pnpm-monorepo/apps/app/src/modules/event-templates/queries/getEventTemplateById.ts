import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findEventTemplateDetails,
  NotFoundError,
} from "@sam-monorepo/application";
import { cache } from "react";

/**
 * Null when the template does not exist or the viewer may not see it — the two
 * are deliberately indistinguishable, so every caller turns null into a 404.
 */
export const getEventTemplateById = cache(
  withTrace("getEventTemplateById", async (templateId: string) => {
    try {
      return await findEventTemplateDetails(
        getApplicationContext(),
        await getRequestActor(),
        { templateId },
      );
    } catch (error) {
      if (error instanceof NotFoundError) return null;

      return throwApplicationErrorForPage(error);
    }
  }),
);
