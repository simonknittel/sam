import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export enum InvitationsTableStatus {
  All = "all",
  Open = "open",
  Declined = "declined",
}

export enum InvitationsTableSort {
  InvitedAtDescending = "invited-at-desc",
  InvitedAtAscending = "invited-at-asc",
  CitizenAscending = "citizen-asc",
  CitizenDescending = "citizen-desc",
}

export const INVITATIONS_TABLE_DEFAULT_SORT =
  InvitationsTableSort.InvitedAtDescending;

/**
 * The search params of the sidebar of the invitations. They differ from the
 * params of the participants table on the same page.
 */
export const INVITATIONS_TABLE_STATUS_PARAM = "invitation_status";
export const INVITATIONS_TABLE_ROLE_PARAM = "invitation_role";
export const INVITATIONS_TABLE_SORT_PARAM = "invitation_sort";

export const loadInvitationsTableSearchParams = createLoader({
  [INVITATIONS_TABLE_STATUS_PARAM]: parseAsStringEnum(
    Object.values(InvitationsTableStatus),
  ).withDefault(InvitationsTableStatus.All),
  [INVITATIONS_TABLE_ROLE_PARAM]: parseAsArrayOf(parseAsString).withDefault([]),
  [INVITATIONS_TABLE_SORT_PARAM]: parseAsStringEnum(
    Object.values(InvitationsTableSort),
  ).withDefault(INVITATIONS_TABLE_DEFAULT_SORT),
});
