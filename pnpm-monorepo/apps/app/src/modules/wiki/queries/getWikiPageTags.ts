import {
  getApplicationContext,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findWikiPageTags, type WikiScope } from "@sam-monorepo/application";
import { cache } from "react";

export const getWikiPageTags = cache(
  withTrace("getWikiPageTags", async (scope: WikiScope, pageId: string) => {
    try {
      return await findWikiPageTags(getApplicationContext(), scope, pageId);
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
