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
  id: z.cuid(),
});

export const deleteSeries = createAuthenticatedAction(
  "deleteSeries",
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
     * Delete
     */
    let deletedSeries;
    try {
      deletedSeries = await prisma.series.delete({
        where: {
          id: data.id,
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
         * A different user deleted the series before, and the page must show it
         */
        return rejectConflict("Die Serie ist bereits gelöscht.", formData);
      }
      throw error;
    }

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.SERIES_DELETED,
        data: {
          seriesId: deletedSeries.id,
          manufacturerId: deletedSeries.manufacturerId,
          name: deletedSeries.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
