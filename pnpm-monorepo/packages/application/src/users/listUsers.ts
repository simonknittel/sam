import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { cursorSchema, pageLimitSchema } from "../pagination.js";
import {
  getUserListOrderBy,
  getUserListWhere,
  parseUserListOffset,
  USER_LIST_HANDLE_QUERY_MAXIMUM_LENGTH,
  UserBanStatus,
  UserSort,
  UserTwoFactorStatus,
} from "./findUserListPage.js";
import {
  toUserOutput,
  USER_OUTPUT_SELECT,
  type UserOutput,
} from "./userOutput.js";

export const listUsersInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(USER_LIST_HANDLE_QUERY_MAXIMUM_LENGTH)
    .optional()
    .describe(
      "A part of the handle of the citizen of the user, without regard to the case.",
    ),
  ban_status: z
    .enum(UserBanStatus)
    .default(UserBanStatus.All)
    .describe("banned: only the banned users. active: only the other users."),
  two_factor_status: z
    .enum(UserTwoFactorStatus)
    .default(UserTwoFactorStatus.All)
    .describe(
      "The two-factor authentication of the last Discord login. unknown: no Discord login since SAM stores the status.",
    ),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export type ListUsersInput = z.output<typeof listUsersInputSchema>;

export interface ListUsersOutput {
  readonly users: UserOutput[];
  readonly next_cursor: string | null;
}

/**
 * The users, the newest first, one page. The cursor is an offset, like the
 * cursor of the user list of the app (see `parseUserListOffset()`).
 * Requires `user;read`.
 *
 * @throws ValidationError for a malformed cursor
 */
export const listUsers = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  input: ListUsersInput,
): Promise<ListUsersOutput> => {
  requirePermission(actor, "user", "read");

  const offset =
    input.cursor === undefined ? 0 : parseUserListOffset(input.cursor);
  if (offset === null) throw new ValidationError("Unknown cursor");

  const rows = await context.prisma.user.findMany({
    where: getUserListWhere({
      banStatus: input.ban_status,
      twoFactorStatus: input.two_factor_status,
      handleQuery: input.query ?? null,
    }),
    orderBy: getUserListOrderBy(UserSort.CreatedAtDescending),
    skip: offset,
    take: input.limit + 1,
    select: USER_OUTPUT_SELECT,
  });

  const hasNextPage = rows.length > input.limit;

  return {
    users: rows.slice(0, input.limit).map(toUserOutput),
    next_cursor: hasNextPage ? String(offset + input.limit) : null,
  };
};
