import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";

export class ForbiddenError extends Error {
  override readonly name = "ForbiddenError";

  constructor(message = "Forbidden", options?: ErrorOptions) {
    super(message, options);
  }
}

/** The target of the operation does not exist, or the actor cannot see it */
export class NotFoundError extends Error {
  override readonly name = "NotFoundError";

  constructor(message = "Not found", options?: ErrorOptions) {
    super(message, options);
  }
}

/**
 * The target is in a state that does not permit the operation, for example
 * an event that already ended
 */
export class ConflictError extends Error {
  override readonly name = "ConflictError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** The input is valid for the schema, but not for the current data */
export class ValidationError extends Error {
  override readonly name = "ValidationError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

/** P2025 also comes when a record that the write connects is gone */
export const rethrowRecordNotFound = async <Result>(
  write: () => Promise<Result>,
  message: string,
): Promise<Result> => {
  try {
    return await write();
  } catch (error) {
    if (isPrismaError(error, PrismaErrorCode.RecordNotFound))
      throw new NotFoundError(message, { cause: error });

    throw error;
  }
};

export const rethrowUniqueConstraintFailed = async <Result>(
  write: () => Promise<Result>,
  message: string,
): Promise<Result> => {
  try {
    return await write();
  } catch (error) {
    if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed))
      throw new ValidationError(message, { cause: error });

    throw error;
  }
};
