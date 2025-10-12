import { env } from "../env";
import { logToConsole } from "./console";
import type { LogEntry } from "./types";

const info = async (message: string, args: Record<string, unknown> = {}) => {
	const logEntry: LogEntry = {
		...args,
		timestamp: new Date().toISOString(),
		level: "info",
		message,
		stack: new Error().stack,
		...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
	};

	await Promise.all([logToConsole(logEntry)]);
};

const warn = async (message: string, args: Record<string, unknown> = {}) => {
	const logEntry: LogEntry = {
		...args,
		timestamp: new Date().toISOString(),
		level: "warn",
		message,
		stack: new Error().stack,
		...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
	};

	await Promise.all([logToConsole(logEntry)]);
};

const error = async (message: string, args: Record<string, unknown> = {}) => {
	const logEntry: LogEntry = {
		...args,
		timestamp: new Date().toISOString(),
		level: "error",
		message,
		stack: new Error().stack,
		...(env.COMMIT_SHA && { commitSha: env.COMMIT_SHA }),
	};

	await Promise.all([logToConsole(logEntry)]);
};

export const log = {
	info,
	warn,
	error,
};
