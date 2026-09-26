"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { groupByFeatured } from "../utils/groupByFeatured";
import type { App, RedactedApp } from "../utils/types";
import { AppTile } from "./AppTile";
import { AppTileGrid } from "./AppTileGrid";
import { Filters } from "./Filters";
import { RedactedAppTile } from "./RedactedAppTile";

/**
 * The widest grid has six columns (see AppTileGrid), thus the first six tiles
 * fill at least the first row on each viewport.
 */
const ABOVE_THE_FOLD_TILE_COUNT = 6;

interface Props {
  readonly allApps: App[] | null;
}

export const AppsOverview = ({ allApps }: Props) => {
  const [selectedTags, setSelectedTags] = useQueryState(
    "tag",
    parseAsArrayOf(parseAsString).withDefault(["all"]),
  );

  const { featured, other } = groupByFeatured(allApps);

  const filteredApps = allApps?.filter((app) => {
    if (selectedTags.includes("all")) return true;

    if ("tags" in app && app.tags)
      return app.tags.some((tag) => selectedTags.includes(tag));

    return false;
  });

  return (
    <>
      <Filters
        appLinks={allApps}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        className="mb-4"
      />

      {selectedTags.includes("all") ? (
        <>
          <AppTileGrid>
            {featured?.map((app, index) => (
              <OverviewTile
                key={app.name}
                app={app}
                isAboveTheFold={index < ABOVE_THE_FOLD_TILE_COUNT}
              />
            ))}
          </AppTileGrid>

          <AppTileGrid className="mt-8">
            {other?.map((app, index) => (
              <OverviewTile
                key={app.name}
                app={app}
                isAboveTheFold={
                  (featured?.length ?? 0) + index < ABOVE_THE_FOLD_TILE_COUNT
                }
              />
            ))}
          </AppTileGrid>
        </>
      ) : (
        <AppTileGrid>
          {filteredApps
            ?.sort((a, b) => a.name.localeCompare(b.name))
            .map((app, index) => (
              <OverviewTile
                key={app.name}
                app={app}
                isAboveTheFold={index < ABOVE_THE_FOLD_TILE_COUNT}
              />
            ))}
        </AppTileGrid>
      )}
    </>
  );
};

interface OverviewTileProps {
  readonly app: App;
  readonly isAboveTheFold: boolean;
}

const OverviewTile = ({ app, isAboveTheFold }: OverviewTileProps) => {
  if ("redacted" in app && app.redacted)
    return <RedactedAppTile name={app.name} />;

  return (
    <AppTile
      app={app as Exclude<App, RedactedApp>}
      isAboveTheFold={isAboveTheFold}
    />
  );
};
