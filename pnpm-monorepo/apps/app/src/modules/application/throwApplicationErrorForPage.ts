import { ForbiddenError, NotFoundError } from "@sam-monorepo/application";
import { forbidden, notFound } from "next/navigation";

/**
 * Use it only in a page or in a query that a page renders, not in a server
 * action or a route handler.
 */
export const throwApplicationErrorForPage = (error: unknown): never => {
  if (error instanceof ForbiddenError) forbidden();
  if (error instanceof NotFoundError) notFound();

  throw error;
};
