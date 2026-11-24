import type { ApplicationContext } from "../context.js";
import { DEVELOPMENT_LOGIN_USER_WHERE } from "./developmentLoginUser.js";
import {
  ASSUMABLE_USER_SELECT,
  type AssumableUser,
} from "./listAssumableUsers.js";

/**
 * A local database has only a few admins. The limit only keeps the list
 * short on a mirrored production database.
 */
const MAXIMUM_DEVELOPMENT_LOGIN_USERS = 50;

/** No permission check, see the README */
export const listDevelopmentLoginUsers = (
  context: ApplicationContext,
): Promise<AssumableUser[]> =>
  context.prisma.user.findMany({
    where: DEVELOPMENT_LOGIN_USER_WHERE,
    select: ASSUMABLE_USER_SELECT,
    orderBy: {
      name: "asc",
    },
    take: MAXIMUM_DEVELOPMENT_LOGIN_USERS,
  });
