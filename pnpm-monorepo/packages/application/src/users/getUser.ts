import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { UserErrorMessage } from "./userErrors.js";
import {
  toUserOutput,
  USER_OUTPUT_SELECT,
  type UserOutput,
} from "./userOutput.js";

export const getUserInputSchema = z.object({
  user_id: idSchema
    .optional()
    .describe(
      "The id of the user, for example from list_users or created_by.user_id of list_audit_events. Without it: the signed-in user.",
    ),
});

export type GetUserInput = z.output<typeof getUserInputSchema>;

/** Whether the input asks for the actor's own user */
export const isOwnUser = (actor: Pick<Actor, "userId">, input: GetUserInput) =>
  input.user_id === undefined || input.user_id === actor.userId;

/**
 * One user. Each actor can read the own user, a different user requires
 * `user;read`.
 *
 * @throws NotFoundError when the user does not exist
 */
export const getUser = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  input: GetUserInput,
): Promise<UserOutput> => {
  if (!isOwnUser(actor, input)) requirePermission(actor, "user", "read");

  const user = await context.prisma.user.findUnique({
    where: { id: input.user_id ?? actor.userId },
    select: USER_OUTPUT_SELECT,
  });
  if (!user) throw new NotFoundError(UserErrorMessage.NotFound);

  return toUserOutput(user);
};
