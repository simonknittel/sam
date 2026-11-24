import { getDateRangeFilter } from "@/modules/common/utils/getDateRangeFilter";
import { parseAsArrayOf, parseAsString } from "nuqs/server";

export const ACTIVITY_TYPE_PARAM = "type";
export const ACTIVITY_ACTOR_PARAM = "actor";
export const ACTIVITY_FROM_PARAM = "from";
export const ACTIVITY_TO_PARAM = "to";

/**
 * The lists come from the URL, so without a ceiling anyone could hand the
 * database an arbitrarily long `IN`.
 */
const MAX_FILTER_VALUES = 100;

export const activityFilterParsers = {
  [ACTIVITY_TYPE_PARAM]: parseAsArrayOf(parseAsString),
  [ACTIVITY_ACTOR_PARAM]: parseAsArrayOf(parseAsString),
  [ACTIVITY_FROM_PARAM]: parseAsString,
  [ACTIVITY_TO_PARAM]: parseAsString,
};

const limitFilterValues = (values?: string[] | null) =>
  values && values.length > 0 ? values.slice(0, MAX_FILTER_VALUES) : null;

export interface ActivityFilters {
  /** `null` for all types */
  readonly types: string[] | null;
  readonly actorIds: string[] | null;
  readonly createdAt: { gte?: Date; lt?: Date };
}

export const getActivityFilters = (searchParams: {
  readonly [ACTIVITY_TYPE_PARAM]: string[] | null;
  readonly [ACTIVITY_ACTOR_PARAM]: string[] | null;
  readonly [ACTIVITY_FROM_PARAM]: string | null;
  readonly [ACTIVITY_TO_PARAM]: string | null;
}): ActivityFilters => ({
  types: limitFilterValues(searchParams[ACTIVITY_TYPE_PARAM]),
  actorIds: limitFilterValues(searchParams[ACTIVITY_ACTOR_PARAM]),
  createdAt: getDateRangeFilter(
    searchParams[ACTIVITY_FROM_PARAM],
    searchParams[ACTIVITY_TO_PARAM],
  ),
});

export const hasActiveActivityFilters = (filters: ActivityFilters) =>
  Boolean(
    filters.types ||
    filters.actorIds ||
    filters.createdAt.gte ||
    filters.createdAt.lt,
  );
