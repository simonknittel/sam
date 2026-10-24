import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { revokeGrant } from "../oauth/revokeGrant.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";

export const revokeOwnGrantInputSchema = z.object({
  grant_id: idSchema,
});

/**
 * Disconnects a client of the actor: revokes the grant, deletes its refresh
 * tokens and writes the audit event. The next MCP request with an access
 * token of the grant gets `401`. No check of `mcp;use`: a user who lost the
 * permission can still remove the access of a client.
 *
 * @throws NotFoundError when the grant does not belong to the actor or is
 * already revoked
 */
export const revokeOwnGrant = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof revokeOwnGrantInputSchema>,
): Promise<void> =>
  withSpan(context, "revokeOwnGrant", async () => {
    const grant = await context.prisma.oAuthGrant.findFirst({
      where: { id: input.grant_id, userId: actor.userId, revokedAt: null },
      select: { id: true, clientId: true },
    });
    if (!grant) throw new NotFoundError("The grant does not exist");

    const isRevoked = await revokeGrant(context, {
      grantId: grant.id,
      clientId: grant.clientId,
      revokedById: actor.userId,
      auditCreatedById: actor.userId,
    });

    // A parallel request revoked the grant first
    if (!isRevoked) throw new NotFoundError("The grant does not exist");
  });
