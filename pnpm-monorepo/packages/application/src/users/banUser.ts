import { UserRole } from "@sam-monorepo/database/browser";
import {
  AuditEventType,
  BAN_REASON_MAXIMUM_LENGTH,
  WebPushPruneReason,
  type AuditEventInput,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireAdmin, requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import type { DeletedWebPushSubscription } from "../notifications/delivery/webPushDeliveries.js";
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
  readonly banned_at: string;
}

/**
 * The sessions of the user are deleted already, thus a reconnect fails. A
 * failure does not undo the ban. The relay service also checks the ban at
 * each renewal of a connection token.
 */
const endLiveConnections = async (
  context: ApplicationContext,
  userId: string,
) => {
  const [realtimeResult, collabResult, relayResult] = await Promise.allSettled([
    context.realtime?.terminateUserConnections(userId),
    context.collab?.disconnectUser(userId),
    context.relay?.disconnectUser(userId),
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
  if (relayResult.status === "rejected")
    context.log.error(
      "Failed to end the runtime connections of a banned user",
      { userId, error: relayResult.reason },
    );
};

export const banUser = (
  context: ApplicationContext,
  actor: Actor,
  input: BanUserInput,
): Promise<BanUserOutput> =>
  withSpan(context, "banUser", async () => {
    requireAdmin(actor);
    const bannedBy = requireCitizen(actor);

    if (input.user_id === actor.userId)
      throw new ValidationError(UserErrorMessage.CannotBanSelf);

    const user = await context.prisma.user.findUnique({
      where: { id: input.user_id },
      select: { role: true },
    });
    if (!user) throw new NotFoundError(UserErrorMessage.NotFound);

    if (user.role === UserRole.ADMIN)
      throw new ValidationError(UserErrorMessage.CannotBanAdmin);

    const reason = input.reason || null;
    const bannedAt = context.now();

    // Only one of two parallel bans finds the user not banned
    const deletedSubscriptions = await context.prisma.$transaction(
      async (transaction) => {
        const { count } = await transaction.user.updateMany({
          where: { id: input.user_id, bannedAt: null },
          data: { bannedAt, bannedById: bannedBy.id, bannedReason: reason },
        });
        if (count === 0) return null;

        await transaction.session.deleteMany({
          where: { userId: input.user_id },
        });

        return transaction.$queryRaw<DeletedWebPushSubscription[]>`
          DELETE FROM "WebPushSubscription" AS "subscription"
          USING "Citizen" AS "citizen"
          WHERE "citizen"."id" = "subscription"."citizenId"
            AND "citizen"."userId" = ${input.user_id}
          RETURNING
            "subscription"."id",
            "subscription"."citizenId",
            "subscription"."userAgent"
        `;
      },
    );
    if (!deletedSubscriptions)
      throw new ConflictError(UserErrorMessage.AlreadyBanned);

    const auditEvents: AuditEventInput[] = [
      {
        type: AuditEventType.USER_BANNED,
        data: {
          userId: input.user_id,
          ...(reason ? { reason } : {}),
        },
        createdById: actor.userId,
      },
    ];
    if (deletedSubscriptions.length > 0)
      auditEvents.push({
        type: AuditEventType.WEB_PUSH_SUBSCRIPTIONS_PRUNED_V2,
        data: {
          reason: WebPushPruneReason.Banned,
          subscriptions: deletedSubscriptions.map((subscription) => ({
            subscriptionId: subscription.id,
            citizenId: subscription.citizenId,
            userAgent: subscription.userAgent,
            statusCode: null,
          })),
        },
        createdById: actor.userId,
      });
    await context.audit.create(auditEvents);

    await endLiveConnections(context, input.user_id);

    return { user_id: input.user_id, banned_at: bannedAt.toISOString() };
  });
