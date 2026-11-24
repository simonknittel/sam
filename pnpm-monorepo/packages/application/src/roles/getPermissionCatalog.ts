import {
  PERMISSION_CATALOG,
  permissionStringRequiresTwoFactorAuthentication,
  type CatalogPermission,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
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
  /** See `isMissingTwoFactorAuthentication()` */
  readonly requires_two_factor_authentication: boolean;
}

export interface GetPermissionCatalogOutput {
  readonly permissions: CatalogPermissionOutput[];
}

/**
 * Each user can read them: the catalog is static and contains no data of the
 * organization
 */
export const getPermissionCatalog = async (
  _context: ApplicationContext,
  _actor: Actor,
): Promise<GetPermissionCatalogOutput> => {
  return {
    permissions: PERMISSION_CATALOG.map((permission: CatalogPermission) => ({
      permission_string: permission.permissionString,
      section: permission.section,
      title: permission.title,
      description: permission.description ?? null,
      requires_two_factor_authentication:
        permissionStringRequiresTwoFactorAuthentication(
          permission.permissionString,
        ),
    })),
  };
};
