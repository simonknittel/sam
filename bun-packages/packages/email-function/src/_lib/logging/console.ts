import type { LogOutput } from "./types";

export const logToConsole: LogOutput = (logEntry) => {
	switch (logEntry.level) {
		case "info":
			console.info(JSON.stringify(logEntry));
			break;
		case "warn":
			console.warn(JSON.stringify(logEntry));
			break;
		case "error":
			console.error(JSON.stringify(logEntry));
			break;
	}
};
