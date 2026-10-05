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
  name: z.string().trim().min(1),
});

export const createManufacturer = createAuthenticatedAction(
  "createManufacturer",
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
    let createdManufacturer;
    try {
      createdManufacturer = await prisma.manufacturer.create({
        data: {
          name: data.name,
        },
        select: {
          id: true,
          name: true,
        },
      });
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
        return {
          error: "Ein Hersteller mit diesem Namen existiert bereits.",
          requestPayload: formData,
        };
      throw error;
    }

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.MANUFACTURER_CREATED,
        data: {
          manufacturerId: createdManufacturer.id,
          name: createdManufacturer.name,
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
