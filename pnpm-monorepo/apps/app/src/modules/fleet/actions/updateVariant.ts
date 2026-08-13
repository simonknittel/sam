"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { VariantStatus } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ExternalService } from "../types";
import { createAndReturnTags } from "../utils/createAndReturnTags";
import {
  syncVariantExternalLinks,
  type IncomingLink,
} from "../utils/syncVariantExternalLinks";

const schema = z.object({
  id: z.cuid(),
  name: z.string().trim().min(1).optional(),
  status: z
    .enum([VariantStatus.FLIGHT_READY, VariantStatus.NOT_FLIGHT_READY])
    .optional(),
  tagKeys: z.array(z.string().trim()).max(50).optional(),
  tagValues: z.array(z.string().trim()).max(50).optional(),
  linkServiceNames: z
    .array(
      z.enum([
        ExternalService.SPVIEWER,
        ExternalService.RSI,
        ExternalService.FLEETYARDS,
      ]),
    )
    .max(50)
    .nullish(),
  linkUrls: z.array(z.string().url()).max(50).nullish(),
});

export const updateVariant = createAuthenticatedAction(
  "updateVariant",
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
     * Update variant
     */
    const tagsToConnect = await createAndReturnTags(
      data.tagKeys,
      data.tagValues,
    );

    const existingVariant = await prisma.variant.findUnique({
      where: {
        id: data.id,
      },
      select: {
        name: true,
        status: true,
        externalLinks: {
          select: {
            serviceName: true,
            url: true,
          },
        },
      },
    });
    if (!existingVariant)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const updatedItem = await prisma.variant.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        status: data.status,
        tags: {
          set: tagsToConnect.map((tagId) => ({ id: tagId })),
        },
      },
      include: {
        series: true,
      },
    });

    const incomingLinks = data.linkServiceNames
      ?.map((serviceName, index) => ({
        serviceName,
        url: data.linkUrls?.[index],
      }))
      .filter((link) => Boolean(link.serviceName && link.url)) as
      IncomingLink[] | undefined;
    await syncVariantExternalLinks(updatedItem.id, incomingLinks);

    await createAuditEvents([
      {
        type: AuditEventType.VARIANT_UPDATED_V2,
        data: {
          variantId: updatedItem.id,
          seriesId: updatedItem.seriesId,
          previousName: existingVariant.name,
          newName: updatedItem.name,
          previousStatus: existingVariant.status,
          newStatus: updatedItem.status,
          previousLinks: existingVariant.externalLinks,
          newLinks: incomingLinks ?? [],
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(
      `/app/fleet/settings/manufacturers/${updatedItem.series.manufacturerId}`,
    );
    revalidatePath(
      `/app/fleet/settings/manufacturers/${updatedItem.series.manufacturerId}/series/${updatedItem.seriesId}`,
    );
    revalidatePath("/app/fleet/org");
    revalidatePath("/app/fleet/my-ships");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      id: formData.get("id"),
      name: formData.get("name"),
      status: formData.get("status"),
      tagKeys: formData.has("tagKeys[]")
        ? formData.getAll("tagKeys[]")
        : undefined,
      tagValues: formData.has("tagValues[]")
        ? formData.getAll("tagValues[]")
        : undefined,
      linkServiceNames: formData.has("linkServiceNames[]")
        ? formData.getAll("linkServiceNames[]")
        : undefined,
      linkUrls: formData.has("linkUrls[]")
        ? formData.getAll("linkUrls[]")
        : undefined,
    }),
  },
);
