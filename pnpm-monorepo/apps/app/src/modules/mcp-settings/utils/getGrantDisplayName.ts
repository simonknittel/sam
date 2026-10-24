import type { OwnGrant } from "@sam-monorepo/application";

/** The own name of the user, or the name that the client gives itself */
export const getGrantDisplayName = (
  grant: Pick<OwnGrant, "customName" | "clientName">,
) => grant.customName ?? grant.clientName;
