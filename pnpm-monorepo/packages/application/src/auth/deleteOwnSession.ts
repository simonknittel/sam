import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { AuthErrorMessage } from "./authErrors.js";

export const deleteOwnSessionInputSchema = z.object({
  session_id: idSchema,
});

export type DeleteOwnSessionInput = z.infer<typeof deleteOwnSessionInputSchema>;

export interface DeleteOwnSessionOptions {
  readonly currentSessionId: string | null;
}

export interface DeleteOwnSessionOutput {
  readonly session_id: string;
}

export const deleteOwnSession = (
  context: ApplicationContext,
  actor: Actor,
  input: DeleteOwnSessionInput,
  options: DeleteOwnSessionOptions,
): Promise<DeleteOwnSessionOutput> =>
  withSpan(context, "deleteOwnSession", async () => {
    if (input.session_id === options.currentSessionId)
      throw new ValidationError(AuthErrorMessage.CurrentSession);

    /**
     * Scoping the delete to the user turns a foreign session id into a
     * no-op instead of letting anyone probe or revoke the sessions of other
     * people.
     */
    const { count } = await context.prisma.session.deleteMany({
      where: {
        id: input.session_id,
        userId: actor.userId,
      },
    });
    if (count === 0) throw new NotFoundError(AuthErrorMessage.SessionNotFound);

    await context.audit.create([
      {
        type: AuditEventType.USER_SESSION_DELETED,
        data: {
          sessionId: input.session_id,
          userId: actor.userId,
        },
        createdById: actor.userId,
      },
    ]);

    return { session_id: input.session_id };
  });
