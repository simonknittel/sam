import { getApplicationContext } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { listCitizenAvatarUrls } from "@sam-monorepo/application";
import { cache } from "react";

export const getCitizenAvatarUrls = cache(
  withTrace("getCitizenAvatarUrls", async () =>
    listCitizenAvatarUrls(getApplicationContext()),
  ),
);
