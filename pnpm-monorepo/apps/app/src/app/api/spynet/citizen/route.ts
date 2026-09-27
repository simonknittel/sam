import { prisma } from "@/db";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { NextResponse } from "next/server";
import * as z from "zod";

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
    /** The creator of a citizen is a citizen, not a login */
    if (!authentication.session.entity) throw new Error("Forbidden");

    /**
     * Validate the request
     */
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    /**
     * Do the thing
     */
    /** A deleted citizen does not block a new one with the same Spectrum ID */
    const existingCitizen = await prisma.citizen.findFirst({
      where: {
        spectrumId: data.spectrumId,
        ...ACTIVE_CITIZEN_WHERE,
      },
      select: {
        id: true,
      },
    });

    /** The client parses the id alone, so the whole citizen never crosses */
    if (existingCitizen) return NextResponse.json({ id: existingCitizen.id });

    const item = await prisma.citizenLog.create({
      data: {
        type: "spectrum-id",
        content: data.spectrumId,
        submittedBy: {
          connect: {
            id: authentication.session.user.id,
          },
        },
        citizen: {
          create: {
            createdBy: {
              connect: {
                id: authentication.session.entity.id,
              },
            },
            spectrumId: data.spectrumId,
          },
        },
      },
      select: {
        id: true,
        type: true,
        citizenId: true,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.CITIZEN_CREATED,
        data: {
          citizenId: item.citizenId,
          spectrumId: data.spectrumId,
        },
        createdById: authentication.session.user.id,
      },
      {
        type: AuditEventType.ENTITY_LOG_CREATED,
        data: {
          entityId: item.citizenId,
          logId: item.id,
          logType: item.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return NextResponse.json({ id: item.citizenId });
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}
