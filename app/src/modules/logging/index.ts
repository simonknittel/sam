import { env } from "@/env";
import { after } from "next/server";
import { logToConsole } from "./console";
import { logToOTel } from "./otel";
import { LogLevel, type LogEntry } from "./types";

const info = (message: string, args: Record<string, unknown> = {}) => {
  after(async () => {
    const logEntry: LogEntry = {
      ...args,
      timestamp: new Date().toISOString(),
      level: LogLevel.Info,
      message,
      host: env.HOST,
      stack: new Error().stack,
      ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
    };

    await Promise.all([logToConsole(logEntry), logToOTel(logEntry)]);
  });
};

const warn = (message: string, args: Record<string, unknown> = {}) => {
  after(async () => {
    const logEntry: LogEntry = {
      ...args,
      timestamp: new Date().toISOString(),
      level: LogLevel.Warn,
      message,
      host: env.HOST,
      stack: new Error().stack,
      ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
    };

    await Promise.all([logToConsole(logEntry), logToOTel(logEntry)]);
  });
};

const error = (message: string, args: Record<string, unknown> = {}) => {
  after(async () => {
    const logEntry: LogEntry = {
      ...args,
      timestamp: new Date().toISOString(),
      level: LogLevel.Error,
      message,
      host: env.HOST,
      stack: new Error().stack,
      ...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
    };

    await Promise.all([logToConsole(logEntry), logToOTel(logEntry)]);
  });
};

export const log = {
  info,
  warn,
  error,
};
