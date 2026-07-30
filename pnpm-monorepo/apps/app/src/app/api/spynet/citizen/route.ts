import { prisma } from "@/db";
import { saveObject } from "@/modules/algolia";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { NextResponse } from "next/server";
import { z } from "zod";

const postBodySchema = z.object({
  type: z.literal("citizen"),
  spectrumId: z.string().trim(),
});

export async function POST(request: Request) {
  try {
    /**
     * Authenticate the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/spynet/citizen",
      "POST",
    );
    await authentication.authorizeApi("citizen", "create");

    /**
     * Validate the request
     */
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    /**
     * Do the thing
     */
    const log = await prisma.entityLog.findFirst({
      where: {
        type: "spectrum-id",
        content: data.spectrumId,
      },
      include: {
        entity: true,
      },
    });

    if (log) return NextResponse.json(log.entity);

    const item = await prisma.entityLog.create({
      data: {
        type: "spectrum-id",
        content: data.spectrumId,
        submittedBy: {
          connect: {
            id: authentication.session.user.id,
          },
        },
        entity: {
          create: {
            createdBy: {
              connect: {
                id: authentication.session.user.id,
              },
            },
            spectrumId: data.spectrumId,
          },
        },
      },
      include: {
        entity: true,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CITIZEN_CREATED,
        data: {
          citizenId: item.entityId,
          spectrumId: data.spectrumId,
        },
        createdById: authentication.session.user.id,
      },
      {
        type: AuditEventType.ENTITY_LOG_CREATED,
        data: {
          entityId: item.entityId,
          logId: item.id,
          logType: item.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Add new citizen to Algolia
     */
    await saveObject(item.entityId, {
      type: "citizen",
      spectrumId: data.spectrumId,
    });

    /**
     * Respond with the result
     */
    return NextResponse.json(item.entity);
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
