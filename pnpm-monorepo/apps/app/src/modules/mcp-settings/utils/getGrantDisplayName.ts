import type { OwnGrant } from "@sam-monorepo/application";

export const getGrantDisplayName = (
  grant: Pick<OwnGrant, "customName" | "clientName">,
) => grant.customName ?? grant.clientName;
