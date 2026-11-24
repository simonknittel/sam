import { getApplicationContext } from "@/modules/application";
import { listHumanResourcesContacts } from "@sam-monorepo/application";
import { cache } from "react";

/**
 * No permission check: the clearance page calls it for a user without
 * permissions
 */
export const getHumanResourcesContacts = cache(() =>
  listHumanResourcesContacts(getApplicationContext()),
);
