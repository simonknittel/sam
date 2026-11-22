"use client";

import { useAuthentication } from "./useAuthentication";

/** Whether the citizen is the citizen of the signed-in user */
export const useIsOwnCitizen = (citizenId: string | undefined) => {
  const authentication = useAuthentication();

  return Boolean(
    authentication &&
    citizenId &&
    authentication.session.entity?.id === citizenId,
  );
};
