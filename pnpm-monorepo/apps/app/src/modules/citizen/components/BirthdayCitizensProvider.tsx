"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

/**
 * The ids of the citizens who have their birthday today. An empty set
 * outside of the app shell, and for a viewer who must not read citizens.
 */
const BirthdayCitizensContext = createContext<ReadonlySet<string>>(new Set());

interface Props {
  readonly children: ReactNode;
  readonly citizenIds: readonly string[];
}

/**
 * Every citizen link asks whether the citizen behind it celebrates today.
 * The answer travels once with the app shell instead of once for each link:
 * a link knows only the id of its citizen, and the birthday of a citizen
 * never reaches the browser — see `getCitizenIdsWithBirthdayToday`.
 */
export const BirthdayCitizensProvider = ({ children, citizenIds }: Props) => {
  const value = useMemo(() => new Set(citizenIds), [citizenIds]);

  return (
    <BirthdayCitizensContext.Provider value={value}>
      {children}
    </BirthdayCitizensContext.Provider>
  );
};

/** False without the provider, thus a link outside the app shell stays plain */
export const useHasBirthdayToday = (citizenId: string | undefined) => {
  const citizenIds = useContext(BirthdayCitizensContext);

  return citizenId ? citizenIds.has(citizenId) : false;
};
