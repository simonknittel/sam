import {
  isPrismaError,
  PrismaErrorCode,
} from "@/modules/common/utils/isPrismaError";
import { log } from "@/modules/logging";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export default function apiErrorHandler(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Bad Request",
        errors: error.issues,
      },
      { status: 400 },
    );
  } else if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      { status: 401 },
    );
  } else if (error instanceof Error && error.message === "Forbidden") {
    return NextResponse.json(
      {
        message: "Forbidden",
      },
      { status: 403 },
    );
  } else if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed)) {
    return NextResponse.json(
      {
        message: "Conflict",
      },
      { status: 409 },
    );
  } else if (
    error instanceof Error &&
    error.message === "Unexpected end of JSON input"
  ) {
    return NextResponse.json(
      {
        message: "Bad Request",
      },
      { status: 400 },
    );
  }

  log.error("errorHandler", {
    error,
  });

  return NextResponse.json(
    {
      message: "Internal Server Error",
    },
    { status: 500 },
  );
}
