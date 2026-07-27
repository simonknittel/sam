import { prisma } from "@/db";
import { deleteObject } from "@/modules/algolia";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = Promise<{
  id: string;
}>;

const paramsSchema = z.cuid();

export async function DELETE(request: Request, props: { params: Params }) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/citizen/[id]",
      "DELETE",
    );
    await authentication.authorizeApi("citizen", "delete");

    /**
     * Validate the request params
     */
    const paramsData = paramsSchema.parse((await props.params).id);

    /**
     * Delete
     */
    const deletedEntity = await prisma.entity.delete({
      where: {
        id: paramsData,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CITIZEN_DELETED,
        data: {
          citizenId: deletedEntity.id,
          spectrumId: deletedEntity.spectrumId || "",
        },
        createdById: authentication.session.user.id,
      },
    ]);

    // TODO: Update name field of user corresponding use entry

    /**
     * Delete entity from Algolia
     */
    await deleteObject(paramsData);

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
