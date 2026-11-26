import {
  AuditEventType,
  OAUTH_GRANT_CUSTOM_NAME_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { requireMcpAccess } from "../mcpAccess.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { getOwnMcpGrantWhere } from "./ownMcpGrant.js";

/** An empty name removes the own name: the list then shows the client name */
export const grantCustomNameSchema = z
  .string()
  .trim()
  .max(OAUTH_GRANT_CUSTOM_NAME_MAXIMUM_LENGTH)
  .transform((customName) => customName || null);

export const renameOwnGrantInputSchema = z.object({
  grant_id: idSchema,
  custom_name: grantCustomNameSchema,
});

export const renameOwnGrant = (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof renameOwnGrantInputSchema>,
): Promise<void> =>
  withSpan(context, "renameOwnGrant", async () => {
    requireMcpAccess(actor);

    const grant = await context.prisma.oAuthGrant.findFirst({
      where: { id: input.grant_id, ...getOwnMcpGrantWhere(context, actor) },
      select: { id: true, clientId: true, customName: true },
    });
    if (!grant) throw new NotFoundError("The grant does not exist");

    if (grant.customName === input.custom_name) return;

    // The last of two parallel renames wins
    const { count } = await context.prisma.oAuthGrant.updateMany({
      where: { id: grant.id, revokedAt: null },
      data: { customName: input.custom_name },
    });
    // A parallel request revoked the grant first
    if (count === 0) throw new NotFoundError("The grant does not exist");

    await context.audit.create([
      {
        type: AuditEventType.OAUTH_GRANT_RENAMED,
        data: {
          grantId: grant.id,
          clientId: grant.clientId,
          customName: input.custom_name,
        },
        createdById: actor.userId,
      },
    ]);
  });
