import { UserRole } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { ASSUMABLE_USER_WHERE } from "@sam-monorepo/domain";

/**
 * Only admins: to test as a different user, sign in as an admin and assume that
 * user
 */
export const DEVELOPMENT_LOGIN_USER_WHERE = {
  ...ASSUMABLE_USER_WHERE,
  role: UserRole.ADMIN,
} satisfies Prisma.UserWhereInput;
