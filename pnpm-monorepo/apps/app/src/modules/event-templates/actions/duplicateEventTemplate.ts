"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { clonePositions } from "@/modules/events/utils/clonePositions";
import {
  eventContainerColumns,
  toTemplateContainer,
} from "@/modules/events/utils/eventContainer";
import { buildPositionTree } from "@/modules/events/utils/positionTree";
import { copyUpload } from "@/modules/uploads/utils/copyUpload";
import { getEventWikiContext } from "@/modules/wiki/queries/getEventWikiContext";
import { copyBriefingTree } from "@/modules/wiki/utils/copyBriefingTree";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getEventTemplateById } from "../queries/getEventTemplateById";
import {
  EVENT_TEMPLATE_NAME_MAX_LENGTH,
  EVENT_TEMPLATES_PATH,
  getEventTemplatePath,
} from "../utils/eventTemplateConstraints";

/** The briefing copy dominates the runtime — same bound the wiki copy uses */
const TRANSACTION_TIMEOUT_MS = 30_000;

const schema = z.object({
  sourceTemplateId: z.cuid2(),
  name: z.string().trim().min(1).max(EVENT_TEMPLATE_NAME_MAX_LENGTH),
});

/**
 * Copies a template the viewer may read into a personal template of their
 * own: fields, visibility prefill, cover, lineup and briefing carry over,
 * the role shares deliberately do not. Handing a copy out again is the
 * duplicator's decision, not an inherited one.
 */
export const duplicateEventTemplate = createAuthenticatedAction(
  "duplicateEventTemplate",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request. Reading a template is enough to duplicate it —
     * the copy is a new personal template, not a change to the source.
     */
    if (!authentication.session.entity)
      return { error: t("Common.forbidden"), requestPayload: formData };
    const citizenId = authentication.session.entity.id;

    const source = await getEventTemplateById(data.sourceTemplateId);
    if (source?.template.deletedAt !== null)
      return { error: "Vorlage nicht gefunden", requestPayload: formData };

    const sourceContainer = toTemplateContainer(source.template.id);

    const [sourcePositions, sourceBriefing, sourceCover] = await Promise.all([
      prisma.eventPosition.findMany({
        where: eventContainerColumns(sourceContainer),
        orderBy: { order: "asc" },
        select: {
          id: true,
          parentPositionId: true,
          name: true,
          description: true,
          fontSize: true,
          backgroundColor: true,
          textColor: true,
          requiredRoles: { select: { id: true } },
          requiredVariants: {
            select: { variantId: true, order: true },
            orderBy: { order: "asc" },
          },
        },
      }),
      getEventWikiContext(sourceContainer),
      source.template.coverImageId
        ? prisma.upload.findUnique({
            where: { id: source.template.coverImageId },
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              size: true,
              width: true,
              height: true,
            },
          })
        : Promise.resolve(null),
    ]);

    const { duplicate, positionCount, pageCount } = await prisma.$transaction(
      async (transaction) => {
        /**
         * The copy gets its own cover object, so editing or deleting one
         * never touches the other.
         */
        const coverImage = sourceCover
          ? await copyUpload(
              transaction,
              sourceCover,
              authentication.session.user.id,
            )
          : null;

        const created = await transaction.eventTemplate.create({
          data: {
            name: data.name,
            description: source.template.description,
            coverImageId: coverImage?.id ?? null,
            visibility: source.template.visibility,
            visibilityRoles: {
              create: source.template.visibilityRoles.map(({ roleId }) => ({
                roleId,
              })),
            },
            discordPublishTarget: source.template.discordPublishTarget,
            discordPublishChannelId: source.template.discordPublishChannelId,
            discordPublishLocation: source.template.discordPublishLocation,
            createdById: citizenId,
            updatedById: citizenId,
            ownedById: citizenId,
          },
          select: { id: true, name: true },
        });

        const targetContainer = toTemplateContainer(created.id);

        const positionIdBySourceId = await clonePositions(
          transaction,
          buildPositionTree(sourcePositions),
          {
            container: targetContainer,
            parentPositionId: null,
            startOrder: 0,
          },
        );

        const briefing = sourceBriefing
          ? await copyBriefingTree(transaction, {
              sourcePages: sourceBriefing.pages,
              targetContainer,
              createdByEntityId: citizenId,
              positionIdBySourceId,
            })
          : { pageCount: 0 };

        return {
          duplicate: created,
          positionCount: positionIdBySourceId.size,
          pageCount: briefing.pageCount,
        };
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );

    await createAuditEvents([
      {
        type: AuditEventType.EVENT_TEMPLATE_DUPLICATED,
        data: {
          templateId: duplicate.id,
          name: duplicate.name,
          sourceTemplateId: source.template.id,
          sourceName: source.template.name,
          positionCount,
          pageCount,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath(EVENT_TEMPLATES_PATH);

    redirect(getEventTemplatePath(duplicate.id));
  },
);
