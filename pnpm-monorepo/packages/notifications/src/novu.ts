import { Novu } from "@novu/api";
import { env } from "./env.js";
import type { TriggerEventRequestDto } from "@novu/api/models/components/triggereventrequestdto.js";

const CHUNK_SIZE = 100;

export const novu =
	Boolean(env.NOVU_SECRET_KEY && env.NOVU_SERVER_URL)
		? new Novu({
			secretKey: env.NOVU_SECRET_KEY,
			serverURL: env.NOVU_SERVER_URL,
		})
		: null;

export const publishNovuNotifications = async (events: TriggerEventRequestDto[]) => {
	if (!novu) return;

	// Split events into chunks of 100 to avoid limit of Novu SDK/API
	const chunks = [];
	for (let i = 0; i < events.length; i += CHUNK_SIZE) {
		chunks.push(events.slice(i, i + CHUNK_SIZE));
	}

	// Send notifications in bulk for each chunk
	for (const chunk of chunks) {
		await novu.triggerBulk({
			events: chunk,
		})
	}
}
