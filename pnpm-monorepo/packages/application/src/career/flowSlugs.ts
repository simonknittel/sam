import type { PrismaClientType } from "@sam-monorepo/database";
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from "@sam-monorepo/domain";
import { ValidationError } from "../errors.js";
import { CareerErrorMessage } from "./careerErrors.js";

/**
 * The static segments under `/app/career`. The router matches them before
 * `[flowSlug]`, thus nobody could open a flow with one of these slugs.
 */
const RESERVED_FLOW_SLUGS: readonly string[] = ["settings"];

/**
 * The partial unique index on the rows that are not deleted is the last guard:
 * the writes map its error to `CareerErrorMessage.SlugTaken` too
 */
export const requireUsableFlowSlug = async (
  client: Pick<PrismaClientType, "flow">,
  slug: string,
  { exceptFlowId }: { readonly exceptFlowId?: string } = {},
) => {
  if (slug.length > SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug))
    throw new ValidationError(CareerErrorMessage.SlugFormat);
  if (RESERVED_FLOW_SLUGS.includes(slug))
    throw new ValidationError(CareerErrorMessage.SlugReserved);

  const takenSlug = await client.flow.findFirst({
    where: {
      slug,
      deletedAt: null,
      ...(exceptFlowId === undefined ? {} : { id: { not: exceptFlowId } }),
    },
    select: { id: true },
  });
  if (takenSlug) throw new ValidationError(CareerErrorMessage.SlugTaken);
};

export const getNextFlowPosition = async (
  client: Pick<PrismaClientType, "flow">,
) => {
  const lastFlow = await client.flow.findFirst({
    where: { deletedAt: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return (lastFlow?.position ?? 0) + 1;
};
