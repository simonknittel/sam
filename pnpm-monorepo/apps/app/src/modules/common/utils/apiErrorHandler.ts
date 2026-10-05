import { log } from "@/modules/logging";
import { Prisma } from "@sam-monorepo/database/client";
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
  } else if (
    (error instanceof Error && error.message === "Not found") ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2001")
  ) {
    return NextResponse.json(
      {
        message: "Not Found",
      },
      { status: 404 },
    );
  } else if (
    (error instanceof Error && error.message === "Duplicate") ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002")
  ) {
    return NextResponse.json(
      {
        message: "Conflict",
      },
      { status: 409 },
    );
  } else if (
    error instanceof Error &&
    ["Bad request", "Unexpected end of JSON input"].includes(error.message)
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
