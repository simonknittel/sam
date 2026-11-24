"use client";

import { useAuthentication } from "./useAuthentication";

export const useIsOwnCitizen = (citizenId: string | undefined) => {
  const authentication = useAuthentication();

  return Boolean(
    authentication &&
    citizenId &&
    authentication.session.entity?.id === citizenId,
  );
};
