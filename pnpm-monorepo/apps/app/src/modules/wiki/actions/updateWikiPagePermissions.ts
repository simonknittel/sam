"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import {
  createWikiPagePermissionResolver,
  resolveWikiPageReadRoleIds,
} from "@sam-monorepo/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getWikiContext,
  type WikiContextPage,
} from "../queries/getWikiContext";
import { getWikiPermissionRoles } from "../queries/getWikiPermissionRoles";
import { getWikiViewerForCitizen } from "../queries/getWikiViewerForCitizen";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";
import { collectWikiPageRolePrunes } from "../utils/collectWikiPageRolePrunes";

const schema = z.object({
  id: z.cuid2(),
  visibility: z.enum(WikiPageVisibility),
  editability: z.enum(WikiPageEditability),
  imageUploadability: z.enum(WikiPageUploadability),
  attachmentUploadability: z.enum(WikiPageUploadability),
  readRoles: z.array(z.cuid()).max(50),
  editRoles: z.array(z.cuid()).max(50),
  adminRoles: z.array(z.cuid()).max(50),
  cascadeVisibility: z.coerce.boolean(),
  cascadeEditability: z.coerce.boolean(),
  cascadeAdminRoles: z.coerce.boolean(),
  cascadeImageUploadability: z.coerce.boolean(),
  cascadeAttachmentUploadability: z.coerce.boolean(),
  ownerMode: z.enum(["inherit", "explicit"]),
  newOwnerId: z.cuid().optional(),
  cascadeOwner: z.coerce.boolean(),
});

