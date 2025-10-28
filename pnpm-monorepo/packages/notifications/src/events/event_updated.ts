import { prisma, type Event } from "@sam-monorepo/database";
import { publishPusherNotification } from "../pusher.js";

export type Payload = {
	eventId: Event["id"];
};

const handler = async (payload: Payload) => {
	// TODO: Migrate to Novu
	// TODO: Only send notifications to citizens which have the `login;manage` and `event;read` permission

	const event = await prisma.event.findUnique({
		where: {
			id: payload.eventId,
		},
		select: {
			id: true,
			name: true,
		}
	});
	if (!event) return;

	await publishPusherNotification(
		["updatedDiscordEvent"],
		"Event aktualisiert",
		event.name,
		`/app/events/${event.id}`,
	);
};

const event = {
	key: "event_updated",
	handler,
} as const;

export default event;
