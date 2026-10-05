"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { log } from "@/modules/logging";
import { ConfirmationStatus } from "@sam-monorepo/database/client";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { getOrganizationBySpectrumId } from "../queries/getOrganizationBySpectrumId";
import { scrapeOrganizationLogo } from "../utils/scrapeOrganizationLogo";

const DUPLICATE_ERROR =
  "Eine Organisation mit dieser Spectrum ID existiert bereits.";

const schema = z.object({
  spectrumId: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

export const createOrganization = createAuthenticatedAction(
  "createOrganization",
  schema,
  async (formData, authentication, data, t) => {
    /**
     * Authorize the request
     */
    if (!authentication.session.entity)
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    if (!(await authentication.authorize("organization", "create")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };
    const entityId = authentication.session.entity.id;

    /**
     * Create the organization
     */
    const existingOrganization = await getOrganizationBySpectrumId(
      data.spectrumId,
    );
    if (existingOrganization)
      return { error: DUPLICATE_ERROR, requestPayload: formData };

    let logo: string | undefined;
    try {
      logo = await scrapeOrganizationLogo(data.spectrumId);
    } catch (error) {
      log.error("Failed to scrape organization logo", {
        spectrumId: data.spectrumId,
        error,
      });
    }

    const createdOrganization = await prisma.organization
      .create({
        data: {
          spectrumId: data.spectrumId,
          name: data.name,
          logo,
          createdById: entityId,
          attributeHistoryEntries: {
            create: {
              createdById: entityId,
              attributeKey: "name",
              newValue: data.name,
              confirmed: ConfirmationStatus.CONFIRMED,
              confirmedAt: new Date(),
              confirmedById: entityId,
            },
          },
        },
        select: {
          id: true,
          spectrumId: true,
          name: true,
        },
      })
      .catch((error: unknown) => {
        /** A different user created the same organization at the same time */
        if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
          return null;
        throw error;
      });
    if (!createdOrganization)
      return { error: DUPLICATE_ERROR, requestPayload: formData };

    refresh();

    await createAuditEvents([
      {
        type: AuditEventType.ORGANIZATION_CREATED,
        data: {
          organizationId: createdOrganization.id,
          spectrumId: createdOrganization.spectrumId,
          name: createdOrganization.name,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    redirect(`/app/spynet/organization/${createdOrganization.id}`);
  },
);
