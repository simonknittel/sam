import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { findWikiPageContent, type WikiScope } from "@sam-monorepo/application";
import { cache } from "react";

export type { WikiPageStaticContent } from "@sam-monorepo/application";

export const getWikiPageStaticContent = cache(
  async (scope: WikiScope, pageId: string) => {
    try {
      return await findWikiPageContent(
        getApplicationContext(),
        await getRequestActor(),
        scope,
        pageId,
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  },
);
