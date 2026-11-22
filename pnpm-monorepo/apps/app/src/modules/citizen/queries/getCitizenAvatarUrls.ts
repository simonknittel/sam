import { getApplicationContext, getRequestActor } from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { findCitizenAvatarUrls } from "@sam-monorepo/application";

/**
 * The Discord avatars of the citizens that the viewer can read (see
 * `findCitizenAvatarUrls` of the application package)
 */
export const getCitizenAvatarUrls = withTrace(
  "getCitizenAvatarUrls",
  async (citizenIds: readonly string[]) =>
    findCitizenAvatarUrls(
      getApplicationContext(),
      await getRequestActor(),
      citizenIds,
    ),
);
