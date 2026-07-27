import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = Promise<{
  id: string;
}>;

const paramsSchema = z.object({ id: z.cuid() });

const patchBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
});

export async function PATCH(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/classification-level/[id]",
      "PATCH",
    );
    await authentication.authorizeApi("classificationLevel", "manage");

    /**
     * Validate the request params and body
     */
    const paramsData = paramsSchema.parse(await props.params);
    const body: unknown = await request.json();
    const data = patchBodySchema.parse(body);

    /**
     * Do the thing
     */
    const existingItem = await prisma.classificationLevel.findUnique({
      where: {
        id: paramsData.id,
      },
      select: {
        name: true,
      },
    });
    if (!existingItem) throw new Error("Not found");

    const item = await prisma.classificationLevel.update({
      where: {
        id: paramsData.id,
      },
      data,
    });

    await createAuditEvents([
      {
        type: AuditEventType.CLASSIFICATION_LEVEL_UPDATED,
        data: {
          classificationLevelId: item.id,
          previousName: existingItem.name,
          newName: item.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return NextResponse.json(item);
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}

export async function DELETE(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/classification-level/[id]",
      "DELETE",
    );
    await authentication.authorizeApi("classificationLevel", "manage");

    /**
     * Validate the request params
     */
    const paramsData = paramsSchema.parse(await props.params);

    /**
     * Do the thing
     */
    const deletedItem = await prisma.classificationLevel.delete({
      where: {
        id: paramsData.id,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CLASSIFICATION_LEVEL_DELETED,
        data: {
          classificationLevelId: deletedItem.id,
          name: deletedItem.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return NextResponse.json({});
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
