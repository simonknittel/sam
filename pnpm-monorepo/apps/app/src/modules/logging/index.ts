import { env } from "@/env";
import { after } from "next/server";
import { logToConsole } from "./console";
import { logToOTel } from "./otel";
import { LogLevel, type LogEntry } from "./types";

const createLogLevel =
  (level: LogLevel) =>
  (message: string, args: Record<string, unknown> = {}) => {
    after(async () => {
      const logEntry: LogEntry = {
        ...args,
        timestamp: new Date().toISOString(),
        level,
        message,
        host: env.NEXT_PUBLIC_HOST,
        stack: new Error().stack,
        ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
      };

      await Promise.all([logToConsole(logEntry), logToOTel(logEntry)]);
    });
  };

export const log = {
  info: createLogLevel(LogLevel.Info),
  warn: createLogLevel(LogLevel.Warn),
  error: createLogLevel(LogLevel.Error),
};
