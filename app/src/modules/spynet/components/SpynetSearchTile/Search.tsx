"use client";

import { env } from "@/env";
import { getAlgoliaResults } from "@algolia/autocomplete-js";
import algoliasearch from "algoliasearch";
import { Autocomplete } from "./Autocomplete";
import { Citizen } from "./Citizen";
import { Organization } from "./Organization";

type HitBase = Readonly<{
  objectID: string;
  spectrumId: string;
}>;

export type CitizenHit = HitBase & {
  type: "citizen";
  handles?: string[];
  citizenIds?: string[];
  communityMonikers?: string[];
};

export type OrganizationHit = HitBase & {
  type: "organization";
  names: string[];
};

export type Hit = CitizenHit | OrganizationHit;

const searchClient = algoliasearch(
  env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY,
);

// @ts-expect-error
function debouncePromise(fn, time: number) {
  let timerId: NodeJS.Timeout | undefined = undefined;

  // @ts-expect-error
  return function debounced(...args) {
    if (timerId) {
      clearTimeout(timerId);
    }

    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      timerId = setTimeout(() => resolve(fn(...args)), time);
    });
  };
}

// @ts-expect-error
const debounced = debouncePromise((items) => Promise.resolve(items), 300);

export const Search = () => {
  return (
    <div className="w-full">
      <Autocomplete
        openOnFocus={true}
        // @ts-expect-error
        getSources={({ query }) => {
          return debounced([
            {
              sourceId: "algolia",
              getItems() {
                return getAlgoliaResults({
                  searchClient,
                  queries: [
                    {
                      indexName: "spynet_entities",
                      query,
                    },
                  ],
                });
              },
              getItemUrl({ item }: { item: Hit }) {
                return `/app/spynet/citizen/${item.objectID}`;
              },
              templates: {
                item: ({ item }: { item: Hit }) => {
                  if (item.type === "citizen") {
                    return <Citizen hit={item} />;
                  } else if (item.type === "organization") {
                    return <Organization hit={item} />;
                  }
                },
              },
            },
          ]);
        }}
        classNames={{
          form: "!bg-neutral-800 !border-transparent !shadow-none !outline-none focus-within:!border-white !rounded-secondary",
          input: "!text-white placeholder:!text-neutral-500",
          panel: "!bg-neutral-800 [&>.aa-GradientBottom]:!hidden",
          panelLayout: "!p-0",
          item: "!text-white !p-2 aria-selected:!bg-neutral-700",
          submitButton: "[&>svg]:!text-brand-red-500",
          clearButton: "hover:!text-brand-red-500 focus:!text-brand-red-500",
          loadingIndicator: "[&>svg]:!text-brand-red-500",
          detachedSearchButton: "!static",
        }}
        placeholder="Suche"
        // renderNoResults={() => "Kein Ergebnisse"} // TODO
      />
    </div>
  );
};
