import type { GameVersion } from "@/generated/prisma/client";
import { RadioFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/RadioFilter";
import { SingleSelectComboboxFilter } from "@/modules/common/components/layouts/SidebarLayout/Filters/SingleSelectComboboxFilter";
import { getGameVersions } from "../queries/getGameVersions";

export const BlueprintsFilters = async () => {
  const groupedVersions: Record<
    string,
    Pick<GameVersion, "id" | "version" | "channel">[]
  > = {};
  const gameVersions = await getGameVersions();

  for (const gv of gameVersions.all) {
    if (!groupedVersions[gv.channel]) {
      groupedVersions[gv.channel] = [];
    }
    groupedVersions[gv.channel].push(gv);
  }

  const versionItems = gameVersions.all.map((gv) => ({
    value: gv.id,
    label: `${gv.version} (${gv.channel})`,
  }));

  return (
    <>
      <SingleSelectComboboxFilter
        name="gameVersionId"
        label="Version"
        items={versionItems}
        placeholder="Alle"
        resetCursorPagination
      />

      <RadioFilter
        name="unlockStatus"
        label="Status"
        items={[
          { value: "all", label: "Alle", default: true },
          { value: "unlocked", label: "Freigeschaltet" },
          { value: "not_unlocked", label: "Nicht" },
        ]}
        resetCursorPagination
      />

      <SingleSelectComboboxFilter
        name="sort"
        label="Sortierung"
        items={[
          { value: "count-desc", label: "Anzahl ↓" },
          { value: "count-asc", label: "Anzahl ↑" },
          { value: "name-asc", label: "Name A – Z" },
          { value: "name-desc", label: "Name Z – A" },
        ]}
        resetCursorPagination
      />
    </>
  );
};
