import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findUploadAuthorOptions } from "@sam-monorepo/application";
import { cache } from "react";

export const getUploadAuthors = cache(
  withTrace("getUploadAuthors", async () => {
    try {
      return await findUploadAuthorOptions(
        getApplicationContext(),
        await getRequestActor(),
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
