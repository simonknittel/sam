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
  /** The hits of the current query are not available yet */
  Loading = "loading",
  Error = "error",
  Success = "success",
}

/**
 * Search-as-you-type for the Spynet search tile and the Cmd+K search. The
 * hits always belong to the current query. While the user types or a request
 * runs, no hits show, thus Enter cannot open a hit of an earlier query.
 */
export const useSpynetSearch = (query: string, limit?: number) => {
  // The procedure refuses a longer query, thus only its start is sent
  const currentQuery = query
    .trim()
    .slice(0, SPYNET_SEARCH_QUERY_MAXIMUM_LENGTH);
  const debouncedQuery = useDebounce(currentQuery, DEBOUNCE_MILLISECONDS);

  const { data, isError } = api.spynet.search.useQuery(
    { query: debouncedQuery, limit },
    {
      enabled: debouncedQuery.length >= SPYNET_SEARCH_QUERY_MINIMUM_LENGTH,
      // The next keystroke sends a new request, thus a retry only delays the error
      retry: false,
    },
  );

  if (currentQuery.length < SPYNET_SEARCH_QUERY_MINIMUM_LENGTH)
    return { status: SpynetSearchStatus.Idle, hits: [] } as const;
  if (debouncedQuery !== currentQuery)
    return { status: SpynetSearchStatus.Loading, hits: [] } as const;
  if (isError) return { status: SpynetSearchStatus.Error, hits: [] } as const;
  if (!data) return { status: SpynetSearchStatus.Loading, hits: [] } as const;
  return { status: SpynetSearchStatus.Success, hits: data } as const;
};
