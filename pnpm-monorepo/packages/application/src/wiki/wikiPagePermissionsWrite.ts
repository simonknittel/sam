import {
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageUploadability,
  WikiPageVisibility,
} from "@sam-monorepo/database/client";
import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import { rethrowRecordNotFound } from "../errors.js";
import type { UpdateWikiPagePermissionsInput } from "./updateWikiPagePermissions.js";
import type { WikiContextPage } from "./wikiContext.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import type { WikiPageRolePrune } from "./wikiPageRolePrunes.js";

/** The audit value of a tier that a cascade does not change */
const UNCHANGED_TIER = "unchanged";

export interface WikiPagePermissionsWrite {
  readonly input: UpdateWikiPagePermissionsInput;
  readonly pageId: string;
  /** The pages of the global wiki before the write, for the previous owners */
  readonly pagesById: ReadonlyMap<string, WikiContextPage>;
  readonly readRoleIds: string[];
  readonly roleAccess: {
    readonly pageId: string;
    readonly roleId: string;
    readonly type: WikiPageAccessType;
  }[];
  readonly newOwnerId: string | null;
  /** The descendants that are not in the trash */
  readonly descendantIds: string[];
  readonly ownerCascadeIds: string[];
  readonly prunes: WikiPageRolePrune[];
}

export const runWikiPagePermissionsBatch = async (
  { prisma }: Pick<ApplicationContext, "prisma">,
  {
    input,
    pageId,
    roleAccess,
    newOwnerId,
    descendantIds,
    ownerCascadeIds,
    prunes,
  }: WikiPagePermissionsWrite,
  updatedById: string | null,
): Promise<void> => {
  const hasDescendants = descendantIds.length > 0;

  await rethrowRecordNotFound(
    () =>
      prisma.$transaction([
        prisma.wikiPage.update({
          where: { id: pageId },
          data: {
            visibility: input.visibility,
            editability: input.editability,
            imageUploadability: input.image_uploadability,
            attachmentUploadability: input.attachment_uploadability,
            ownerId: newOwnerId,
            updatedById,
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
        prisma.wikiPageRoleAccess.deleteMany({ where: { pageId } }),
        prisma.wikiPageRoleAccess.createMany({ data: roleAccess }),
        ...(hasDescendants && input.cascade_visibility
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
        ...(hasDescendants && input.cascade_editability
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
        /** The manage tier has no column to reset, only the manager roles */
        ...(hasDescendants && input.cascade_admin_roles
          ? [
              prisma.wikiPageRoleAccess.deleteMany({
                where: {
                  pageId: { in: descendantIds },
                  type: WikiPageAccessType.ADMIN,
                },
              }),
            ]
          : []),
        /** The upload tiers have no role lists to remove */
        ...(hasDescendants && input.cascade_image_uploadability
          ? [
              prisma.wikiPage.updateMany({
                where: { id: { in: descendantIds } },
                data: { imageUploadability: WikiPageUploadability.INHERIT },
              }),
            ]
          : []),
        ...(hasDescendants && input.cascade_attachment_uploadability
          ? [
              prisma.wikiPage.updateMany({
                where: { id: { in: descendantIds } },
                data: {
                  attachmentUploadability: WikiPageUploadability.INHERIT,
                },
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
      ]),
    WikiErrorMessage.PageNotFound,
  );
};

export const buildWikiPagePermissionsAuditEvents = (
  {
    input,
    pageId,
    pagesById,
    readRoleIds,
    newOwnerId,
    descendantIds,
    ownerCascadeIds,
    prunes,
  }: WikiPagePermissionsWrite,
  createdById: string,
): AuditEventInput[] => {
  const hasCascade =
    input.cascade_visibility ||
    input.cascade_editability ||
    input.cascade_admin_roles ||
    input.cascade_image_uploadability ||
    input.cascade_attachment_uploadability;
  const previousOwnerId = pagesById.get(pageId)?.ownerId ?? null;

  return [
    {
      type: AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED,
      data: {
        pageId,
        visibility: input.visibility,
        editability: input.editability,
        imageUploadability: input.image_uploadability,
        attachmentUploadability: input.attachment_uploadability,
        readRoleIds,
        /**
         * The system log keeps these two lists as the form sent them, with
         * duplicates
         */
        editRoleIds: input.edit_role_ids,
        adminRoleIds: input.admin_role_ids,
        cascaded: false,
      },
      createdById,
    },
    ...(hasCascade
      ? descendantIds.map((id): AuditEventInput => ({
          type: AuditEventType.WIKI_PAGE_PERMISSIONS_UPDATED,
          data: {
            pageId: id,
            visibility: input.cascade_visibility
              ? WikiPageVisibility.INHERIT
              : UNCHANGED_TIER,
            editability: input.cascade_editability
              ? WikiPageEditability.INHERIT
              : UNCHANGED_TIER,
            imageUploadability: input.cascade_image_uploadability
              ? WikiPageUploadability.INHERIT
              : UNCHANGED_TIER,
            attachmentUploadability: input.cascade_attachment_uploadability
              ? WikiPageUploadability.INHERIT
              : UNCHANGED_TIER,
            readRoleIds: [],
            editRoleIds: [],
            adminRoleIds: [],
            cascaded: true,
          },
          createdById,
        }))
      : []),
    ...prunes.map((prune): AuditEventInput => ({
      type: AuditEventType.WIKI_PAGE_ROLE_ACCESS_PRUNED,
      data: {
        pageId: prune.pageId,
        removedRoleIds: prune.roleIds,
        trigger: "PERMISSIONS_UPDATED",
      },
      createdById,
    })),
    ...(newOwnerId !== previousOwnerId
      ? [
          {
            type: AuditEventType.WIKI_PAGE_OWNERSHIP_TRANSFERRED,
            data: { pageId, previousOwnerId, newOwnerId, cascaded: false },
            createdById,
          } satisfies AuditEventInput,
        ]
      : []),
    ...ownerCascadeIds.map((id): AuditEventInput => ({
      type: AuditEventType.WIKI_PAGE_OWNERSHIP_TRANSFERRED,
      data: {
        pageId: id,
        previousOwnerId: pagesById.get(id)?.ownerId ?? null,
        newOwnerId: null,
        cascaded: true,
      },
      createdById,
    })),
  ];
};
