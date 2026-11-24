import { getRequestActor } from "@/modules/application";
import { toEventTemplateViewer } from "@sam-monorepo/application";
import { cache } from "react";

export const getEventTemplateViewer = cache(async () =>
  toEventTemplateViewer(await getRequestActor()),
);
