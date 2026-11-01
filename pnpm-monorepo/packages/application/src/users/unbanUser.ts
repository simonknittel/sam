import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireAdmin, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { UserErrorMessage } from "./userErrors.js";

export const unbanUserInputSchema = z.object({
  user_id: idSchema.describe("The user to unban."),
});

export type UnbanUserInput = z.infer<typeof unbanUserInputSchema>;

export interface UnbanUserOutput {
  readonly user_id: string;
}

/**
 * Lifts the ban of a user. Requires the admin role.
 *
 * @throws ForbiddenError when the actor is not an admin
 * @throws NotFoundError when the user does not exist
 * @throws ConflictError when the user is not banned (usually because a
 * different user unbanned them before)
 */
export const unbanUser = (
  context: ApplicationContext,
  actor: Actor,
  input: UnbanUserInput,
): Promise<UnbanUserOutput> =>
  withSpan(context, "unbanUser", async () => {
    requireAdmin(actor);

    const user = await context.prisma.user.findUnique({
      where: { id: input.user_id },
      select: { id: true },
    });
    if (!user) throw new NotFoundError(UserErrorMessage.NotFound);

    // Only one of two parallel unbans finds the user banned
    const { count } = await context.prisma.user.updateMany({
      where: { id: input.user_id, bannedAt: { not: null } },
      data: { bannedAt: null, bannedById: null, bannedReason: null },
    });
    if (count === 0) throw new ConflictError(UserErrorMessage.NotBanned);

    await context.audit.create([
      {
        type: AuditEventType.USER_UNBANNED,
        data: { userId: input.user_id },
        createdById: actor.userId,
      },
    ]);

    return { user_id: input.user_id };
  });
