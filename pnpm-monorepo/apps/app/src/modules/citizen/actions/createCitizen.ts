"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

const schema = z.object({
  spectrumId: z.string().trim(),
});

export const createCitizen = createAuthenticatedAction(
  "createCitizen",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!(await authentication.authorize("citizen", "create")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    /** The creator of a citizen is a citizen, not a login */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

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

    /** A known Spectrum ID opens its citizen and creates no duplicate */
    if (existingCitizen) redirect(`/app/spynet/citizen/${existingCitizen.id}`);

    const spectrumIdLog = await prisma.citizenLog.create({
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

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.CITIZEN_CREATED,
        data: {
          citizenId: spectrumIdLog.citizenId,
          spectrumId: data.spectrumId,
        },
        createdById: authentication.session.user.id,
      },
      {
        type: AuditEventType.ENTITY_LOG_CREATED,
        data: {
          entityId: spectrumIdLog.citizenId,
          logId: spectrumIdLog.id,
          logType: spectrumIdLog.type,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * The form's success hook closes the modal while the navigation is in
     * flight (see useAction)
     */
    redirect(`/app/spynet/citizen/${spectrumIdLog.citizenId}`);
  },
);
