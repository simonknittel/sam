import { prisma } from "@/db";
import { TEMPLATE_POSITION_TREE_INCLUDE } from "@/modules/events/queries/positionTreeInclude";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";

/**
 * The template's lineup blueprint, in the same nested shape the event lineup
 * renders. Carries no permission check of its own — callers resolve the
 * template through `getEventTemplateById` first.
 */
export const getEventTemplateLineup = cache(
  withTrace("getEventTemplateLineup", async (templateId: string) =>
    prisma.eventPosition.findMany({
      where: {
        templateId,
        parentPositionId: null,
      },
      orderBy: {
        order: "asc",
      },
      include: TEMPLATE_POSITION_TREE_INCLUDE,
    }),
  ),
);
