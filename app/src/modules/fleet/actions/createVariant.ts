"use server";

import { prisma } from "@/db";
import { VariantStatus } from "@/generated/prisma/client";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationAction } from "@/modules/auth/server";
import { log } from "@/modules/logging";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { ExternalService } from "../types";
import { createAndReturnTags } from "../utils/createAndReturnTags";
import {
  syncVariantExternalLinks,
  type IncomingLink,
} from "../utils/syncVariantExternalLinks";

const schema = z.object({
  seriesId: z.string(),
  name: z.string().trim().min(1),
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

export const createVariant = async (formData: FormData) => {
  const t = await getTranslations();

  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationAction("createVariant");
    await authentication.authorizeAction(
      "manufacturersSeriesAndVariants",
      "manage",
    );

    /**
     * Validate the request
     */
    const result = schema.safeParse({
      seriesId: formData.get("seriesId"),
      name: formData.get("name"),
      status: formData.has("status") ? formData.get("status") : undefined,
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
    });
    if (!result.success) {
      return {
        error: t("Common.badRequest"),
        requestPayload: formData,
      };
    }

    /**
     * Create variant
     */
    const tagsToConnect = await createAndReturnTags(
      result.data.tagKeys,
      result.data.tagValues,
    );

    const createdVariant = await prisma.variant.create({
      data: {
        seriesId: result.data.seriesId,
        name: result.data.name,
        status: result.data.status,
        ...(tagsToConnect &&
          tagsToConnect.length > 0 && {
            tags: {
              connect: tagsToConnect.map((tagId) => ({ id: tagId })),
            },
          }),
      },
      include: {
        series: true,
      },
    });

    const incomingLinks = result.data.linkServiceNames
      ?.map((serviceName, index) => ({
        serviceName,
        url: result.data.linkUrls?.[index],
      }))
      .filter((link) => Boolean(link.serviceName && link.url)) as
      | IncomingLink[]
      | undefined;
    await syncVariantExternalLinks(createdVariant.id, incomingLinks);

    await createAuditEvents([
      {
        type: AuditEventType.VARIANT_CREATED_V2,
        data: {
          variantId: createdVariant.id,
          seriesId: createdVariant.seriesId,
          name: createdVariant.name,
          status: createdVariant.status,
          links: incomingLinks ?? [],
        },
        createdById: authentication.session.user.id,
      },
    ]);

    /**
     * Revalidate cache(s)
     */
    revalidatePath(
      `/app/fleet/settings/manufacturers/${createdVariant.series.manufacturerId}`,
    );
    revalidatePath(
      `/app/fleet/settings/manufacturers/${createdVariant.series.manufacturerId}/series/${createdVariant.seriesId}`,
    );
    revalidatePath("/app/fleet/org");
    revalidatePath("/app/fleet/my-ships");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  } catch (error) {
    unstable_rethrow(error);
    log.error("Internal Server Error", { error: serializeError(error) });
    return {
      error: t("Common.internalServerError"),
      requestPayload: formData,
    };
  }
};
