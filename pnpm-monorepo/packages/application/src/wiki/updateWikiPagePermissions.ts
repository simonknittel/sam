import {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import {
  collectWikiPageDescendants,
  createWikiPagePermissionResolver,
  resolveWikiPageReadRoleIds,
  WikiScopeKind,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiPageAccessTier } from "./getAccessibleWikiPage.js";
import type { WikiContextPage } from "./wikiContext.js";
import {
  WikiErrorMessage,
  WikiRolesCannotReadParentError,
} from "./wikiErrors.js";
import {
  buildWikiPagePermissionsAuditEvents,
  runWikiPagePermissionsBatch,
  type WikiPagePermissionsWrite,
} from "./wikiPagePermissionsWrite.js";
import { collectWikiPageRolePrunes } from "./wikiPageRolePrunes.js";
import {
  findWikiPermissionRoles,
  toWikiPageViewerOfCitizen,
} from "./wikiPermissionRoles.js";
import { requireWikiPageOfScope } from "./wikiScope.js";

export enum WikiPageOwnerMode {
  /** The owner of the nearest ancestor with an owner */
  Inherit = "inherit",
  Explicit = "explicit",
}

/** A limit for the request */
const MAXIMUM_WIKI_PAGE_ACCESS_ROLES = 50;

const accessRoleIdsSchema = z
  .array(idSchema)
  .max(MAXIMUM_WIKI_PAGE_ACCESS_ROLES);

export const updateWikiPagePermissionsInputSchema = z.object({
  page_id: idSchema,
  visibility: z.enum(WikiPageVisibility),
  editability: z.enum(WikiPageEditability),
  image_uploadability: z.enum(WikiPageUploadability),
  attachment_uploadability: z.enum(WikiPageUploadability),
  read_role_ids: accessRoleIdsSchema,
  edit_role_ids: accessRoleIdsSchema,
  admin_role_ids: accessRoleIdsSchema,
  /**
   * Each cascade resets the tier of all descendants to INHERIT and removes
   * their role lists of that tier
   */
  cascade_visibility: z.boolean(),
  cascade_editability: z.boolean(),
  /** Removes the manager roles of all descendants (there is no tier) */
  cascade_admin_roles: z.boolean(),
  cascade_image_uploadability: z.boolean(),
  cascade_attachment_uploadability: z.boolean(),
  /** Resets the owner of all descendants to the inherited owner */
  cascade_owner: z.boolean(),
  owner_mode: z.enum(WikiPageOwnerMode),
  /** Required for `WikiPageOwnerMode.Explicit` */
  new_owner_id: idSchema.optional(),
});

export type UpdateWikiPagePermissionsInput = z.infer<
  typeof updateWikiPagePermissionsInputSchema
>;

export interface UpdateWikiPagePermissionsOutput {
  readonly page_id: string;
  /**
   * The number of the descendants that lost role access entries, because
   * the roles cannot read the page above them after the update
   */
  readonly pruned_page_count: number;
}

export const updateWikiPagePermissions = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiPagePermissionsInput,
): Promise<UpdateWikiPagePermissionsOutput> =>
  withSpan(context, "updateWikiPagePermissions", async () => {
    const { scope, page } = await requireWikiPageOfScope(
      context,
      actor,
      input.page_id,
      WikiPageAccessTier.Admin,
    );
    /** A page of a briefing has its own use case */
    if (scope.kind !== WikiScopeKind.Wiki)
      throw new NotFoundError(WikiErrorMessage.PageNotFound);

    /**
     * A top-level page cannot inherit: there is nothing to inherit from. A
     * child page cannot be public: the read access only narrows downwards,
     * thus "public" below a restricted page is a promise that the resolver
     * cannot keep.
     */
    if (
      !page.parentId &&
      (input.visibility === WikiPageVisibility.INHERIT ||
        input.editability === WikiPageEditability.INHERIT ||
        input.image_uploadability === WikiPageUploadability.INHERIT ||
        input.attachment_uploadability === WikiPageUploadability.INHERIT)
    )
      throw new ValidationError("A top-level page cannot inherit a tier");

    /**
     * The parent comes from the scope, and the write takes no lock of the
     * tree: a move of the page below a parent at the same time makes the
     * PUBLIC write fail the CHECK constraint `WikiPage_public_top_level_check`
     * (a known defect)
     */
    if (page.parentId && input.visibility === WikiPageVisibility.PUBLIC)
      throw new ValidationError("A child page cannot be public");

    /**
     * The inherited owner comes from the ancestors (child pages only: a
     * top-level page without an own owner has only the managers of
     * `wiki;manage`). An own owner must be an existing citizen. A deleted
     * citizen is accepted too (a known defect).
     */
    const newOwnerId =
      input.owner_mode === WikiPageOwnerMode.Inherit
        ? null
        : (input.new_owner_id ?? null);
    if (input.owner_mode === WikiPageOwnerMode.Explicit) {
      if (!newOwnerId)
        throw new ValidationError("An own owner needs a citizen");

      const owner = await context.prisma.citizen.findUnique({
        where: { id: newOwnerId },
        select: { id: true },
      });
      if (!owner) throw new ValidationError("The owner does not exist");
    }
    if (!page.parentId && !newOwnerId)
      throw new ValidationError("A top-level page needs an own owner");

    const roles = await findWikiPermissionRoles(context);
    const readRoleIds = [...new Set(input.read_role_ids)];
    const editRoleIds = [...new Set(input.edit_role_ids)];
    const adminRoleIds = [...new Set(input.admin_role_ids)];

    /**
     * Nobody gets access to a page that they cannot reach: each role and the
     * own owner must be able to read the parent. The pickers offer only such
     * roles, thus this finds the entries that lost their access to the
     * parent in the meantime. The names of the roles help more than a part
     * of the selection that disappears silently.
     */
    if (page.parentId) {
      const allowedRoleIds = resolveWikiPageReadRoleIds(
        scope.allPages,
        roles,
        page.parentId,
      );
      const rejectedRoleIds = [
        ...new Set([
          ...readRoleIds,
          ...editRoleIds,
          ...adminRoleIds,
        ]).difference(allowedRoleIds),
      ];
      if (rejectedRoleIds.length > 0)
        throw new WikiRolesCannotReadParentError(
          rejectedRoleIds.map(
            (roleId) =>
              roles.find((role) => role.id === roleId)?.name ?? roleId,
          ),
        );

      if (newOwnerId) {
        const ownerViewer = await toWikiPageViewerOfCitizen(
          context,
          newOwnerId,
        );
        const ownerCanReachPage = createWikiPagePermissionResolver(
          scope.allPages,
          ownerViewer,
        ).get(page.parentId)?.canRead;
        if (!ownerCanReachPage)
          throw new ValidationError(WikiErrorMessage.OwnerCannotReadParent);
      }
    }

    const roleAccess = [
      ...readRoleIds.map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.READ,
      })),
      ...editRoleIds.map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.EDIT,
      })),
      ...adminRoleIds.map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.ADMIN,
      })),
    ];

    /**
     * The manager of a page manages its full subtree, thus there is no
     * descendant that the actor cannot change
     */
    const descendantIds = collectWikiPageDescendants(scope.pages, page.id);

    const ownerCascadeIds = input.cascade_owner
      ? descendantIds.filter((id) => scope.pagesById.get(id)?.ownerId !== null)
      : [];

    /**
     * The descendants whose role access gives nothing after the update,
     * because this page or a cascade narrowed their access. The prunes come
     * from the pages as they are after the update. The descendants in the
     * trash are included, thus a restore cannot bring dead entries back.
     */
    const cascadedIds = new Set(descendantIds);
    const ownerCascadeIdSet = new Set(ownerCascadeIds);
    const updatedPages: WikiContextPage[] = scope.allPages.map((entry) => {
      if (entry.id === page.id)
        return {
          ...entry,
          visibility: input.visibility,
          editability: input.editability,
          imageUploadability: input.image_uploadability,
          attachmentUploadability: input.attachment_uploadability,
          ownerId: newOwnerId,
          roleAccess: roleAccess.map(({ roleId, type }) => ({ roleId, type })),
        };

      if (!cascadedIds.has(entry.id)) return entry;

      return {
        ...entry,
        visibility: input.cascade_visibility
          ? WikiPageVisibility.INHERIT
          : entry.visibility,
        editability: input.cascade_editability
          ? WikiPageEditability.INHERIT
          : entry.editability,
        imageUploadability: input.cascade_image_uploadability
          ? WikiPageUploadability.INHERIT
          : entry.imageUploadability,
        attachmentUploadability: input.cascade_attachment_uploadability
          ? WikiPageUploadability.INHERIT
          : entry.attachmentUploadability,
        ownerId: ownerCascadeIdSet.has(entry.id) ? null : entry.ownerId,
        roleAccess: entry.roleAccess.filter(
          (access) =>
            !(
              input.cascade_visibility &&
              access.type === WikiPageAccessType.READ
            ) &&
            !(
              input.cascade_editability &&
              access.type === WikiPageAccessType.EDIT
            ) &&
            !(
              input.cascade_admin_roles &&
              access.type === WikiPageAccessType.ADMIN
            ),
        ),
      };
    });

    const prunes = collectWikiPageRolePrunes(
      updatedPages,
      roles,
      collectWikiPageDescendants(scope.allPages, page.id),
    );

    const write: WikiPagePermissionsWrite = {
      input,
      pageId: page.id,
      pagesById: scope.pagesById,
      readRoleIds,
      roleAccess,
      newOwnerId,
      descendantIds,
      ownerCascadeIds,
      prunes,
    };
    await runWikiPagePermissionsBatch(
      context,
      write,
      actor.citizen?.id ?? null,
    );
    await context.audit.create(
      buildWikiPagePermissionsAuditEvents(write, actor.userId),
    );

    return { page_id: page.id, pruned_page_count: prunes.length };
  });
