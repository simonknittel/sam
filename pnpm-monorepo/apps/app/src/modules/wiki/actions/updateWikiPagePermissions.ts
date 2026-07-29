"use server";

import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import {
  WikiPageAccessType,
  WikiPageAdminability,
  WikiPageEditability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
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

export const updateWikiPagePermissions = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    const authentication = await requireAuthenticationAction(
      "updateWikiPagePermissions",
    );

    const result = schema.safeParse({
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
    });
    if (!result.success)
      return {
        error: t("Common.badRequest"),
        errorDetails: result.error,
        requestPayload: formData,
      };

    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(result.data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Top-level pages must not inherit — there is nothing to inherit from.
     */
    if (
      !page.parentId &&
      (result.data.visibility === WikiPageVisibility.INHERIT ||
        result.data.editability === WikiPageEditability.INHERIT ||
        result.data.adminability === WikiPageAdminability.INHERIT)
    )
      return { error: t("Common.badRequest"), requestPayload: formData };

    /**
     * Owner: "inherit" resolves via the ancestor chain (child pages only —
     * a top-level page without an explicit owner would only be manageable
     * via wiki;manage), "explicit" requires an existing citizen.
     */
    const newOwnerId =
      result.data.ownerMode === "inherit"
        ? null
        : (result.data.newOwnerId ?? null);
    if (result.data.ownerMode === "explicit") {
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
      ...[...new Set(result.data.readRoles)].map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.READ,
      })),
      ...[...new Set(result.data.editRoles)].map((roleId) => ({
        pageId: page.id,
        roleId,
        type: WikiPageAccessType.EDIT,
      })),
      ...[...new Set(result.data.adminRoles)].map((roleId) => ({
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
      result.data.cascadeVisibility ||
      result.data.cascadeEditability ||
      result.data.cascadeAdminability;

    /**
     * The owner cascade resets descendants to inherited ownership so they
     * follow this page's owner — only where the actor has admin.
     */
    const ownerCascadeIds = result.data.cascadeOwner
      ? cascadableIds.filter(
          (id) => context.pagesById.get(id)?.ownerId !== null,
        )
      : [];

    await prisma.$transaction([
      prisma.wikiPage.update({
        where: { id: page.id },
        data: {
          visibility: result.data.visibility,
          editability: result.data.editability,
          adminability: result.data.adminability,
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
      ...(cascadableIds.length > 0 && result.data.cascadeVisibility
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
      ...(cascadableIds.length > 0 && result.data.cascadeEditability
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
      ...(cascadableIds.length > 0 && result.data.cascadeAdminability
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
          visibility: result.data.visibility,
          editability: result.data.editability,
          adminability: result.data.adminability,
          readRoleIds: result.data.readRoles,
          editRoleIds: result.data.editRoles,
          adminRoleIds: result.data.adminRoles,
          cascaded: false,
        },
        createdById: authentication.session.user.id,
      },
      ...(anyCascade
        ? cascadableIds.map((id) => ({
            type: AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED as const,
            data: {
              pageId: id,
              visibility: result.data.cascadeVisibility
                ? WikiPageVisibility.INHERIT
                : "unchanged",
              editability: result.data.cascadeEditability
                ? WikiPageEditability.INHERIT
                : "unchanged",
              adminability: result.data.cascadeAdminability
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
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
