import { EventTemplateAccessType } from "@sam-monorepo/database/browser";

export interface EventTemplatePermissionSource {
  readonly id: string;
  /** The live permission-bearing owner; `createdById` carries no rights */
  readonly ownedById: string | null;
  /** Soft-deleted templates grant nothing (see the grant rules below) */
  readonly deletedAt: Date | null;
  readonly roleAccess: readonly {
    readonly roleId: string;
    readonly type: EventTemplateAccessType;
  }[];
}

export interface EventTemplateViewer {
  /** NULL for a session without a citizen, which can never own a template */
  readonly citizenId: string | null;
  /** Effective roles (level gate + inheritance already applied) */
  readonly roleIds: ReadonlySet<string>;
  readonly hasEventManage: boolean;
  readonly hasTemplateShareManage: boolean;
}

export interface ResolvedEventTemplatePermissions {
  /** See the template and use it when creating an event */
  readonly canRead: boolean;
  /** Change title, description, cover, visibility prefill, lineup, briefing */
  readonly canEdit: boolean;
  /** Delete, restore */
  readonly canManage: boolean;
  /** Change the role shares and transfer ownership */
  readonly canManageShares: boolean;
}

const NO_ACCESS: ResolvedEventTemplatePermissions = {
  canRead: false,
  canEdit: false,
  canManage: false,
  canManageShares: false,
};

/**
 * Resolves one viewer's access to a set of event templates.
 *
 * Grant rules:
 * - `event;manage` grants every capability on every template, including
 *   personal ones and soft-deleted ones (it is the permission the management
 *   of foreign templates and the restore surface hang off).
 * - The owner may read, edit and delete/restore their template. Changing its
 *   shares or handing it on additionally takes `eventTemplateShare;manage` —
 *   an owner who loses that permission keeps their content and delete rights
 *   while the existing shares keep working.
 * - Role shares grant content access only: a tier of EDIT grants editing, a
 *   tier of READ grants reading and using. Edit implies read, so a role
 *   granted EDIT never needs a second row.
 * - A soft-deleted template grants nothing to anyone but its owner and
 *   `event;manage` holders — a share must not keep a deleted template alive
 *   in someone else's list or in the create-event picker.
 * - `createdById` is a pure audit fact: after a transfer the creator is an
 *   ordinary viewer and may lose access entirely.
 */
export const createEventTemplatePermissionResolver = (
  templates: readonly EventTemplatePermissionSource[],
  viewer: EventTemplateViewer,
) => {
  const templatesById = new Map(
    templates.map((template) => [template.id, template]),
  );

  const get = (
    templateId: string,
  ): ResolvedEventTemplatePermissions | undefined => {
    const template = templatesById.get(templateId);
    if (!template) return undefined;

    if (viewer.hasEventManage)
      return {
        canRead: true,
        canEdit: true,
        canManage: true,
        canManageShares: true,
      };

    const isOwner =
      viewer.citizenId !== null && template.ownedById === viewer.citizenId;

    if (isOwner)
      return {
        canRead: true,
        canEdit: true,
        canManage: true,
        canManageShares: viewer.hasTemplateShareManage,
      };

    if (template.deletedAt !== null) return NO_ACCESS;

    const grantedTypes = template.roleAccess
      .filter((access) => viewer.roleIds.has(access.roleId))
      .map((access) => access.type);

    const canEdit = grantedTypes.includes(EventTemplateAccessType.EDIT);

    return {
      canEdit,
      canRead: canEdit || grantedTypes.includes(EventTemplateAccessType.READ),
      canManage: false,
      canManageShares: false,
    };
  };

  return { get };
};

/**
 * Resolves the effective permissions of the given viewer for every given
 * template — see `createEventTemplatePermissionResolver()` for the rules.
 */
export const resolveEventTemplatePermissions = (
  templates: readonly EventTemplatePermissionSource[],
  viewer: EventTemplateViewer,
) => {
  const resolver = createEventTemplatePermissionResolver(templates, viewer);

  const result = new Map<string, ResolvedEventTemplatePermissions>();
  for (const template of templates) {
    const permissions = resolver.get(template.id);
    if (permissions) result.set(template.id, permissions);
  }

  return result;
};
