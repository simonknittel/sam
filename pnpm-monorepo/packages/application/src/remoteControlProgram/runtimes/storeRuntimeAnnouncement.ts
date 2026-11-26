import { announceContentSchema, runtimeIdSchema } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../../actor.js";
import type { ApplicationContext } from "../../context.js";
import { rethrowRecordNotFound } from "../../errors.js";
import { withSpan } from "../../withSpan.js";
import { RemoteControlProgramErrorMessage } from "../access/remoteControlProgramErrors.js";
import { requireRemoteControlProgramUse } from "../access/remoteControlProgramPermissions.js";
import {
  OWN_RUNTIME_SELECT,
  toOwnRuntime,
  type OwnRuntime,
} from "./ownRuntime.js";

export const storeRuntimeAnnouncementInputSchema = z.object({
  runtime_id: runtimeIdSchema,
  /** The content of the `announce` */
  announcement: announceContentSchema,
});

export type StoreRuntimeAnnouncementInput = z.output<
  typeof storeRuntimeAnnouncementInputSchema
>;

/**
 * Stores the content of an `announce` of a runtime of the actor: the
 * connectors with their capabilities, and the summary of the local access
 * layer. It replaces the previous announcement. The relay service calls it
 * before it acknowledges the `announce`.
 *
 * @throws ForbiddenError without `remoteControlProgram;use` or a citizen
 * @throws NotFoundError when the actor has no runtime with the id
 * (`RemoteControlProgramErrorMessage.RuntimeNotFound`)
 */
export const storeRuntimeAnnouncement = (
  context: ApplicationContext,
  actor: Actor,
  input: StoreRuntimeAnnouncementInput,
): Promise<OwnRuntime> =>
  withSpan(context, "storeRuntimeAnnouncement", async () => {
    const citizen = requireRemoteControlProgramUse(actor);

    const runtime = await rethrowRecordNotFound(
      () =>
        context.prisma.remoteControlProgramRuntime.update({
          where: {
            ownerId_runtimeId: {
              ownerId: citizen.id,
              runtimeId: input.runtime_id,
            },
          },
          data: { announcement: input.announcement },
          select: OWN_RUNTIME_SELECT,
        }),
      RemoteControlProgramErrorMessage.RuntimeNotFound,
    );

    return toOwnRuntime(runtime, context.now());
  });
