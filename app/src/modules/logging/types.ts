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
  commitSha?: string;
  [key: string]: string | number | boolean | undefined;
}

export type LogOutput = (logEntry: LogEntry) => void | Promise<void>;
