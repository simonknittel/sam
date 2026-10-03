export enum LogLevel {
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export interface LogEntry {
  /** ISO string of the date (e.g. `new Date().toISOString()`) */
  timestamp: string;
  level: LogLevel;
  message: string;
  host: string;
  stack?: string;
  commitSha?: string;
  /** The other arguments of the log call, each `Error` serialized */
  [key: string]: unknown;
}

export type LogOutput = (logEntry: LogEntry) => void | Promise<void>;
