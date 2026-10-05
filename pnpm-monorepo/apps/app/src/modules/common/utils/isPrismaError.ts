import { Prisma } from "@sam-monorepo/database/client";

/**
 * Error codes of the Prisma query engine. The full list is in the Prisma
 * error reference: https://www.prisma.io/docs/orm/reference/error-reference
 */
export enum PrismaErrorCode {
  /** A unique constraint failed, for example a row that exists already */
  UniqueConstraintFailed = "P2002",
  /** A record that the operation needs does not exist (anymore) */
  RecordNotFound = "P2025",
}

export const isPrismaError = (error: unknown, code: PrismaErrorCode) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === String(code);
