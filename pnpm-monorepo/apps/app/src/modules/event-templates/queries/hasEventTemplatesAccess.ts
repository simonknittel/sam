import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { canAccessEventTemplates } from "@sam-monorepo/application";
import { cache } from "react";

export const hasEventTemplatesAccess = cache(
  withTrace("hasEventTemplatesAccess", async () =>
    canAccessEventTemplates(getApplicationContext(), await getRequestActor()),
  ),
);
