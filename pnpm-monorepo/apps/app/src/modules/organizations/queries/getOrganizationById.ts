import {
  getApplicationContext,
  getRequestActor,
  throwApplicationErrorForPage,
} from "@/modules/application";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  getOrganization,
  getOrganizationInputSchema,
} from "@sam-monorepo/application";
import type { Organization } from "@sam-monorepo/database/client";
import { notFound } from "next/navigation";
import { cache } from "react";

export const getOrganizationById = cache(
  withTrace("getOrganizationById", async (id: Organization["id"]) => {
    // The id comes from the URL: an id that is not valid names no organization
    const input = getOrganizationInputSchema.safeParse({ organization_id: id });
    if (!input.success) notFound();

    try {
      return await getOrganization(
        getApplicationContext(),
        await getRequestActor(),
        input.data,
      );
    } catch (error) {
      return throwApplicationErrorForPage(error);
    }
  }),
);
