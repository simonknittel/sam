import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("resourceType", [
  z.object({
    resourceType: z.literal("manufacturer"),
    resourceId: z.cuid(),
    resourceAttribute: z.literal("imageId"),
    imageId: z.cuid(),
  }),
  z.object({
    resourceType: z.literal("role"),
    resourceAttribute: z.enum(["iconId", "thumbnailId"]),
    resourceId: z.cuid(),
    imageId: z.cuid(),
  }),
  /**
   * Links an upload (image or file attachment) to the wiki page it is
   * embedded in, so attachment downloads can be permission-checked against
   * the page's visibility. `resourceId` is the page id.
   */
  z.object({
    resourceType: z.literal("wikiPage"),
    resourceAttribute: z.literal("wikiPageId"),
    resourceId: z.cuid2(),
    uploadId: z.cuid(),
  }),
]);

export async function PATCH(request: Request) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/upload/assign",
      "PATCH",
    );

    /**
     * Validate the request params and body
     */
    const body: unknown = await request.json();
    const data = bodySchema.parse(body);

    /**
     * Assign the image to the resource
     */
    if (data.resourceType === "wikiPage") {
      /**
       * Authorize: edit permission on the target page. The upload must be
       * the current user's own and not already belong to another page —
       * re-assigning someone else's upload would break its downloads there.
       */
      const [context, upload] = await Promise.all([
        getWikiContext(),
        prisma.upload.findUnique({
          where: { id: data.uploadId },
          select: { id: true, createdById: true, wikiPageId: true },
        }),
      ]);
      if (!context)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const page = context.pagesById.get(data.resourceId);
      if (!page || page.deletedAt || !upload)
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      if (
        !context.permissions.get(page.id)?.canEdit ||
        upload.createdById !== authentication.session.user.id ||
        (upload.wikiPageId !== null && upload.wikiPageId !== page.id)
      )
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await prisma.upload.update({
        where: { id: upload.id },
        data: { wikiPageId: page.id },
      });

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

    /**
     * Respond with the result
     */
    return NextResponse.json({});
  } catch (error) {
    return apiErrorHandler(error);
  }
}
