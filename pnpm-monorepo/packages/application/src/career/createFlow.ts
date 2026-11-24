import type { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  FLOW_NAME_MAXIMUM_LENGTH,
  SLUG_MAX_LENGTH,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { rethrowUniqueConstraintFailed } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { CareerErrorMessage } from "./careerErrors.js";
import { getNextFlowPosition, requireUsableFlowSlug } from "./flowSlugs.js";

export const createFlowInputSchema = z.object({
  name: z.string().trim().min(1).max(FLOW_NAME_MAXIMUM_LENGTH),
  slug: z.string().trim().min(1).max(SLUG_MAX_LENGTH),
});

export type CreateFlowInput = z.infer<typeof createFlowInputSchema>;

export interface FlowOutput {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export const FLOW_OUTPUT_SELECT = {
  id: true,
  name: true,
  slug: true,
} as const satisfies Prisma.FlowSelect;

/** Only the managers can read the flow, until a manager gives roles access */
export const createFlow = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateFlowInput,
): Promise<FlowOutput> =>
  withSpan(context, "createFlow", async () => {
    requirePermission(actor, "career", "manage");

    await requireUsableFlowSlug(context.prisma, input.slug);

    const position = await getNextFlowPosition(context.prisma);
    const citizenId = actor.citizen?.id ?? null;

    /**
     * Two managers can create the same slug at the same time: the unique
     * index decides
     */
    const flow = await rethrowUniqueConstraintFailed(
      () =>
        context.prisma.flow.create({
          data: {
            name: input.name,
            slug: input.slug,
            position,
            createdById: citizenId,
            updatedById: citizenId,
          },
          select: FLOW_OUTPUT_SELECT,
        }),
      CareerErrorMessage.SlugTaken,
    );

    await context.audit.create([
      {
        type: AuditEventType.CAREER_FLOW_CREATED,
        data: { flowId: flow.id, name: input.name, slug: input.slug },
        createdById: actor.userId,
      },
    ]);

    return flow;
  });
