import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
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
    await authentication.authorizeApi(
      "manufacturersSeriesAndVariants",
      "manage",
    );

    /**
     * Validate the request params and body
     */
    const body: unknown = await request.json();
    const data = bodySchema.parse(body);

    /**
     * Assign the image to the resource
     */
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
