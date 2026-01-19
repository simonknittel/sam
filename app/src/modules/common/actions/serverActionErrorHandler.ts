import { log } from "@/modules/logging";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { ZodError } from "zod";
import { type ServerActionResponse } from "./types";

export const serverActionErrorHandler = (
  error: unknown,
  options?: {
    errorMessages?: {
      400?: string;
      401?: string;
      403?: string;
      404?: string;
      409?: string;
      500?: string;
    };
  },
): ServerActionResponse => {
  unstable_rethrow(error);

  if (
    error instanceof ZodError ||
    (error instanceof Error &&
      ["Bad request", "Unexpected end of JSON input"].includes(error.message))
  ) {
    return {
      status: 400,
      errorMessage: options?.errorMessages?.[400] || "Bad request",
      error: JSON.stringify(error),
    };
  } else if (error instanceof Error && error.message === "Unauthorized") {
    return {
      status: 401,
      errorMessage: options?.errorMessages?.[401] || "Unauthorized",
    };
  } else if (error instanceof Error && error.message === "Forbidden") {
    return {
      status: 403,
      errorMessage: options?.errorMessages?.[403] || "Forbidden",
    };
  } else if (
    (error instanceof Error && error.message === "Not found") ||
    (error instanceof PrismaClientKnownRequestError && error.code === "P2001")
  ) {
    return {
      status: 404,
      errorMessage: options?.errorMessages?.[404] || "Not found",
    };
  } else if (
    (error instanceof Error && error.message === "Duplicate") ||
    (error instanceof PrismaClientKnownRequestError && error.code === "P2002")
  ) {
    return {
      status: 409,
      errorMessage: options?.errorMessages?.[409] || "Conflict",
    };
  }

  log.error("errorHandler", {
    error: serializeError(error),
  });

  return {
    status: 500,
    errorMessage: options?.errorMessages?.[500] || "Internal server error",
  };
};
