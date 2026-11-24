import { getApplicationContext, getRequestActor } from "@/modules/application";
import { buildWikiContext, type WikiContext } from "@sam-monorepo/application";
import { cache } from "react";

export type {
  WikiContext,
  WikiContextPage,
  WikiSharedContext,
  WikiSharedContextPage,
} from "@sam-monorepo/application";

export const getWikiContext = cache(async (): Promise<WikiContext | null> =>
  buildWikiContext(getApplicationContext(), await getRequestActor()),
);
