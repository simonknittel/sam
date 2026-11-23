import type { LogArguments, Logger } from "@sam-monorepo/application";

enum LogLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

/**
 * The errors of the database client and of its driver. Their messages can
 * contain the values of a query, for example a raw line of a log file.
 */
const DATABASE_ERROR_NAME = /^(?:Prisma|DriverAdapter)/;

const STACK_FRAME = /^\s+at /;

/**
 * The fields of an error that a log record can contain: the name, the code
 * and the stack frames. The message only for an error that is not an error
 * of the database. The cause stays out, because it can be an error of the
 * database.
 */
export const describeError = (error: unknown) => {
  if (!(error instanceof Error)) return { name: typeof error };

  const code =
    "code" in error &&
    (typeof error.code === "string" || typeof error.code === "number")
      ? error.code
      : undefined;

  return {
    name: error.name,
    ...(code !== undefined && { code }),
    ...(!DATABASE_ERROR_NAME.test(error.name) && { message: error.message }),
    // The first lines of the stack repeat the message
    stack: (error.stack ?? "")
      .split("\n")
      .filter((line) => STACK_FRAME.test(line))
      .map((line) => line.trim()),
  };
};

const replaceErrors = (_key: string, value: unknown) =>
  value instanceof Error ? describeError(value) : value;

/**
 * Writes each log record as one JSON line to the standard output of the
 * container (decision 9 of the plan). Never put tokens, raw lines, hashes or
 * IP addresses into the arguments. The ids of the users, the citizens and
 * the runtimes are permitted. An `Error` in the arguments becomes the
 * fields of `describeError()`.
 */
export const createJsonLogger = (
  writeLine: (line: string) => void = (line) => {
    process.stdout.write(`${line}\n`);
  },
): Logger => {
  const createLogLevel =
    (level: LogLevel) =>
    (message: string, args: LogArguments = {}) => {
      const record = {
        ...args,
        timestamp: new Date().toISOString(),
        level,
        message,
      };

      try {
        writeLine(JSON.stringify(record, replaceErrors));
      } catch (error) {
        // For example a circular structure in the arguments
        writeLine(
          JSON.stringify(
            {
              timestamp: record.timestamp,
              level,
              message,
              loggingError: describeError(error),
            },
            replaceErrors,
          ),
        );
      }
    };

  return {
    info: createLogLevel(LogLevel.Info),
    warn: createLogLevel(LogLevel.Warn),
    error: createLogLevel(LogLevel.Error),
  };
};
