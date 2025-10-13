import { prisma } from "@sam-monorepo/database";
import type { getEvents } from "./discord/utils/getEvents";
import { publishNotification } from "./pusher/utils/publishNotification";

export const deleteCancelledEvents = async (
	futureEventsFromDiscord: Awaited<ReturnType<typeof getEvents>>["data"]
) => {
	const futureEventsFromDatabase = await prisma.event.findMany({
		where: {
			startTime: {
				gte: new Date(),
			},
		},
	});

	const cancelledEvents = futureEventsFromDatabase.filter(
		(event) => !futureEventsFromDiscord.some(
			(discordEvent) => discordEvent.id === event.discordId
		)
	);

	if (cancelledEvents.length > 0) {
		await prisma.event.deleteMany({
			where: {
				id: {
					in: cancelledEvents.map((event) => event.id),
				},
			},
		});
	}

	for (const cancelledEvent of cancelledEvents) {
		await publishNotification(
			["deletedDiscordEvent"],
			"Event abgesagt",
			cancelledEvent.name
		);
	}
};
