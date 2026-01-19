import { env } from "@/env";
import { logToConsole } from "./console";
import { logToOTel } from "./otel";
import { type LogEntry } from "./types";

const info = (message: string, args: Record<string, unknown> = {}) => {
  const logEntry: LogEntry = {
    ...args,
    timestamp: new Date().toISOString(),
    level: "info",
    message,
    host: env.HOST,
    stack: new Error().stack,
    ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
  };

  void logToConsole(logEntry);
  void logToOTel(logEntry);
};

const warn = (message: string, args: Record<string, unknown> = {}) => {
  const logEntry: LogEntry = {
    ...args,
    timestamp: new Date().toISOString(),
    level: "warn",
    message,
    host: env.HOST,
    stack: new Error().stack,
    ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
  };

  void logToConsole(logEntry);
  void logToOTel(logEntry);
};

const error = (message: string, args: Record<string, unknown> = {}) => {
  const logEntry: LogEntry = {
    ...args,
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    host: env.HOST,
    stack: new Error().stack,
    ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
  };

  void logToConsole(logEntry);
  void logToOTel(logEntry);
};

export const log = {
  info,
  warn,
  error,
};
