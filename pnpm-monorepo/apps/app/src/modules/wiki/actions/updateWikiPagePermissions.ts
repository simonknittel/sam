"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  WikiPageAccessType,
  WikiPageAdminability,
  WikiPageEditability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { collectWikiPageDescendants } from "../utils/collectWikiPageDescendants";

const schema = z.object({
  id: z.cuid2(),
  visibility: z.enum(WikiPageVisibility),
  editability: z.enum(WikiPageEditability),
  adminability: z.enum(WikiPageAdminability),
  readRoles: z.array(z.cuid()).max(50),
  editRoles: z.array(z.cuid()).max(50),
  adminRoles: z.array(z.cuid()).max(50),
  cascadeVisibility: z.coerce.boolean(),
  cascadeEditability: z.coerce.boolean(),
  cascadeAdminability: z.coerce.boolean(),
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
     */
    if (
      !page.parentId &&
      (data.visibility === WikiPageVisibility.INHERIT ||
        data.editability === WikiPageEditability.INHERIT ||
        data.adminability === WikiPageAdminability.INHERIT)
    )
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

    const roleAccess = [
      ...[...new Set(data.readRoles)].map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.READ,
      })),
      ...[...new Set(data.editRoles)].map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.EDIT,
      })),
      ...[...new Set(data.adminRoles)].map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.ADMIN,
      })),
    ];

    /**
     * Cascades reset the tier on all descendants the actor has admin on to
     * INHERIT (they then follow this page's setting) and drop their now
     * irrelevant role lists for that tier.
     */
    const descendantIds = collectWikiPageDescendants(context.pages, page.id);
    const cascadableIds = descendantIds.filter(
      (id) => context.permissions.get(id)?.canAdmin,
    );
    const skippedCount = descendantIds.length - cascadableIds.length;

    const anyCascade =
      data.cascadeVisibility ||
      data.cascadeEditability ||
      data.cascadeAdminability;

    /**
     * The owner cascade resets descendants to inherited ownership so they
     * follow this page's owner — only where the actor has admin.
     */
    const ownerCascadeIds = data.cascadeOwner
      ? cascadableIds.filter(
          (id) => context.pagesById.get(id)?.ownerId !== null,
        )
      : [];

    await prisma.$transaction([
      prisma.wikiPage.update({
        where: { id: page.id },
        data: {
          visibility: data.visibility,
          editability: data.editability,
          adminability: data.adminability,
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
      ...(cascadableIds.length > 0 && data.cascadeVisibility
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: cascadableIds } },
              data: { visibility: WikiPageVisibility.INHERIT },
            }),
            prisma.wikiPageRoleAccess.deleteMany({
              where: {
                pageId: { in: cascadableIds },
                type: WikiPageAccessType.READ,
              },
            }),
          ]
        : []),
      ...(cascadableIds.length > 0 && data.cascadeEditability
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: cascadableIds } },
              data: { editability: WikiPageEditability.INHERIT },
            }),
            prisma.wikiPageRoleAccess.deleteMany({
              where: {
                pageId: { in: cascadableIds },
                type: WikiPageAccessType.EDIT,
              },
            }),
          ]
        : []),
      ...(cascadableIds.length > 0 && data.cascadeAdminability
        ? [
            prisma.wikiPage.updateMany({
              where: { id: { in: cascadableIds } },
              data: { adminability: WikiPageAdminability.INHERIT },
            }),
            prisma.wikiPageRoleAccess.deleteMany({
              where: {
                pageId: { in: cascadableIds },
                type: WikiPageAccessType.ADMIN,
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
          adminability: data.adminability,
          readRoleIds: data.readRoles,
          editRoleIds: data.editRoles,
          adminRoleIds: data.adminRoles,
          cascaded: false,
        },
        createdById: authentication.session.user.id,
      },
      ...(anyCascade
        ? cascadableIds.map((id) => ({
            type: AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED as const,
            data: {
              pageId: id,
              visibility: data.cascadeVisibility
                ? WikiPageVisibility.INHERIT
                : "unchanged",
              editability: data.cascadeEditability
                ? WikiPageEditability.INHERIT
                : "unchanged",
              adminability: data.cascadeAdminability
                ? WikiPageAdminability.INHERIT
                : "unchanged",
              readRoleIds: [],
              editRoleIds: [],
              adminRoleIds: [],
              cascaded: true,
            },
            createdById: authentication.session.user.id,
          }))
        : []),
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
        skippedCount > 0 && anyCascade
          ? `Erfolgreich gespeichert. ${skippedCount} Unterseite(n) ohne Verwalten-Berechtigung wurden übersprungen.`
          : t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      visibility: formData.get("visibility"),
      editability: formData.get("editability"),
      adminability: formData.get("adminability"),
      readRoles: formData.getAll("readRole[]"),
      editRoles: formData.getAll("editRole[]"),
      adminRoles: formData.getAll("adminRole[]"),
      cascadeVisibility: formData.get("cascadeVisibility") ?? undefined,
      cascadeEditability: formData.get("cascadeEditability") ?? undefined,
      cascadeAdminability: formData.get("cascadeAdminability") ?? undefined,
      ownerMode: formData.get("ownerMode"),
      newOwnerId: formData.get("newOwnerId") || undefined,
      cascadeOwner: formData.get("cascadeOwner") ?? undefined,
    }),
  },
);
