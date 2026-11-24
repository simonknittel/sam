import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { normalizeWikiContent } from "./wikiContentNormalization.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { requireAdministrableWikiPage } from "./wikiPageAdminGuard.js";
import { replaceWikiPageContentWithSafetySnapshot } from "./wikiPageSafetySnapshot.js";

export const restoreWikiPageSnapshotInputSchema = z.object({
  snapshot_id: idSchema,
});

export type RestoreWikiPageSnapshotInput = z.output<
  typeof restoreWikiPageSnapshotInputSchema
>;

export interface RestoreWikiPageSnapshotOptions {
  readonly safetySnapshotName: string;
}

export interface RestoreWikiPageSnapshotOutput {
  readonly page_id: string;
  readonly snapshot_id: string;
}

/**
 * The retention of the automatic snapshots can remove the snapshot before the
 * restore
 */
export const restoreWikiPageSnapshot = (
  context: ApplicationContext,
  actor: Actor,
  input: RestoreWikiPageSnapshotInput,
  options: RestoreWikiPageSnapshotOptions,
): Promise<RestoreWikiPageSnapshotOutput> =>
  withSpan(context, "restoreWikiPageSnapshot", async () => {
    const snapshot = await context.prisma.wikiPageSnapshot.findUnique({
      where: { id: input.snapshot_id },
      select: { id: true, pageId: true, content: true },
    });
    if (!snapshot) throw new NotFoundError(WikiErrorMessage.SnapshotNotFound);

    const { page } = await requireAdministrableWikiPage(
      context,
      actor,
      snapshot.pageId,
    );

    let content: object;
    try {
      content = normalizeWikiContent(snapshot.content);
    } catch (error) {
      throw new ValidationError(WikiErrorMessage.SnapshotIncompatible, {
        cause: error,
      });
    }

    await replaceWikiPageContentWithSafetySnapshot(context, {
      pageId: page.id,
      content,
      updatedByEntityId: actor.citizen?.id ?? null,
      safetySnapshotName: options.safetySnapshotName,
      failureMessage: WikiErrorMessage.SnapshotRestoreFailed,
    });

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_SNAPSHOT_RESTORED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          snapshotId: snapshot.id,
        },
        createdById: actor.userId,
      },
    ]);

    return { page_id: page.id, snapshot_id: snapshot.id };
  });
