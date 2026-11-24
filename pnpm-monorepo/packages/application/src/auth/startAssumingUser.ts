import { ASSUMABLE_USER_WHERE, AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { AuthErrorMessage } from "./authErrors.js";
import { stopAssumingUser } from "./stopAssumingUser.js";

export const startAssumingUserInputSchema = z.object({
  admin_user_id: idSchema.describe("The admin behind the session."),
  target_user_id: idSchema.describe("The user to assume."),
  current_assumed_user: z
    .object({
      id: idSchema,
      name: z.string().nullable(),
    })
    .nullable()
    .describe("The user that the admin assumes now, or null."),
});

export type StartAssumingUserInput = z.infer<
  typeof startAssumingUserInputSchema
>;

export interface StartAssumingUserOutput {
  readonly id: string;
  readonly name: string | null;
}

/** The caller sets the cookie. No permission check, see the README. */
export const startAssumingUser = (
  context: ApplicationContext,
  input: StartAssumingUserInput,
): Promise<StartAssumingUserOutput> =>
  withSpan(context, "startAssumingUser", async () => {
    if (input.target_user_id === input.admin_user_id)
      throw new ValidationError(AuthErrorMessage.OwnAccount);

    const user = await context.prisma.user.findFirst({
      where: {
        id: input.target_user_id,
        ...ASSUMABLE_USER_WHERE,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (!user) throw new NotFoundError(AuthErrorMessage.UserNotAssumable);

    // A separate write gives the end of the previous assume an earlier
    // timestamp, thus the system log shows the two events in order
    if (input.current_assumed_user)
      await stopAssumingUser(context, {
        admin_user_id: input.admin_user_id,
        assumed_user_id: input.current_assumed_user.id,
        assumed_user_name: input.current_assumed_user.name,
      });

    await context.audit.create([
      {
        type: AuditEventType.ASSUME_USER_STARTED,
        data: {
          assumedUserId: user.id,
          assumedUserName: user.name,
        },
        createdById: input.admin_user_id,
      },
    ]);

    return user;
  });
