import { UserRole } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  BAN_REASON_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { UserErrorMessage } from "./userErrors.js";

export const banUserInputSchema = z.object({
  user_id: idSchema.describe("The user to ban."),
  reason: z
    .string()
    .trim()
    .max(BAN_REASON_MAXIMUM_LENGTH)
    .optional()
    .describe("Why the user gets banned."),
});

export type BanUserInput = z.infer<typeof banUserInputSchema>;

export interface BanUserOutput {
  readonly user_id: string;
  /** ISO 8601 instant */
  readonly banned_at: string;
}

/**
 * Ends the open connections of a banned user: the realtime connections of
 * the on-site notifications and the connections of the wiki editor. The
 * sessions of the user are deleted already, thus a reconnect fails. A
 * failure does not undo the ban: the function logs it and continues.
 */
const endLiveConnections = async (
  context: ApplicationContext,
  userId: string,
) => {
  const [realtimeResult, collabResult] = await Promise.allSettled([
    context.realtime?.terminateUserConnections(userId),
    context.collab?.disconnectUser(userId),
  ]);

  if (realtimeResult.status === "rejected")
    context.log.error(
      "Failed to end the realtime connections of a banned user",
      { userId, error: realtimeResult.reason },
    );
  if (collabResult.status === "rejected")
    context.log.error(
      "Failed to end the wiki editor connections of a banned user",
      { userId, error: collabResult.reason },
    );
};

/**
 * Bans a user, revokes their sessions, deletes the web push subscriptions of
 * their citizen and ends their open connections. Requires `user;ban` and a
 * citizen of the actor, who is the person that banned the user.
 *
 * @throws ValidationError when the actor bans themselves, or when the user is
 * an admin
 * @throws NotFoundError when the user does not exist
 * @throws ConflictError when the user is already banned (usually because a
 * different user banned them before)
 */
export const banUser = (
  context: ApplicationContext,
  actor: Actor,
  input: BanUserInput,
): Promise<BanUserOutput> =>
  withSpan(context, "banUser", async () => {
    requirePermission(actor, "user", "ban");
    const bannedBy = requireCitizen(actor);

    if (input.user_id === actor.userId)
      throw new ValidationError(UserErrorMessage.CannotBanSelf);

    const user = await context.prisma.user.findUnique({
      where: { id: input.user_id },
      select: { role: true },
    });
    if (!user) throw new NotFoundError(UserErrorMessage.NotFound);

    // Admins bypass the permission checks and could unban themselves anyway
    if (user.role === UserRole.ADMIN)
      throw new ValidationError(UserErrorMessage.CannotBanAdmin);

    const reason = input.reason || null;
    const bannedAt = context.now();

    // Only one of two parallel bans finds the user not banned
    const isBanned = await context.prisma.$transaction(async (transaction) => {
      const { count } = await transaction.user.updateMany({
        where: { id: input.user_id, bannedAt: null },
        data: { bannedAt, bannedById: bannedBy.id, bannedReason: reason },
      });
      if (count === 0) return false;

      await transaction.session.deleteMany({
        where: { userId: input.user_id },
      });
      await transaction.webPushSubscription.deleteMany({
        where: { citizen: { userId: input.user_id } },
      });

      return true;
    });
    if (!isBanned) throw new ConflictError(UserErrorMessage.AlreadyBanned);

    await context.audit.create([
      {
        type: AuditEventType.USER_BANNED,
        data: {
          userId: input.user_id,
          ...(reason ? { reason } : {}),
        },
        createdById: actor.userId,
      },
    ]);

    await endLiveConnections(context, input.user_id);

    return { user_id: input.user_id, banned_at: bannedAt.toISOString() };
  });
