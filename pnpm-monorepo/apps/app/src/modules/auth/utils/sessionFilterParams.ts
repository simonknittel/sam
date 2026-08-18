import { parseAsStringEnum } from "nuqs/server";

/**
 * Expired sessions stay in the database for another 30 days before the
 * midnight automation deletes them, so the list defaults to the ones that
 * still grant access.
 */
export enum SessionStatus {
  Active = "active",
  Expired = "expired",
  All = "all",
}

export enum SessionSort {
  NewestFirst = "created-desc",
  OldestFirst = "created-asc",
}

export const SESSION_STATUS_PARAM = "status";
export const SESSION_SORT_PARAM = "sort";

export const sessionStatusParser = parseAsStringEnum(
  Object.values(SessionStatus),
).withDefault(SessionStatus.Active);

export const sessionSortParser = parseAsStringEnum(
  Object.values(SessionSort),
).withDefault(SessionSort.NewestFirst);
