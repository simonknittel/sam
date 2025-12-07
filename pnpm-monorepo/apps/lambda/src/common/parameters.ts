import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import { log } from "./logger";

const ssmClient = new SSMClient({});

export const fetchParameters = async <T extends Record<string, string>>(
	parameters: T,
): Promise<T> => {
	const entries = Object.entries(parameters);

	if (entries.length === 0) {
		return {} as T;
	}

	try {
		const names = entries.map(([, name]) => name);
		const command = new GetParametersCommand({
			Names: names,
			WithDecryption: true,
		});
		const response = await ssmClient.send(command);

		const valueMap = new Map<string, string>();
		for (const parameter of response.Parameters ?? []) {
			if (parameter?.Name && typeof parameter.Value === "string") {
				valueMap.set(parameter.Name, parameter.Value);
			}
		}

		const invalidParameters = response.InvalidParameters ?? [];
		const missingParameters = names.filter((name) => !valueMap.has(name));

		if (invalidParameters.length > 0 || missingParameters.length > 0) {
			void log.error("Failed to fetch parameter", {
				invalidParameters,
				missingParameters,
			});
			throw new Error("Failed to fetch parameter");
		}

		const resolvedEntries = entries.map(([key, name]) => [key, valueMap.get(name)!]);
		return Object.fromEntries(resolvedEntries);
	} catch (error) {
		void log.error("Failed to fetch parameter", { error });
		throw error instanceof Error
			? error
			: new Error("Failed to fetch parameter");
	}
};
