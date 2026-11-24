import { getApplicationContext } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  findWikiTagPages,
  type WikiPageScope,
} from "@sam-monorepo/application";
import { cache } from "react";

export const getWikiTagPages = cache(
  withTrace("getWikiTagPages", (scope: WikiPageScope, tagId: string) =>
    findWikiTagPages(getApplicationContext(), scope, tagId),
  ),
);
