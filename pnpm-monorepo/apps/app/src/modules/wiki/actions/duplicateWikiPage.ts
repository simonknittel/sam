"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  WikiPageAdminability,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
  type WikiPageAccessType,
} from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { collectVisibleWikiSubtree } from "../utils/collectVisibleWikiSubtree";
import { getAccessibleWikiPage } from "../utils/getAccessibleWikiPage";
import { slugifyWikiPageTitle } from "../utils/slugifyWikiPageTitle";

const schema = z.object({
  id: z.cuid2(),
  title: z.string().trim().min(1).max(128),
  /** Empty string or absent creates a top-level page */
  parentId: z
    .union([z.cuid2(), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  mirrorChildren: z
    .literal("1")
    .optional()
    .transform((value) => value === "1"),
  mirrorPermissions: z
    .literal("1")
    .optional()
    .transform((value) => value === "1"),
});

const TRANSACTION_TIMEOUT_MS = 30_000;

interface CopiedPermissions {
  visibility: WikiPageVisibility;
  editability: WikiPageEditability;
  adminability: WikiPageAdminability;
  imageUploadability: WikiPageUploadability;
  attachmentUploadability: WikiPageUploadability;
  ownerId: string | null;
  roleAccess: readonly { roleId: string; type: WikiPageAccessType }[];
}

/**
 * Creates a copy of a page at the chosen location, optionally including the
 * subtree the viewer can see (descendants of unreadable pages are hoisted
 * like in the sidebar; unreadable pages are never copied). Content
 * (including the Yjs document) is copied from the last persisted state —
 * unsaved changes of a live collab session are not included. Images and
 * attachments keep referencing the source pages' uploads; each copy is
 * linked to its source page's uploads (Upload.wikiPages) so attachment
 * downloads are permission-checked against the copy itself.
 *
 * With mirrored permissions the copies keep their explicit tiers, role
 * lists and owners, except that the duplicator becomes the explicit owner
 * of the copied root — this guarantees they keep access to their copy even
 * when the mirrored settings are restrictive. Without mirroring, the copies
 * get the same defaults as newly created pages.
 */
export const duplicateWikiPage = createAuthenticatedAction(
  "duplicateWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    if (!context || !authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };
    const entity = authentication.session.entity;

    const source = getAccessibleWikiPage(context, data.id, "read");
    if (!source)
      return { error: t("Common.notFound"), requestPayload: formData };

    if (data.parentId) {
      const parent = context.pagesById.get(data.parentId);
      if (!parent || parent.deletedAt)
        return { error: t("Common.notFound"), requestPayload: formData };
      if (!context.permissions.get(parent.id)?.canEdit)
        return { error: t("Common.forbidden"), requestPayload: formData };
    } else {
      if (!(await authentication.authorize("wiki", "create")))
        return { error: t("Common.forbidden"), requestPayload: formData };
    }

    const subtree = data.mirrorChildren
      ? collectVisibleWikiSubtree(
          context.pages,
          source.id,
          (id) => context.permissions.get(id)?.canRead === true,
        )
      : [];

    /**
     * Along with the content, each copy takes over its source page's upload
     * links so attachment downloads on the copy are permission-checked
     * against the copy.
     */
    const contentById = new Map(
      (
        await prisma.wikiPage.findMany({
          where: {
            id: { in: [source.id, ...subtree.map((entry) => entry.page.id)] },
          },
          select: {
            id: true,
            content: true,
            searchText: true,
            ydoc: true,
            attachments: { select: { id: true } },
          },
        })
      ).map((row) => [row.id, row]),
    );

    const siblings = context.pages.filter(
      (page) => page.parentId === (data.parentId ?? null),
    );
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((page) => page.sortOrder)) + 1
        : 0;

    let rootPermissions: CopiedPermissions;
    if (data.mirrorPermissions) {
      /**
       * Mirrored INHERIT tiers stay INHERIT at a child location (they then
       * inherit from the new parent chain) but fall back to the top-level
       * creation defaults when the copy becomes a root page, where INHERIT
       * has no referent.
       */
      const topLevel = !data.parentId;
      rootPermissions = {
        visibility:
          topLevel && source.visibility === WikiPageVisibility.INHERIT
            ? WikiPageVisibility.RESTRICTED
            : source.visibility,
        editability:
          topLevel && source.editability === WikiPageEditability.INHERIT
            ? WikiPageEditability.RESTRICTED
            : source.editability,
        adminability:
          topLevel && source.adminability === WikiPageAdminability.INHERIT
            ? WikiPageAdminability.RESTRICTED
            : source.adminability,
        imageUploadability:
          topLevel &&
          source.imageUploadability === WikiPageUploadability.INHERIT
            ? WikiPageUploadability.RESTRICTED
            : source.imageUploadability,
        attachmentUploadability:
          topLevel &&
          source.attachmentUploadability === WikiPageUploadability.INHERIT
            ? WikiPageUploadability.RESTRICTED
            : source.attachmentUploadability,
        ownerId: entity.id,
        roleAccess: source.roleAccess,
      };
    } else {
      /**
       * Defaults of a newly created page: top-level pages are "private"
       * (RESTRICTED without roles) and owned by their creator; child pages
       * inherit everything including the owner.
       */
      rootPermissions = {
        visibility: data.parentId
          ? WikiPageVisibility.INHERIT
          : WikiPageVisibility.RESTRICTED,
        editability: data.parentId
          ? WikiPageEditability.INHERIT
          : WikiPageEditability.RESTRICTED,
        adminability: data.parentId
          ? WikiPageAdminability.INHERIT
          : WikiPageAdminability.RESTRICTED,
        imageUploadability: data.parentId
          ? WikiPageUploadability.INHERIT
          : WikiPageUploadability.RESTRICTED,
        attachmentUploadability: data.parentId
          ? WikiPageUploadability.INHERIT
          : WikiPageUploadability.RESTRICTED,
        ownerId: data.parentId ? null : entity.id,
        roleAccess: [],
      };
    }

    const { root, duplicatedPageIds } = await prisma.$transaction(
      async (tx) => {
        const sourceContent = contentById.get(source.id);
        const root = await tx.wikiPage.create({
          data: {
            title: data.title,
            slug: slugifyWikiPageTitle(data.title),
            parentId: data.parentId ?? null,
            sortOrder,
            iconId: source.iconId,
            content: sourceContent?.content ?? undefined,
            searchText: sourceContent?.searchText ?? "",
            ydoc: sourceContent?.ydoc ?? undefined,
            attachments:
              sourceContent && sourceContent.attachments.length > 0
                ? {
                    connect: sourceContent.attachments.map(({ id }) => ({
                      id,
                    })),
                  }
                : undefined,
            visibility: rootPermissions.visibility,
            editability: rootPermissions.editability,
            adminability: rootPermissions.adminability,
            imageUploadability: rootPermissions.imageUploadability,
            attachmentUploadability: rootPermissions.attachmentUploadability,
            ownerId: rootPermissions.ownerId,
            roleAccess:
              rootPermissions.roleAccess.length > 0
                ? {
                    createMany: {
                      data: rootPermissions.roleAccess.map((access) => ({
                        roleId: access.roleId,
                        type: access.type,
                      })),
                    },
                  }
                : undefined,
            createdById: entity.id,
          },
          select: { id: true, slug: true },
        });

        const newIdByOldId = new Map([[source.id, root.id]]);
        const duplicatedPageIds = [root.id];

        for (const { page, visibleParentId } of subtree) {
          const content = contentById.get(page.id);
          const copy = await tx.wikiPage.create({
            data: {
              title: page.title,
              slug: page.slug,
              parentId: newIdByOldId.get(visibleParentId)!,
              sortOrder: page.sortOrder,
              iconId: page.iconId,
              content: content?.content ?? undefined,
              searchText: content?.searchText ?? "",
              ydoc: content?.ydoc ?? undefined,
              attachments:
                content && content.attachments.length > 0
                  ? {
                      connect: content.attachments.map(({ id }) => ({ id })),
                    }
                  : undefined,
              visibility: data.mirrorPermissions
                ? page.visibility
                : WikiPageVisibility.INHERIT,
              editability: data.mirrorPermissions
                ? page.editability
                : WikiPageEditability.INHERIT,
              adminability: data.mirrorPermissions
                ? page.adminability
                : WikiPageAdminability.INHERIT,
              imageUploadability: data.mirrorPermissions
                ? page.imageUploadability
                : WikiPageUploadability.INHERIT,
              attachmentUploadability: data.mirrorPermissions
                ? page.attachmentUploadability
                : WikiPageUploadability.INHERIT,
              ownerId: data.mirrorPermissions ? page.ownerId : null,
              roleAccess:
                data.mirrorPermissions && page.roleAccess.length > 0
                  ? {
                      createMany: {
                        data: page.roleAccess.map((access) => ({
                          roleId: access.roleId,
                          type: access.type,
                        })),
                      },
                    }
                  : undefined,
              createdById: entity.id,
            },
            select: { id: true },
          });
          newIdByOldId.set(page.id, copy.id);
          duplicatedPageIds.push(copy.id);
        }

        return { root, duplicatedPageIds };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_DUPLICATED,
        data: {
          pageId: root.id,
          sourcePageId: source.id,
          title: data.title,
          parentId: data.parentId ?? null,
          duplicatedPageIds,
          mirroredChildren: data.mirrorChildren,
          mirroredPermissions: data.mirrorPermissions,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/wiki", "layout");
    redirect(`/app/wiki/${root.id}/${root.slug}`);
  },
);
