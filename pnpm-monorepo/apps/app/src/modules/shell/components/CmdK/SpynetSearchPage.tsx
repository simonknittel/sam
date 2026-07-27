import { env } from "@/env";
import { Command } from "cmdk";
import { debounce } from "lodash";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { type Hit } from "../../../spynet/components/SpynetSearchTile/Search";
import { SpynetSearchResultEntry } from "./SpynetSearchResultEntry";

const fetcher = async (key: string) => {
  const res = await fetch(key, {
    headers: {
      "X-Algolia-Application-Id": env.NEXT_PUBLIC_ALGOLIA_APP_ID,
      "X-Algolia-API-Key": env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
    },
  });

  return res.json() as unknown as AlgoliaResponse;
};

interface AlgoliaResponse {
  readonly hits: Hit[];
}

interface Props {
  readonly search: string;
  readonly onSelect?: () => void;
}

export const SpynetSearchPage = ({ search, onSelect }: Props) => {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  const handleSearch = (value: string) => {
    setDebouncedSearch(value);
  };

  const debouncedHandleSearch = useMemo(() => debounce(handleSearch, 500), []);

  const { data, isValidating } = useSWR<AlgoliaResponse>(
    `https://${env.NEXT_PUBLIC_ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/spynet_entities?query=${debouncedSearch}&hitsPerPage=5`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  useEffect(() => {
    debouncedHandleSearch(search);
  }, [debouncedHandleSearch, search]);

  return (
    <Command.Group
      heading={
        <div className="flex items-baseline gap-2">
          Profil suchen
          <span className="text-neutral-700 text-xs">Spynet</span>
        </div>
      }
    >
      {isValidating || !data ? (
        <div className="animate-pulse rounded-secondary bg-neutral-800 h-24 mx-2" />
      ) : data.hits.length > 0 ? (
        data.hits.map((result) => (
          <SpynetSearchResultEntry
            key={result.objectID}
            hit={result}
            onSelect={onSelect}
          />
        ))
      ) : (
        <Command.Item disabled>Keine Ergebnisse</Command.Item>
      )}
    </Command.Group>
  );
};
