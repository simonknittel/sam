import { ASSUMABLE_USER_WHERE } from "@sam-monorepo/domain";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";

export const listAssumableUsersInputSchema = z.object({
  admin_user_id: idSchema.describe(
    "The admin behind the session. The list leaves out this account.",
  ),
});

export type ListAssumableUsersInput = z.infer<
  typeof listAssumableUsersInputSchema
>;

export interface AssumableUser {
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

export const ASSUMABLE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
} as const;

/**
 * Leaves out the own account of the admin, which the session ignores. No
 * permission check, see the README.
 */
export const listAssumableUsers = (
  context: ApplicationContext,
  input: ListAssumableUsersInput,
): Promise<AssumableUser[]> =>
  context.prisma.user.findMany({
    where: {
      ...ASSUMABLE_USER_WHERE,
      id: { not: input.admin_user_id },
    },
    select: ASSUMABLE_USER_SELECT,
    orderBy: {
      name: "asc",
    },
  });
