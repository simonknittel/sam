import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";

const respond = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

/**
 * Rethrows all other errors, thus the route gives them to `apiErrorHandler()`.
 * Use it only in a route handler.
 */
export const mapApplicationErrorToRouteResponse = (error: unknown) => {
  if (error instanceof ForbiddenError) return respond("Forbidden", 403);
  if (error instanceof NotFoundError) return respond("Not Found", 404);
  if (error instanceof ValidationError) return respond("Bad Request", 400);
  if (error instanceof ConflictError) return respond("Conflict", 409);

  throw error;
};
