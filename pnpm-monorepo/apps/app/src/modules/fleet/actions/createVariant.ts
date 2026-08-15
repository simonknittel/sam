"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { getWikiContext } from "@/modules/wiki/queries/getWikiContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
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
  wikiPageId: z.union([z.cuid2(), z.literal("")]).optional(),
});

export const createVariant = createAuthenticatedAction(
  "createVariant",
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
     * The linked page must be a readable page of the global wiki. One
     * generic error for unknown, trashed and unreadable pages alike, so
     * page existence never leaks.
     */
    const wikiPageId = data.wikiPageId ? data.wikiPageId : null;
    if (wikiPageId) {
      const wikiContext = await getWikiContext();
      if (
        !wikiContext ||
        !getAccessibleWikiPage(wikiContext, wikiPageId, "read")
      )
        return {
          error: t("Common.badRequest"),
          requestPayload: formData,
        };
    }

    /**
     * Create variant
     */
    const tagsToConnect = await createAndReturnTags(
      data.tagKeys,
      data.tagValues,
    );

    const createdVariant = await prisma.variant.create({
      data: {
        seriesId: data.seriesId,
        name: data.name,
        status: data.status,
        wikiPageId,
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

    const incomingLinks = data.linkServiceNames
      ?.map((serviceName, index) => ({
        serviceName,
        url: data.linkUrls?.[index],
      }))
      .filter((link) => Boolean(link.serviceName && link.url)) as
      IncomingLink[] | undefined;
    await syncVariantExternalLinks(createdVariant.id, incomingLinks);

    await createAuditEvents([
      {
        type: AuditEventType.VARIANT_CREATED_V3,
        data: {
          variantId: createdVariant.id,
          seriesId: createdVariant.seriesId,
          name: createdVariant.name,
          status: createdVariant.status,
          links: incomingLinks ?? [],
          wikiPageId: createdVariant.wikiPageId,
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
    revalidatePath(`/app/fleet/variant/${createdVariant.id}`, "layout");

    /**
     * Respond with the result
     */
    return {
      success: t("Common.successfullySaved"),
    };
  },
  {
    parseFormData: (formData) => ({
      seriesId: formData.get("seriesId"),
      name: formData.get("name"),
      status: formData.has("status") ? formData.get("status") : undefined,
      wikiPageId: formData.has("wikiPageId")
        ? formData.get("wikiPageId")
        : undefined,
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
