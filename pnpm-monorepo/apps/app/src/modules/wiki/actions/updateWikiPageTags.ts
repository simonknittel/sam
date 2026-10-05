"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getWikiPageContainer } from "@/modules/events/utils/eventContainer";
import { refresh } from "next/cache";
import * as z from "zod";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
} from "../queries/getWikiPageScopedContext";
import { findOrCreateWikiTags } from "../utils/findOrCreateWikiTags";

const tagNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replaceAll(/\s+/g, " "))
  .pipe(z.string().min(1).max(50));

const schema = z.object({
  id: z.cuid2(),
  tagNames: z.array(tagNameSchema).max(20),
});

/**
 * Replaces the tags of a page with the submitted set. The tags are found or
 * created in the scope of the page (see findOrCreateWikiTags), so a name
 * that differs only in letter case uses the existing tag. A tag whose last
 * assignment is removed here is deleted right away to keep the autocomplete
 * clean.
 */
export const updateWikiPageTags = createAuthenticatedAction(
  "updateWikiPageTags",
  schema,
  async (formData, authentication, data, t) => {
    const scoped = await getWikiPageScopedContext(data.id);
    const page = scoped?.context.pagesById.get(data.id);
    if (!scoped || !page || page.deletedAt) {
      /**
       * A different user or tab deleted the page before, and the page must
       * show it. A context that the viewer cannot hold gets the same answer
       * (see getWikiPageScopedContext).
       */
      refresh();

      return { error: t("Common.badRequest"), requestPayload: formData };
    }
    const context = scoped.context;
    /**
     * The freeze would already deny through canEdit (the resolver strips it
     * on frozen events); the explicit check only yields the events' usual
     * error message instead of a generic forbidden.
     */
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };
    if (!context.permissions.get(page.id)?.canEdit)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const citizenId = authentication.session.entity?.id ?? null;

    const changes = await prisma.$transaction(async (transaction) => {
      const requestedTags = await findOrCreateWikiTags(
        transaction,
        data.tagNames,
        getWikiPageContainer(page),
        citizenId,
      );
      const currentAssignments = await transaction.wikiPageTag.findMany({
        where: { pageId: page.id },
        select: { id: true, tagId: true, tag: { select: { name: true } } },
      });

      const requestedTagIds = new Set(requestedTags.map((tag) => tag.id));
      const currentTagIds = new Set(
        currentAssignments.map((assignment) => assignment.tagId),
      );
      const removedAssignments = currentAssignments.filter(
        (assignment) => !requestedTagIds.has(assignment.tagId),
      );
      const addedTags = requestedTags.filter(
        (tag) => !currentTagIds.has(tag.id),
      );
      if (removedAssignments.length === 0 && addedTags.length === 0)
        return null;

      await transaction.wikiPageTag.deleteMany({
        where: {
          id: { in: removedAssignments.map((assignment) => assignment.id) },
        },
      });
      await transaction.wikiPageTag.createMany({
        data: addedTags.map((tag) => ({
          pageId: page.id,
          tagId: tag.id,
          createdById: citizenId,
        })),
        skipDuplicates: true,
      });
      /**
       * Runs after the assignment delete above, so tags whose last usage was
       * just removed are swept immediately.
       */
      await transaction.wikiTag.deleteMany({
        where: {
          id: { in: removedAssignments.map((assignment) => assignment.tagId) },
          pages: { none: {} },
        },
      });
      /**
       * Denormalized copy of the tag names for the full-text search (see
       * WikiPage.tagsText).
       */
      await transaction.wikiPage.update({
        where: { id: page.id },
        data: {
          tagsText: requestedTags
            .map((tag) => tag.name)
            .toSorted((first, second) => first.localeCompare(second))
            .join(" "),
          updatedById: citizenId,
        },
      });

      return { addedTags, removedAssignments };
    });

    /**
     * Also without changes: a different user or tab can have set the same
     * tags before
     */
    refresh();

    if (!changes) return { success: t("Common.successfullySaved") };

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_TAGS_UPDATED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          addedTagNames: changes.addedTags.map((tag) => tag.name),
          removedTagNames: changes.removedAssignments.map(
            (assignment) => assignment.tag.name,
          ),
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      tagNames: formData.getAll("tagName[]"),
    }),
  },
);
