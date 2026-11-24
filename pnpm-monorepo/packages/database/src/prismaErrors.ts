import { Prisma } from "./generated/prisma/client.js";

/** https://www.prisma.io/docs/orm/reference/error-reference */
export enum PrismaErrorCode {
  UniqueConstraintFailed = "P2002",
  /** A nested `connect` gives `RecordNotFound` instead */
  ForeignKeyConstraintFailed = "P2003",
  RecordNotFound = "P2025",
}

export const isPrismaError = (error: unknown, code: PrismaErrorCode) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === String(code);
