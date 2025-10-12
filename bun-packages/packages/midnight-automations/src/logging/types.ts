export interface LogEntry {
	/** ISO string of the date (e.g. `new Date().toISOString()`) */
	timestamp: string;
	level: "info" | "warn" | "error";
	message: string;
	commitSha?: string;
	[key: string]: string | number | boolean | undefined;
}

export type LogOutput = (logEntry: LogEntry) => void | Promise<void>;
