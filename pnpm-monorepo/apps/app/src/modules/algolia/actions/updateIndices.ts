"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { getOrganizations } from "@/modules/organizations/queries/getOrganizations";
import { getTracer } from "@/modules/tracing/utils/getTracer";
import { SpanStatusCode } from "@opentelemetry/api";
import { z } from "zod";
import { getClient, indexName } from "..";

const schema = z.object({});

export const updateIndices = createAuthenticatedAction(
  "updateIndices",
  schema,
  async (formData, authentication, _data, t) => {
    if (!(await authentication.authorize("algolia", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const [organizations, citizen] = await Promise.all([
      getOrganizations(),

      prisma.entity.findMany({
        include: {
          logs: {
            where: {
              type: {
                in: ["handle", "community-moniker", "citizen-id"],
              },
              attributes: {
                some: {
                  key: "confirmed",
                  value: "confirmed",
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      }),
    ]);

    const client = getClient();
    await getTracer().startActiveSpan(
      "replaceAllAlgoliaObjects",
      async (span) => {
        try {
          await client.replaceAllObjects({
            indexName,
            objects: [
              ...organizations.map((organization) => ({
                objectID: organization.id,
                spectrumId: organization.spectrumId,
                type: "organization",
                names: [organization.name],
              })),

              ...citizen.map((citizen) => ({
                objectID: citizen.id,
                spectrumId: citizen.spectrumId,
                type: "citizen",
                handles: citizen.logs
                  .filter((log) => log.type === "handle")
                  .map((log) => log.content),
                communityMonikers: citizen.logs
                  .filter((log) => log.type === "community-moniker")
                  .map((log) => log.content),
                citizenIds: citizen.logs
                  .filter((log) => log.type === "citizen-id")
                  .map((log) => log.content),
              })),
            ],
            batchSize: 1000,
          });
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
          });
          throw error;
        } finally {
          span.end();
        }
      },
    );

    return {
      success: "Successfully updated Algolia indices",
    };
  },
);
