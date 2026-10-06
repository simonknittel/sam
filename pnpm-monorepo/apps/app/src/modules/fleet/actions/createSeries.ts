"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  name: z.string().trim().min(1),
  manufacturerId: z.string(),
});

export const createSeries = createAuthenticatedAction(
  "createSeries",
  schema,
  async (formData, authentication, data, t) => {
    if (
      !(await authentication.authorize(
        "manufacturersSeriesAndVariants",
        "manage",
      ))
    )
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Create
     */
    let createdSeries;
    try {
      createdSeries = await prisma.series.create({
        data: {
          name: data.name,
          manufacturer: {
            connect: {
              id: data.manufacturerId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          manufacturerId: true,
        },
      });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        /**
         * A different user deleted the manufacturer before, and the page must
         * show it
         */
        return rejectConflict(t("Common.notFound"), formData);
      }
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
        return {
          error: "Eine Serie mit diesem Namen existiert bereits.",
          requestPayload: formData,
        };
      throw error;
    }

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.SERIES_CREATED,
        data: {
          seriesId: createdSeries.id,
          name: createdSeries.name,
          manufacturerId: createdSeries.manufacturerId,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
);
