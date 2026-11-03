import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export enum ParticipantsTableSort {
  CitizenAscending = "citizen-asc",
  CitizenDescending = "citizen-desc",
  JoinedAtAscending = "joined-at-asc",
  JoinedAtDescending = "joined-at-desc",
}

export const PARTICIPANTS_TABLE_DEFAULT_SORT =
  ParticipantsTableSort.CitizenAscending;

/** The search param of the role filter in the sidebar of the participants tab */
export const PARTICIPANTS_TABLE_ROLE_PARAM = "role";

export const loadParticipantsTableSearchParams = createLoader({
  [PARTICIPANTS_TABLE_ROLE_PARAM]: parseAsArrayOf(parseAsString).withDefault(
    [],
  ),
  sort: parseAsStringEnum(Object.values(ParticipantsTableSort)).withDefault(
    PARTICIPANTS_TABLE_DEFAULT_SORT,
  ),
});
