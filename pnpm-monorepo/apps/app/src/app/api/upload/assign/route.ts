import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { probeUploadImageDimensions } from "@/modules/common/utils/probeUploadImageDimensions";
import {
  getDiscordCoverImageWarning,
  getDiscordSyncWarning,
  syncDiscordEventPublication,
} from "@/modules/events/utils/discordPublishing";
import { isAllowedToManageEvent } from "@/modules/events/utils/isAllowedToManageEvent";
import { isEventUpdatable } from "@/modules/events/utils/isEventUpdatable";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
} from "@/modules/wiki/queries/getWikiPageScopedContext";
import { EventSource } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("resourceType", [
  z.object({
    resourceType: z.literal("manufacturer"),
    resourceId: z.cuid(),
    resourceAttribute: z.literal("imageId"),
    imageId: z.cuid(),
  }),
  /**
   * Sets or removes (`imageId: null`) an app event's cover image.
   * `resourceId` is the event id.
   */
  z.object({
    resourceType: z.literal("event"),
    resourceAttribute: z.literal("coverImageId"),
    resourceId: z.cuid(),
    imageId: z.cuid().nullable(),
  }),
  z.object({
    resourceType: z.literal("role"),
    resourceAttribute: z.enum(["iconId", "thumbnailId"]),
    resourceId: z.cuid(),
    imageId: z.cuid(),
  }),
  z.discriminatedUnion("resourceAttribute", [
    /**
     * Links an upload (image or file attachment) to the wiki page it is
     * embedded in, so attachment downloads can be permission-checked against
     * the page's visibility. `resourceId` is the page id.
     */
    z.object({
      resourceType: z.literal("wikiPage"),
      resourceAttribute: z.literal("wikiPages"),
      resourceId: z.cuid2(),
      uploadId: z.cuid(),
    }),
    /**
     * Sets or removes (`imageId: null`) a wiki page's icon. `resourceId` is
     * the page id.
     */
    z.object({
      resourceType: z.literal("wikiPage"),
      resourceAttribute: z.literal("iconId"),
      resourceId: z.cuid2(),
      imageId: z.cuid().nullable(),
    }),
  ]),
]);

