import {
  CITIZEN_CHANNEL_PREFIX,
  EVENT_CHANNEL_PREFIX,
  MAXIMUM_REALTIME_CHANNEL_NAME_LENGTH,
  REMOTE_CONTROL_PROGRAM_CHANNEL_PREFIX,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, ValidationError } from "../errors.js";
import { canActorSeeEvent } from "../events/eventVisibility.js";
import { idSchema } from "../pagination.js";
import { canUseRemoteControlProgram } from "../remoteControlProgram/access/remoteControlProgramPermissions.js";
import { NotificationErrorMessage } from "./notificationErrors.js";

export const authorizeRealtimeChannelInputSchema = z.object({
  channel_name: z.string().max(MAXIMUM_REALTIME_CHANNEL_NAME_LENGTH),
});

export type AuthorizeRealtimeChannelInput = z.output<
  typeof authorizeRealtimeChannelInputSchema
>;

/**
 * Restricted and soft-deleted events must stay invisible: a subscription to
 * their channel gets the same answer as an event that does not exist.
 */
const requireVisibleEvent = async (
  context: ApplicationContext,
  actor: Actor,
  eventId: string,
) => {
  requirePermission(actor, "event", "read");

  if (!idSchema.safeParse(eventId).success)
    throw new ForbiddenError(NotificationErrorMessage.RealtimeChannelForbidden);

  const event = await context.prisma.event.findUnique({
    where: { id: eventId },
    select: {
      visibility: true,
      createdById: true,
      deletedAt: true,
      visibilityRoles: { select: { roleId: true } },
      managers: { select: { id: true } },
    },
  });
  if (!event || !canActorSeeEvent(actor, event))
    throw new ForbiddenError(NotificationErrorMessage.RealtimeChannelForbidden);
};

/**
 * An admin who assumes the citizen can subscribe to the notifications of the
 * citizen, but not to the channel of the Remote Control Program (decision 4
 * of `docs/remote-control-program/README.md`).
 */
export const authorizeRealtimeChannel = async (
  context: ApplicationContext,
  actor: Actor,
  input: AuthorizeRealtimeChannelInput,
): Promise<void> => {
  const channelName = input.channel_name;

  if (channelName.startsWith(EVENT_CHANNEL_PREFIX))
    return requireVisibleEvent(
      context,
      actor,
      channelName.slice(EVENT_CHANNEL_PREFIX.length),
    );

  if (channelName.startsWith(REMOTE_CONTROL_PROGRAM_CHANNEL_PREFIX)) {
    if (
      channelName.slice(REMOTE_CONTROL_PROGRAM_CHANNEL_PREFIX.length) !==
        actor.citizen?.id ||
      !canUseRemoteControlProgram(actor)
    )
      throw new ForbiddenError(
        NotificationErrorMessage.RealtimeChannelForbidden,
      );

    return;
  }

  if (channelName.startsWith(CITIZEN_CHANNEL_PREFIX)) {
    if (channelName.slice(CITIZEN_CHANNEL_PREFIX.length) !== actor.citizen?.id)
      throw new ForbiddenError(
        NotificationErrorMessage.RealtimeChannelForbidden,
      );

    return;
  }

  throw new ValidationError(NotificationErrorMessage.RealtimeChannelUnknown);
};
