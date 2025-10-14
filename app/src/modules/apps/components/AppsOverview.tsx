"use client";

import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { groupByFeatured } from "../utils/groupByFeatured";
import type { App, RedactedApp } from "../utils/types";
import { AppTile } from "./AppTile";
import { AppTileGrid } from "./AppTileGrid";
import { Filters } from "./Filters";
import { RedactedAppTile } from "./RedactedAppTile";

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
            {featured?.map((app) =>
              "redacted" in app && app.redacted ? (
                <RedactedAppTile key={app.name} />
              ) : (
                <AppTile
                  key={app.name}
                  app={app as Exclude<App, RedactedApp>}
                />
              ),
            )}
          </AppTileGrid>

          <AppTileGrid className="mt-8">
            {other?.map((app) =>
              "redacted" in app && app.redacted ? (
                <RedactedAppTile key={app.name} />
              ) : (
                <AppTile
                  key={app.name}
                  app={app as Exclude<App, RedactedApp>}
                />
              ),
            )}
          </AppTileGrid>
        </>
      ) : (
        <AppTileGrid>
          {filteredApps
            ?.sort((a, b) => a.name.localeCompare(b.name))
            .map((app) =>
              "redacted" in app && app.redacted ? (
                <RedactedAppTile key={app.name} />
              ) : (
                <AppTile
                  key={app.name}
                  app={app as Exclude<App, RedactedApp>}
                />
              ),
            )}
        </AppTileGrid>
      )}
    </>
  );
};
