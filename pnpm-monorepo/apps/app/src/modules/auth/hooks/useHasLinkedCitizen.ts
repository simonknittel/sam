"use client";

import { useAuthentication } from "./useAuthentication";

/**
 * True when the session of the user resolves to a citizen. Everything which
 * writes rows in the name of a citizen needs one, thus a form which is
 * disabled without a citizen and the code which sends its data must ask the
 * same question.
 */
export const useHasLinkedCitizen = () => {
  const authentication = useAuthentication();
  return Boolean(authentication && authentication.session.entity);
};
