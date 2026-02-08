import { env } from "@/env";
import { LogLevel, type LogOutput } from "./types";

export const logToConsole: LogOutput = (logEntry) => {
  switch (logEntry.level) {
    case LogLevel.Info:
      if (env.NODE_ENV === "production") {
        console.info(JSON.stringify(logEntry));
      } else {
        console.info(logEntry);
      }
      break;

    case LogLevel.Warn:
      if (env.NODE_ENV === "production") {
        console.warn(JSON.stringify(logEntry));
      } else {
        console.warn(logEntry);
      }
      break;

    case LogLevel.Error:
      if (env.NODE_ENV === "production") {
        console.error(JSON.stringify(logEntry));
      } else {
        console.error(logEntry);
      }
      break;

    default:
      throw new Error(
        `Unknown logEntry.level: ${logEntry.level satisfies never}`,
      );
  }
};
