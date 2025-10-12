import { logToConsole } from "./console";
import type { LogEntry } from "./types";

const info = (message: string, args: Record<string, unknown> = {}) => {
	const logEntry: LogEntry = {
		timestamp: new Date().toISOString(),
		level: "info",
		message,
		...(process.env.COMMIT_SHA && { commitSha: process.env.COMMIT_SHA }),
		...args,
	};

	logToConsole(logEntry);
};

const warn = (message: string, args: Record<string, unknown> = {}) => {
	const logEntry: LogEntry = {
		timestamp: new Date().toISOString(),
		level: "warn",
		message,
		...(process.env.COMMIT_SHA && { commitSha: process.env.COMMIT_SHA }),
		...args,
	};

	logToConsole(logEntry);
};

const error = (message: string, args: Record<string, unknown> = {}) => {
	const logEntry: LogEntry = {
		timestamp: new Date().toISOString(),
		level: "error",
		message,
		...(process.env.COMMIT_SHA && { commitSha: process.env.COMMIT_SHA }),
		...args,
	};

	logToConsole(logEntry);
};

export const log = {
	info,
	warn,
	error,
};
