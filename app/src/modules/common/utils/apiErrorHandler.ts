import { log } from "@/modules/logging";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { serializeError } from "serialize-error";
import { ZodError } from "zod";

export default function apiErrorHandler(
  error: unknown,
  responseInit: ResponseInit = {},
) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Bad Request",
        errors: error.errors,
      },
      { status: 400, ...responseInit },
    );
  } else if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      { status: 401, ...responseInit },
    );
  } else if (error instanceof Error && error.message === "Forbidden") {
    return NextResponse.json(
      {
        message: "Forbidden",
      },
      { status: 403, ...responseInit },
    );
  } else if (
    (error instanceof Error && error.message === "Not found") ||
    (error instanceof PrismaClientKnownRequestError && error.code === "P2001")
  ) {
    return NextResponse.json(
      {
        message: "Not Found",
      },
      { status: 404, ...responseInit },
    );
  } else if (
    (error instanceof Error && error.message === "Duplicate") ||
    (error instanceof PrismaClientKnownRequestError && error.code === "P2002")
  ) {
    return NextResponse.json(
      {
        message: "Conflict",
      },
      { status: 409, ...responseInit },
    );
  } else if (
    error instanceof Error &&
    ["Bad request", "Unexpected end of JSON input"].includes(error.message)
  ) {
    return NextResponse.json(
      {
        message: "Bad Request",
      },
      { status: 400, ...responseInit },
    );
  }

  log.error("errorHandler", {
    error: serializeError(error),
  });

  return NextResponse.json(
    {
      message: "Internal Server Error",
    },
    { status: 500, ...responseInit },
  );
}
