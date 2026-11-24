import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import {
  UserBanStatus,
  UserSort,
  UserTwoFactorStatus,
} from "@sam-monorepo/application";
import { parseAsString, parseAsStringEnum } from "nuqs/server";

/**
 * Only server components import this file: a client module must not import a
 * value from the package `application`.
 */
export { UserBanStatus, UserSort, UserTwoFactorStatus };

export const loadUserListSearchParams = createCursorPaginationLoader({
  sort: parseAsStringEnum(Object.values(UserSort)).withDefault(
    UserSort.CreatedAtDescending,
  ),
  q: parseAsString,
  banned: parseAsStringEnum(Object.values(UserBanStatus)).withDefault(
    UserBanStatus.All,
  ),
  two_factor: parseAsStringEnum(Object.values(UserTwoFactorStatus)).withDefault(
    UserTwoFactorStatus.All,
  ),
});
