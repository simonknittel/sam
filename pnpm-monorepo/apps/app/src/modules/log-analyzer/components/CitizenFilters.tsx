"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import type { Citizen } from "@sam-monorepo/database/browser";
import { getCitizenDisplayName } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

/**
 * Hides the shared entries of single citizens. The list holds the citizens
 * of the loaded shared entries, thus it needs no permission to read citizens
 * and no request of its own. Everybody starts checked — like the type
 * settings, an unchecked box hides its entries.
 */
export const CitizenFilters = ({ className }: Props) => {
  const { entries, hiddenCitizenIds, setHiddenCitizenIds } =
    useLogAnalyzerContext();

  const citizens = new Map<
    Citizen["id"],
    Pick<Citizen, "id" | "handle" | "deletedAt">
  >();
  for (const entry of entries.values()) {
    if (entry.isShared && entry.citizen)
      citizens.set(entry.citizen.id, entry.citizen);
  }

  const sortedCitizens = Array.from(citizens.values()).toSorted(
    (first, second) => (first.handle ?? "").localeCompare(second.handle ?? ""),
  );

  const handleChange = (citizenId: Citizen["id"], isChecked: boolean) => {
    setHiddenCitizenIds((previous) =>
      isChecked
        ? previous.filter((id) => id !== citizenId)
        : [...previous, citizenId],
    );
  };

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <p className="text-sm text-white/60">Reporter der Einträge anderer</p>

      {sortedCitizens.length > 0 ? (
        sortedCitizens.map((citizen) => {
          const label = (
            <span className="truncate" title={getCitizenDisplayName(citizen)}>
              {getCitizenDisplayName(citizen)}
            </span>
          );

          return (
            <YesNoCheckbox
              key={citizen.id}
              yesLabel={label}
              noLabel={label}
              labelClassName="text-sm flex-1 min-w-0"
              checked={!hiddenCitizenIds.includes(citizen.id)}
              onChange={(event) =>
                handleChange(citizen.id, event.target.checked)
              }
            />
          );
        })
      ) : (
        <p className="text-sm text-white/60">
          Noch keine Einträge anderer Citizens geladen.
        </p>
      )}

      {/* A hidden citizen can disappear from the list, for example after a
          reload. Without this their entries could not be shown again. */}
      {hiddenCitizenIds.length > 0 && (
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setHiddenCitizenIds([])}
          className="mt-1"
        >
          Alle anzeigen
        </Button2>
      )}
    </div>
  );
};
