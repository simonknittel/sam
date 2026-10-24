import {
  PERMISSION_CATALOG,
  type CatalogPermission,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";

export const getPermissionCatalogInputSchema = z.strictObject({});

export interface CatalogPermissionOutput {
  readonly permission_string: string;
  /** German */
  readonly section: string;
  /** German */
  readonly title: string;
  /** German, or null */
  readonly description: string | null;
}

export interface GetPermissionCatalogOutput {
  /** In the order of the sections */
  readonly permissions: CatalogPermissionOutput[];
}

/**
 * The permissions that the role page offers as a checkbox, with the texts of
 * the role page (see `PERMISSION_CATALOG`). Requires `role;manage`.
 */
export const getPermissionCatalog = async (
  _context: ApplicationContext,
  actor: Actor,
): Promise<GetPermissionCatalogOutput> => {
  requirePermission(actor, "role", "manage");

  return {
    permissions: PERMISSION_CATALOG.map((permission: CatalogPermission) => ({
      permission_string: permission.permissionString,
      section: permission.section,
      title: permission.title,
      description: permission.description ?? null,
    })),
  };
};
