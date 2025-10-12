import { serializeError } from "serialize-error";
import { getRequestContext, type RequestContext } from "./requestContext";

interface LogEntry {
	/** ISO string of the date (`new Date().toISOString()`) */
	timestamp: string;
	message: string;
	level: "info" | "warn" | "error";
	/** Stack trace for every log entry, not only errors. Also, the original stack trace sometimes doesn't contain the full stack trace. */
	requestId?: RequestContext["requestId"];
	stack: string;
	/** Any other serialized arguments */
	[key: string]: string | number | boolean | undefined | null;
}

const info = async (message: string, args: Record<string, unknown> = {}) => {
	const { error, ..._args } = args;

	let requestContext: RequestContext | undefined;
	try {
		requestContext = getRequestContext();
	} catch (error) {}

	const logEntry: LogEntry = {
		timestamp: new Date().toISOString(),
		message,
		level: "info",
		...(requestContext ? { requestId: requestContext.requestId } : {}),
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		stack: new Error().stack!,
		...(error
			? { serializedError: JSON.stringify(serializeError(error)) }
			: {}),
		...args,
	};

	if (process.env.NODE_ENV === "production") {
		console.info(JSON.stringify(logEntry));
	} else {
		console.info(logEntry);
	}
};

const warn = async (message: string, args: Record<string, unknown> = {}) => {
	const { error, ..._args } = args;

	let requestContext: RequestContext | undefined;
	try {
		requestContext = getRequestContext();
	} catch (error) {}

	const logEntry: LogEntry = {
		timestamp: new Date().toISOString(),
		message,
		level: "warn",
		...(requestContext ? { requestId: requestContext.requestId } : {}),
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		stack: new Error().stack!,
		...(error
			? { serializedError: JSON.stringify(serializeError(error)) }
			: {}),
		...args,
	};

	if (process.env.NODE_ENV === "production") {
		console.warn(JSON.stringify(logEntry));
	} else {
		console.warn(logEntry);
	}
};

const error = async (message: string, args: Record<string, unknown> = {}) => {
	const { error, ..._args } = args;

	let requestContext: RequestContext | undefined;
	try {
		requestContext = getRequestContext();
	} catch (error) {}

	const logEntry: LogEntry = {
		timestamp: new Date().toISOString(),
		message,
		level: "error",
		...(requestContext ? { requestId: requestContext.requestId } : {}),
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		stack: new Error().stack!,
		...(error
			? { serializedError: JSON.stringify(serializeError(error)) }
			: {}),
		..._args,
	};

	if (process.env.NODE_ENV === "production") {
		console.error(JSON.stringify(logEntry));
	} else {
		console.error(logEntry);
	}
};

export const log = {
	info,
	warn,
	error,
};
