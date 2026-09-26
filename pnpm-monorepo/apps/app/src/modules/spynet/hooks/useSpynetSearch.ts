import { api } from "@/trpc/react";
import { useDebounce } from "@uidotdev/usehooks";
import {
  SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH,
  SPYNET_SEARCH_QUERY_MINIMUM_LENGTH,
} from "../utils/spynetSearch";

const DEBOUNCE_MILLISECONDS = 300;

export enum SpynetSearchStatus {
  /** The query is too short for a request */
  Idle = "idle",
  /** The first request for the query runs, thus no hits are available */
  Loading = "loading",
  Error = "error",
  Success = "success",
}

/**
 * Search-as-you-type for the Spynet search tile and the Cmd+K search. While
 * a new request runs, the hits of the previous query stay visible.
 */
export const useSpynetSearch = (query: string, limit?: number) => {
  // The procedure refuses a longer query, thus only its start is sent
  const debouncedQuery = useDebounce(query, DEBOUNCE_MILLISECONDS)
    .trim()
    .slice(0, SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH);
  const enabled = debouncedQuery.length >= SPYNET_SEARCH_QUERY_MINIMUM_LENGTH;

  const { data, isError } = api.spynet.search.useQuery(
    { query: debouncedQuery, limit },
    {
      enabled,
      placeholderData: (previous) => previous,
    },
  );

  if (!enabled) return { status: SpynetSearchStatus.Idle, hits: [] } as const;
  if (isError) return { status: SpynetSearchStatus.Error, hits: [] } as const;
  if (!data) return { status: SpynetSearchStatus.Loading, hits: [] } as const;
  return { status: SpynetSearchStatus.Success, hits: data } as const;
};