export async function PATCH(request: Request) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/upload/assign",
      "PATCH",
    );

    const body: unknown = await request.json();
    const data = bodySchema.parse(body);

    if (
      data.resourceType === "wikiPage" &&
      data.resourceAttribute === "iconId"
    ) {
      /**
       * Authorize: admin permission on the page — icon changes are
       * manage-gated like the title, independent of the per-page upload
       * settings. When assigning, the upload must be the current user's own
       * image. A replaced or removed icon's upload is left behind for the
       * nightly cleanup.
       */
      const [scoped, upload] = await Promise.all([
        getWikiPageScopedContext(data.resourceId),
        data.imageId
          ? prisma.upload.findUnique({
              where: { id: data.imageId },
              select: { id: true, createdById: true, mimeType: true },
            })
          : Promise.resolve(null),
      ]);
      if (!scoped)
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });

      const page = scoped.context.pagesById.get(data.resourceId);
      if (!page || page.deletedAt || (data.imageId !== null && !upload))
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      if (
        !scoped.context.permissions.get(page.id)?.canAdmin ||
        isWikiScopeFrozen(scoped)
      )
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (upload) {
        if (upload.createdById !== authentication.session.user.id)
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (!upload.mimeType.startsWith("image/"))
          return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      }

      await prisma.wikiPage.update({
        where: { id: page.id },
        data: {
          iconId: data.imageId,
          updatedById: authentication.session.entity?.id ?? null,
        },
      });

      await createAuditEvents([
        {
          type: AuditEventType.WIKI_PAGE_ICON_UPDATED,
          data: {
            pageId: page.id,
            eventId: page.eventId ?? undefined,
            iconId: data.imageId,
          },
          createdById: authentication.session.user.id,
        },
      ]);

      if (data.imageId) probeUploadImageDimensions(data.imageId);

      return NextResponse.json({});
    }

    if (data.resourceType === "event") {
      /**
       * Authorize: only app events carry a cover, changing it is
       * manage-gated like the other event settings and frozen once the
       * event is over. When assigning, the upload must be the current
       * user's own image. A replaced or removed cover's upload is left
       * behind for the nightly cleanup.
       */
      const [event, upload] = await Promise.all([
        prisma.event.findUnique({
          where: {
            id: data.resourceId,
            source: EventSource.APP,
            deletedAt: null,
          },
          include: { managers: true },
        }),
        data.imageId
          ? prisma.upload.findUnique({
              where: { id: data.imageId },
              select: { id: true, createdById: true, mimeType: true },
            })
          : Promise.resolve(null),
      ]);
      if (!event || (data.imageId !== null && !upload))
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      if (!isEventUpdatable(event) || !(await isAllowedToManageEvent(event)))
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (upload) {
        if (upload.createdById !== authentication.session.user.id)
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        if (!upload.mimeType.startsWith("image/"))
          return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      }

      await prisma.event.update({
        where: { id: event.id },
        data: { coverImageId: data.imageId },
      });

      await createAuditEvents([
        {
          type: AuditEventType.EVENT_UPDATED_IN_APP,
          data: {
            eventId: event.id,
            changedFields: ["coverImage"],
          },
          createdById: authentication.session.user.id,
        },
      ]);

      if (data.imageId) probeUploadImageDimensions(data.imageId);

      /**
       * A published event carries its cover on Discord too. The upload is
       * already assigned above, so a Discord problem only travels back as a
       * warning the uploader sees.
       */
      const discordResult = await syncDiscordEventPublication(event.id);
      const discordWarning =
        getDiscordSyncWarning(discordResult) ??
        getDiscordCoverImageWarning(discordResult);

      revalidatePath("/app/events");
      revalidatePath(`/app/events/${event.id}`, "layout");

      return NextResponse.json(
        discordWarning ? { warning: discordWarning } : {},
      );
    }

    if (data.resourceType === "wikiPage") {
      /**
       * Authorize: upload permission for the upload's kind on the target
       * page (image vs. attachment, derived from the stored mime type like
       * getWikiUploadKind does client-side). The upload must be the current
       * user's own and not linked to another page yet — this route only
       * covers the initial link right after the upload; further pages get
       * linked when their persisted content references the upload (see
       * syncUploadLinks in the collab server).
       */
      const [scoped, upload] = await Promise.all([
        getWikiPageScopedContext(data.resourceId),
        prisma.upload.findUnique({
          where: { id: data.uploadId },
          select: {
            id: true,
            createdById: true,
            mimeType: true,
            wikiPages: { select: { id: true } },
          },
        }),
      ]);
      if (!scoped)
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });

      const page = scoped.context.pagesById.get(data.resourceId);
      if (!page || page.deletedAt || !upload)
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      const permissions = scoped.context.permissions.get(page.id);
      const canUpload = upload.mimeType.startsWith("image/")
        ? permissions?.canUploadImages
        : permissions?.canUploadAttachments;
      if (
        !canUpload ||
        upload.createdById !== authentication.session.user.id ||
        upload.wikiPages.some((linked) => linked.id !== page.id)
      )
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await prisma.upload.update({
        where: { id: upload.id },
        data: { wikiPages: { connect: { id: page.id } } },
      });

      if (upload.mimeType.startsWith("image/"))
        probeUploadImageDimensions(upload.id);

      /**
       * No RESOURCE_IMAGE_ASSIGNED event here: the upload itself is audited
       * via UPLOAD_CREATED and the editing session via WIKI_PAGE_UPDATED.
       */
      return NextResponse.json({});
    }

    if (data.resourceType === "manufacturer") {
      /**
       * Authenticate and authorize the request
       */
      await authentication.authorizeApi(
        "manufacturersSeriesAndVariants",
        "manage",
      );

      /**
       * Update
       */
      await prisma.manufacturer.update({
        where: {
          id: data.resourceId,
        },
        data: {
          [data.resourceAttribute]: data.imageId,
        },
      });
    } else if (data.resourceType === "role") {
      /**
       * Authenticate and authorize the request
       */
      await authentication.authorizeApi("role", "manage");

      /**
       * Update
       */
      await prisma.role.update({
        where: {
          id: data.resourceId,
        },
        data: {
          [data.resourceAttribute]: data.imageId,
        },
      });
    }

    await createAuditEvents([
      {
        type: AuditEventType.RESOURCE_IMAGE_ASSIGNED,
        data: {
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          resourceAttribute: data.resourceAttribute,
          imageId: data.imageId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    probeUploadImageDimensions(data.imageId);

    return NextResponse.json({});
  } catch (error) {
    return apiErrorHandler(error);
  }
}
