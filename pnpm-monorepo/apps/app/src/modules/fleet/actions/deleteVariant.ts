"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
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

export const deleteVariant = createAuthenticatedAction(
  "deleteVariant",
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
    let deletedItem;
    try {
      deletedItem = await prisma.variant.delete({
        where: {
          id: data.id,
        },
      });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        /**
         * A different user deleted the variant before, and the page must show
         * it
         */
        refresh();
        return {
          error: "Die Variante ist bereits gelöscht.",
          requestPayload: formData,
        };
      }
      throw error;
    }

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.VARIANT_DELETED,
        data: {
          variantId: deletedItem.id,
          seriesId: deletedItem.seriesId,
          name: deletedItem.name,
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
