import { createCursorPaginationLoader } from "@/modules/common/CursorPagination/createCursorPaginationLoader";
import { parseAsString, parseAsStringEnum } from "nuqs/server";

export enum UserSort {
  CreatedAtDesc = "createdAt-desc",
  CreatedAtAsc = "createdAt-asc",
  EmailVerifiedDesc = "emailVerified-desc",
  EmailVerifiedAsc = "emailVerified-asc",
  NameAsc = "name-asc",
  NameDesc = "name-desc",
}

export enum UserBanStatus {
  All = "all",
  Banned = "banned",
  Active = "active",
}

export const loadUserListSearchParams = createCursorPaginationLoader({
  sort: parseAsStringEnum(Object.values(UserSort)).withDefault(
    UserSort.CreatedAtDesc,
  ),
  q: parseAsString,
  banned: parseAsStringEnum(Object.values(UserBanStatus)).withDefault(
    UserBanStatus.All,
  ),
});
