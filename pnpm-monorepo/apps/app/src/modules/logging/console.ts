import { env } from "@/env";
import { LogLevel, type LogOutput } from "./types";

const getConsoleMethod = (level: LogLevel) => {
  switch (level) {
    case LogLevel.Info:
      return console.info;
    case LogLevel.Warn:
      return console.warn;
    case LogLevel.Error:
      return console.error;
    default:
      throw new Error(`Unknown level: ${level satisfies never}`);
  }
};

export const logToConsole: LogOutput = (logEntry) => {
  const consoleMethod = getConsoleMethod(logEntry.level);

  consoleMethod(
    env.NODE_ENV === "production" ? JSON.stringify(logEntry) : logEntry,
  );
};
