"use server";

import { prisma } from "@/db";
import { log } from "@/modules/logging";
import { getOrganizations } from "@/modules/organizations/queries";
import { getTracer } from "@/modules/tracing/utils/getTracer";
import { SpanStatusCode } from "@opentelemetry/api";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { getIndex } from "..";

export const updateIndices = async () => {
  try {
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

    const index = getIndex();
    await getTracer().startActiveSpan("clearAlgoliaObjects", async (span) => {
      try {
        await index.clearObjects();
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
        });
        throw error;
      } finally {
        span.end();
      }
    });

    await getTracer().startActiveSpan("saveAlgoliaObjects", async (span) => {
      try {
        await index.saveObjects([
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
        ]);
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
        });
        throw error;
      } finally {
        span.end();
      }
    });

    return {
      success: "Successfully updated Algolia indices",
    };
  } catch (error) {
    unstable_rethrow(error);
    log.error("Failed to update Algolia indices", {
      error: serializeError(error),
    });
    return {
      error: "Failed to update Algolia indices",
    };
  }
};
