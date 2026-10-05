"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";

const schema = z.object({
  spectrumId: z.string().trim().min(1),
});

/** A deleted citizen does not block a new one with the same Spectrum ID */
const getActiveCitizenBySpectrumId = (spectrumId: string) =>
  prisma.citizen.findFirst({
    where: {
      spectrumId,
      ...ACTIVE_CITIZEN_WHERE,
    },
    select: {
      id: true,
    },
  });

/**
 * Creates a citizen and opens its page. A known Spectrum ID opens its
 * citizen and creates no duplicate.
 *
 * In the browser, each redirect rejects the action with a redirect error
 * that Next.js handled already: the router opens the page, and the nearest
 * `RedirectBoundary` mounts its subtree again. This closes the create modal,
 * because its state is in that subtree. The success hook of the form does
 * not run.
 */
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

    const existingCitizen = await getActiveCitizenBySpectrumId(data.spectrumId);
    if (existingCitizen) redirect(`/app/spynet/citizen/${existingCitizen.id}`);

    const spectrumIdLog = await prisma.citizenLog
      .create({
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
      })
      .catch(async (error: unknown) => {
        /**
         * A different user created a citizen with the same Spectrum ID after
         * the check above (the unique index of the active citizens)
         */
        const parallelCitizen =
          isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed) &&
          (await getActiveCitizenBySpectrumId(data.spectrumId));
        if (!parallelCitizen) throw error;
        redirect(`/app/spynet/citizen/${parallelCitizen.id}`);
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

    redirect(`/app/spynet/citizen/${spectrumIdLog.citizenId}`);
  },
);