export const updateWikiPagePermissions = createAuthenticatedAction(
  "updateWikiPagePermissions",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Top-level pages must not inherit — there is nothing to inherit from.
     * Child pages in turn must not be public: read access only narrows
     * downwards, so "public" below a restricted page would be a promise the
     * resolver cannot keep.
     */
    if (
      !page.parentId &&
      (data.visibility === WikiPageVisibility.INHERIT ||
        data.editability === WikiPageEditability.INHERIT ||
        data.imageUploadability === WikiPageUploadability.INHERIT ||
        data.attachmentUploadability === WikiPageUploadability.INHERIT)
    )
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (page.parentId && data.visibility === WikiPageVisibility.PUBLIC)
      return { error: t("Common.badRequest"), requestPayload: formData };

    /**
     * Owner: "inherit" resolves via the ancestor chain (child pages only —
     * a top-level page without an explicit owner would only be manageable
     * via wiki;manage), "explicit" requires an existing citizen.
     */
    const newOwnerId =
      data.ownerMode === "inherit" ? null : (data.newOwnerId ?? null);
    if (data.ownerMode === "explicit") {
      if (!newOwnerId)
        return { error: t("Common.badRequest"), requestPayload: formData };
      const owner = await prisma.entity.findUnique({
        where: { id: newOwnerId },
        select: { id: true },
      });
      if (!owner)
        return { error: t("Common.badRequest"), requestPayload: formData };
    }
    if (!page.parentId && !newOwnerId)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const roles = await getWikiPermissionRoles();
    const readRoles = [...new Set(data.readRoles)];
    const editRoles = [...new Set(data.editRoles)];
    const adminRoles = [...new Set(data.adminRoles)];

    /**
     * Nobody gets access to a page they cannot reach: every role and the
     * explicit owner must be able to read the parent. The pickers only offer
     * such roles, so this normally only catches entries that lost their
     * access to the parent in the meantime — naming them is more helpful
     * than silently dropping part of the selection.
     */
    if (page.parentId) {
      const allowedRoleIds = resolveWikiPageReadRoleIds(
        context.allPages,
        roles,
        page.parentId,
      );
      const rejected = [
        ...new Set([...readRoles, ...editRoles, ...adminRoles]),
      ].filter((roleId) => !allowedRoleIds.has(roleId));
      if (rejected.length > 0) {
        const names = rejected.map(
          (roleId) => roles.find((role) => role.id === roleId)?.name ?? roleId,
        );
        return {
          error: `Diese Rollen dürfen die übergeordnete Seite nicht lesen und können deshalb auch auf diese Seite keinen Zugriff erhalten: ${names.join(", ")}.`,
          requestPayload: formData,
        };
      }

      if (newOwnerId) {
        const ownerViewer = await getWikiViewerForCitizen(newOwnerId);
        const ownerCanReachPage = createWikiPagePermissionResolver(
          context.allPages,
          ownerViewer,
        ).get(page.parentId)?.canRead;
        if (!ownerCanReachPage)
          return {
            error:
              "Der ausgewählte Besitzer darf die übergeordnete Seite nicht lesen und hätte deshalb keinen Zugriff auf diese Seite.",
            requestPayload: formData,
          };
      }
    }

    const roleAccess = [
      ...readRoles.map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.READ,
      })),
      ...editRoles.map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.EDIT,
      })),
      ...adminRoles.map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.ADMIN,
      })),
    ];

    /**
     * Cascades reset the tier on all descendants to INHERIT (they then
     * follow this page's setting) and drop their now irrelevant role lists
     * for that tier. Managing a page means managing its whole subtree, so
     * there is never a descendant the actor may not touch.
     */
    const descendantIds = collectWikiPageDescendants(context.pages, page.id);

    const anyCascade =
      data.cascadeVisibility ||
      data.cascadeEditability ||
      data.cascadeAdminRoles ||
      data.cascadeImageUploadability ||
      data.cascadeAttachmentUploadability;

    /**
     * The owner cascade resets descendants to inherited ownership so they
     * follow this page's owner.
     */
    const ownerCascadeIds = data.cascadeOwner
      ? descendantIds.filter(
          (id) => context.pagesById.get(id)?.ownerId !== null,
        )
      : [];

    /**
     * Descendants whose role access stops granting anything because this
     * page (or one of the cascades) narrowed their access — derived from the
     * page data as it will be after this update. Soft-deleted descendants are
     * included, so restoring one cannot bring dead entries back.
     */
    const cascadedIds = new Set(descendantIds);
    const ownerCascadeIdSet = new Set(ownerCascadeIds);
    const updatedPages: WikiContextPage[] = context.allPages.map((entry) => {
      if (entry.id === page.id)
        return {
          ...entry,
          visibility: data.visibility,
          editability: data.editability,
          imageUploadability: data.imageUploadability,
          attachmentUploadability: data.attachmentUploadability,
          ownerId: newOwnerId,
          roleAccess: roleAccess.map(({ roleId, type }) => ({ roleId, type })),
        };

      if (!cascadedIds.has(entry.id)) return entry;

      return {
        ...entry,
        visibility: data.cascadeVisibility
          ? WikiPageVisibility.INHERIT
          : entry.visibility,
        editability: data.cascadeEditability
          ? WikiPageEditability.INHERIT
          : entry.editability,
        imageUploadability: data.cascadeImageUploadability
          ? WikiPageUploadability.INHERIT
          : entry.imageUploadability,
        attachmentUploadability: data.cascadeAttachmentUploadability
          ? WikiPageUploadability.INHERIT
          : entry.attachmentUploadability,
        ownerId: ownerCascadeIdSet.has(entry.id) ? null : entry.ownerId,
        roleAccess: entry.roleAccess.filter(
          (access) =>
            !(
              data.cascadeVisibility && access.type === WikiPageAccessType.READ
            ) &&
            !(
              data.cascadeEditability && access.type === WikiPageAccessType.EDIT
            ) &&
            !(
              data.cascadeAdminRoles && access.type === WikiPageAccessType.ADMIN
            ),
        ),
      };
    });

    const prunes = collectWikiPageRolePrunes(
      updatedPages,
      roles,
      collectWikiPageDescendants(context.allPages, page.id),
    );

    await prisma.$transaction([
      prisma.wikiPage.update({
        where: { id: page.id },
        data: {
          visibility: data.visibility,
          editability: data.editability,
          imageUploadability: data.imageUploadability,
          attachmentUploadability: data.attachmentUploadability,
          ownerId: newOwnerId,
          updatedById: authentication.session.entity?.id ?? null,
        },
      }),
      ...(ownerCascadeIds.length > 0
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: ownerCascadeIds } },
              data: { ownerId: null },
            }),
          ]
        : []),
      prisma.wikiPageRoleAccess.deleteMany({ where: { pageId: page.id } }),
      prisma.wikiPageRoleAccess.createMany({ data: roleAccess }),
      ...(descendantIds.length > 0 && data.cascadeVisibility
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: descendantIds } },
              data: { visibility: WikiPageVisibility.INHERIT },
            }),
            prisma.wikiPageRoleAccess.deleteMany({
              where: {
                pageId: { in: descendantIds },
                type: WikiPageAccessType.READ,
              },
            }),
          ]
        : []),
      ...(descendantIds.length > 0 && data.cascadeEditability
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: descendantIds } },
              data: { editability: WikiPageEditability.INHERIT },
            }),
            prisma.wikiPageRoleAccess.deleteMany({
              where: {
                pageId: { in: descendantIds },
                type: WikiPageAccessType.EDIT,
              },
            }),
          ]
        : []),
      /** Manage has no tier to reset, only the additional manager roles */
      ...(descendantIds.length > 0 && data.cascadeAdminRoles
        ? [
            prisma.wikiPageRoleAccess.deleteMany({
              where: {
                pageId: { in: descendantIds },
                type: WikiPageAccessType.ADMIN,
              },
            }),
          ]
        : []),
      /** The upload tiers have no role lists to drop */
      ...(descendantIds.length > 0 && data.cascadeImageUploadability
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: descendantIds } },
              data: { imageUploadability: WikiPageUploadability.INHERIT },
            }),
          ]
        : []),
      ...(descendantIds.length > 0 && data.cascadeAttachmentUploadability
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: descendantIds } },
              data: { attachmentUploadability: WikiPageUploadability.INHERIT },
            }),
          ]
        : []),
      ...(prunes.length > 0
        ? [
            prisma.wikiPageRoleAccess.deleteMany({
              where: {
                OR: prunes.map((prune) => ({
                  pageId: prune.pageId,
                  roleId: { in: prune.roleIds },
                })),
              },
            }),
          ]
        : []),
    ]);

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED,
        data: {
          pageId: page.id,
          visibility: data.visibility,
          editability: data.editability,
          imageUploadability: data.imageUploadability,
          attachmentUploadability: data.attachmentUploadability,
          readRoleIds: readRoles,
          editRoleIds: data.editRoles,
          adminRoleIds: data.adminRoles,
          cascaded: false,
        },
        createdById: authentication.session.user.id,
      },
      ...(anyCascade
        ? descendantIds.map((id) => ({
            type: AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED as const,
            data: {
              pageId: id,
              visibility: data.cascadeVisibility
                ? WikiPageVisibility.INHERIT
                : "unchanged",
              editability: data.cascadeEditability
                ? WikiPageEditability.INHERIT
                : "unchanged",
              imageUploadability: data.cascadeImageUploadability
                ? WikiPageUploadability.INHERIT
                : "unchanged",
              attachmentUploadability: data.cascadeAttachmentUploadability
                ? WikiPageUploadability.INHERIT
                : "unchanged",
              readRoleIds: [],
              editRoleIds: [],
              adminRoleIds: [],
              cascaded: true,
            },
            createdById: authentication.session.user.id,
          }))
        : []),
      ...prunes.map((prune) => ({
        type: AuditEventType.WIKI_PAGE_ROLE_ACCESS_PRUNED as const,
        data: {
          pageId: prune.pageId,
          removedRoleIds: prune.roleIds,
          trigger: "PERMISSIONS_UPDATED" as const,
        },
        createdById: authentication.session.user.id,
      })),
      ...(newOwnerId !== page.ownerId
        ? [
            {
              type: AuditEventType.WIKI_PAGE_OWNERSHIP_TRANSFERRED as const,
              data: {
                pageId: page.id,
                previousOwnerId: page.ownerId,
                newOwnerId,
                cascaded: false,
              },
              createdById: authentication.session.user.id,
            },
          ]
        : []),
      ...ownerCascadeIds.map((id) => ({
        type: AuditEventType.WIKI_PAGE_OWNERSHIP_TRANSFERRED as const,
        data: {
          pageId: id,
          previousOwnerId: context.pagesById.get(id)?.ownerId ?? null,
          newOwnerId: null,
          cascaded: true,
        },
        createdById: authentication.session.user.id,
      })),
    ]);

    revalidatePath("/app/wiki", "layout");

    return {
      success:
        prunes.length > 0
          ? `Erfolgreich gespeichert. Auf ${prunes.length} Unterseite(n) wurden Rollen entfernt, die dadurch keinen Zugriff mehr hatten.`
          : t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      visibility: formData.get("visibility"),
      editability: formData.get("editability"),
      imageUploadability: formData.get("imageUploadability"),
      attachmentUploadability: formData.get("attachmentUploadability"),
      readRoles: formData.getAll("readRole[]"),
      editRoles: formData.getAll("editRole[]"),
      adminRoles: formData.getAll("adminRole[]"),
      cascadeVisibility: formData.get("cascadeVisibility") ?? undefined,
      cascadeEditability: formData.get("cascadeEditability") ?? undefined,
      cascadeAdminRoles: formData.get("cascadeAdminRoles") ?? undefined,
      cascadeImageUploadability:
        formData.get("cascadeImageUploadability") ?? undefined,
      cascadeAttachmentUploadability:
        formData.get("cascadeAttachmentUploadability") ?? undefined,
      ownerMode: formData.get("ownerMode"),
      newOwnerId: formData.get("newOwnerId") || undefined,
      cascadeOwner: formData.get("cascadeOwner") ?? undefined,
    }),
  },
);
