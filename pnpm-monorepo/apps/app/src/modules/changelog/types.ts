import type { PermissionSet } from "@sam-monorepo/domain";
import type { ReactNode } from "react";

interface AuthRequirement {
  resource: PermissionSet["resource"];
  action: PermissionSet["operation"];
}

export interface ChangelogEntry {
  /**
   * The read markers store the key of a tracked entry: an entry with a changed
   * key is new again for everybody
   */
  key: string;
  date: string;
  title: string;
  tags?: string[];
  body: () => ReactNode;
  isTracked?: boolean;
  requiresAuth?: AuthRequirement;
}
