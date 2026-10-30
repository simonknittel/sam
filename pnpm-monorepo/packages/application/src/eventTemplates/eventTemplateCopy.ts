import type {
  EventDiscordPublishTarget,
  EventVisibility,
} from "@sam-monorepo/database/client";
import {
  buildBriefingRootPageSeed,
  toTemplateContainer,
  type EventContainerColumns,
} from "@sam-monorepo/domain";
import type { ApplicationContext } from "../context.js";
import {
  copyUploadInTransaction,
  type CopyableUpload,
} from "../uploads/uploadCopy.js";
import {
  copyContainerContent,
  loadContainerCopySource,
  LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS,
} from "./containerContentCopy.js";

/** The fields of the new template */
export interface EventTemplateCopyFields {
  readonly name: string;
  readonly description: string | null;
  readonly visibility: EventVisibility;
  readonly visibilityRoleIds: readonly string[];
  readonly participationEnabled: boolean;
  readonly discordPublishTarget: EventDiscordPublishTarget | null;
  readonly discordPublishChannelId: string | null;
  readonly discordPublishLocation: string | null;
}

export interface EventTemplateCopySource {
  /** The event or the template whose lineup, briefing and cover the copy takes */
  readonly columns: EventContainerColumns;
  /** Selected with `COPYABLE_UPLOAD_SELECT` */
  readonly coverImage: CopyableUpload | null;
  /**
   * True when the copy of a source without a briefing root page gets the
   * empty root page, like a new template. False copies the pages of the
   * source without a root (see the known defect of the duplicate).
   */
  readonly seedsMissingBriefingRoot: boolean;
}

export interface EventTemplateCopyResult {
  readonly template: { readonly id: string; readonly name: string };
  readonly positionCount: number;
  readonly pageCount: number;
}

/**
 * Creates a personal template of the citizen from an event or from a
 * template: the fields, the cover, the lineup and the briefing carry over.
 * No permission check: the caller checks the source.
 */
export const createEventTemplateCopy = async (
  context: ApplicationContext,
  citizenId: string,
  source: EventTemplateCopySource,
  fields: EventTemplateCopyFields,
): Promise<EventTemplateCopyResult> => {
  const content = await loadContainerCopySource(context, source.columns);

  /**
   * Keyed on the root page, like the creation of an event: an event
   * predating the briefing feature has pages to copy but no root, and a
   * template without a root page has no briefing and no way back to one.
   */
  const copiesBriefing =
    !source.seedsMissingBriefingRoot || content.rootPage !== null;

  return context.prisma.$transaction(
    async (transaction) => {
      /**
       * The template gets its own cover object, so editing or deleting one
       * never touches the other.
       */
      const coverImage = source.coverImage
        ? await copyUploadInTransaction(
            context,
            transaction,
            source.coverImage,
            citizenId,
          )
        : null;

      const template = await transaction.eventTemplate.create({
        data: {
          name: fields.name,
          description: fields.description,
          coverImageId: coverImage?.id ?? null,
          visibility: fields.visibility,
          visibilityRoles: {
            create: fields.visibilityRoleIds.map((roleId) => ({ roleId })),
          },
          participationEnabled: fields.participationEnabled,
          discordPublishTarget: fields.discordPublishTarget,
          discordPublishChannelId: fields.discordPublishChannelId,
          discordPublishLocation: fields.discordPublishLocation,
          createdById: citizenId,
          updatedById: citizenId,
          ownedById: citizenId,
          ...(copiesBriefing
            ? {}
            : { wikiPages: { create: buildBriefingRootPageSeed(citizenId) } }),
        },
        select: { id: true, name: true },
      });

      const { positionCount, pageCount } = await copyContainerContent(
        transaction,
        copiesBriefing ? content : { ...content, briefingPages: [] },
        toTemplateContainer(template.id),
        citizenId,
      );

      return { template, positionCount, pageCount };
    },
    { timeout: LONG_TRANSACTION_TIMEOUT_IN_MILLISECONDS },
  );
};
