import { prisma } from "@sam-monorepo/database";
import type { eventSchema } from "./discord/utils/schemas";
import { getEventUsers } from "./discord/utils/getEventUsers";
import type { z } from "zod";

export const updateParticipants = async (
	discordEvent: z.infer<typeof eventSchema>
) => {
	const databaseEvent = await prisma.event.findUnique({
		where: {
			discordId: discordEvent.id,
		},
	});
	if (!databaseEvent) return;

	const participants: { create: string[]; delete: string[]; } = {
		create: [],
		delete: [],
	};
	const discordEventUserIds = (await getEventUsers(discordEvent.id)).map(
		(user) => user.user_id
	);
	const existingDatabaseParticipantIds = (
		await prisma.eventDiscordParticipant.findMany({
			where: {
				event: {
					discordId: discordEvent.id,
				},
			},
		})
	).map((participant) => participant.discordUserId);

	// Collect new participants
	for (const userId of discordEventUserIds) {
		if (existingDatabaseParticipantIds.includes(userId)) continue;
		participants.create.push(userId);
	}

	// Collect removed participants
	for (const userId of existingDatabaseParticipantIds) {
		if (discordEventUserIds.includes(userId)) continue;
		participants.delete.push(userId);
	}

	// Save to database
	if (participants.delete.length > 0) {
		await prisma.$transaction([
			prisma.eventDiscordParticipant.deleteMany({
				where: {
					eventId: databaseEvent.id,
					discordUserId: {
						in: participants.delete,
					},
				},
			}),

			prisma.eventPositionApplication.deleteMany({
				where: {
					position: {
						eventId: databaseEvent.id,
					},
					citizen: {
						discordId: {
							in: participants.delete,
						},
					},
				},
			}),

			prisma.eventPosition.updateMany({
				where: {
					eventId: databaseEvent.id,
					citizen: {
						discordId: {
							in: participants.delete,
						},
					},
				},
				data: {
					citizenId: null,
				},
			}),
		]);
	}
	if (participants.create.length > 0) {
		await prisma.eventDiscordParticipant.createMany({
			data: participants.create.map((participantId) => ({
				eventId: databaseEvent.id,
				discordUserId: participantId,
			})),
		});
	}
};
