import { env } from "../env";
import { type LogOutput } from "./types";

export const logToConsole: LogOutput = (logEntry) => {
	switch (logEntry.level) {
		case "info":
			if (env.NODE_ENV === "production") {
				console.info(JSON.stringify(logEntry));
			} else {
				console.info(logEntry);
			}
			break;

		case "warn":
			if (env.NODE_ENV === "production") {
				console.warn(JSON.stringify(logEntry));
			} else {
				console.warn(logEntry);
			}
			break;

		case "error":
			if (env.NODE_ENV === "production") {
				console.error(JSON.stringify(logEntry));
			} else {
				console.error(logEntry);
			}
			break;
	}
};
