"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import type { Entity } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useMemo } from "react";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

/**
 * Hides the entries of single citizens. The list holds the citizens of the
 * loaded entries, thus it needs no permission to read citizens and no
 * request of its own. Everybody starts checked — like the type filter, an
 * unchecked box hides its entries.
 */
export const CitizenFilters = ({ className }: Props) => {
  const { entries, hiddenCitizenIds, setHiddenCitizenIds } =
    useLogAnalyzerContext();

  /** The walk over all entries runs once per change, not once per render */
  const sortedCitizens = useMemo(() => {
    const citizens = new Map<Entity["id"], Pick<Entity, "id" | "handle">>();
    for (const entry of entries.values()) {
      if (entry.citizen) citizens.set(entry.citizen.id, entry.citizen);
    }

    return Array.from(citizens.values()).toSorted((first, second) =>
      (first.handle ?? "").localeCompare(second.handle ?? ""),
    );
  }, [entries]);

  const handleChange = (citizenId: Entity["id"], isChecked: boolean) => {
    setHiddenCitizenIds((previous) =>
      isChecked
        ? previous.filter((id) => id !== citizenId)
        : [...previous, citizenId],
    );
  };

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <p className="text-sm text-white/60">Nach Reportern filtern</p>

      {sortedCitizens.length > 0 ? (
        sortedCitizens.map((citizen) => {
          const label = (
            <span className="truncate" title={citizen.handle ?? citizen.id}>
              {citizen.handle ?? citizen.id}
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
          Noch keine Citizens in den geladenen Einträgen.
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
