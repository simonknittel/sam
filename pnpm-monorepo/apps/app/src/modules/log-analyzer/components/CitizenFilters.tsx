"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import type { Entity } from "@sam-monorepo/database/browser";
import { FaUsers } from "react-icons/fa6";
import { useLogAnalyzerContext } from "./LogAnalyzerContext";

interface Props {
  readonly className?: string;
}

/**
 * Narrows the table down to single citizens. The list holds the citizens of
 * the loaded entries, thus it needs no permission to read citizens and no
 * request of its own. No selection shows the entries of everybody.
 */
export const CitizenFilters = ({ className }: Props) => {
  const { entries, citizenFilters, setCitizenFilters } =
    useLogAnalyzerContext();

  const citizens = new Map<Entity["id"], Pick<Entity, "id" | "handle">>();
  for (const entry of entries.values()) {
    if (entry.citizen) citizens.set(entry.citizen.id, entry.citizen);
  }

  const sortedCitizens = Array.from(citizens.values()).toSorted(
    (first, second) => (first.handle ?? "").localeCompare(second.handle ?? ""),
  );

  const handleChange = (citizenId: Entity["id"], isChecked: boolean) => {
    setCitizenFilters((previous) =>
      isChecked
        ? [...previous, citizenId]
        : previous.filter((id) => id !== citizenId),
    );
  };

  return (
    <PopoverBaseUI
      title="Citizens"
      trigger={
        <>
          <FaUsers />
          Citizens
          {citizenFilters.length > 0 && ` (${citizenFilters.length})`}
        </>
      }
      triggerRender={<Button2 variant={Button2Variant.Secondary} />}
      triggerClassName={className}
      childrenClassName="flex flex-col gap-1 w-80"
      openOnHover={false}
    >
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
              checked={citizenFilters.includes(citizen.id)}
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

      {/* A selected citizen can disappear from the list, for example after a
          reload. Without this the filter could not be undone any more. */}
      {citizenFilters.length > 0 && (
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setCitizenFilters([])}
          className="mt-1"
        >
          Alle anzeigen
        </Button2>
      )}
    </PopoverBaseUI>
  );
};
