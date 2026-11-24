import {
  getApplicationContext,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findWikiPageOwner, type WikiContext } from "@sam-monorepo/application";
import { cache } from "react";

export const getWikiPageOwner = cache(
  withTrace("getWikiPageOwner", async (scope: WikiContext, pageId: string) => {
    try {
      return await findWikiPageOwner(getApplicationContext(), scope, pageId);
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
