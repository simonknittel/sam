import { prisma, type Event } from "@sam-monorepo/database";

export const getEventParticipants = async (eventId: Event["id"]) => {
	/**
 * Calculate recipients
 */
	const event = await prisma.event.findUnique({
		where: {
			id: eventId,
		},
		select: {
			id: true,
			name: true,
			discordParticipants: {
				select: {
					discordUserId: true,
				},
			},
		},
	});
	if (!event || event.discordParticipants.length <= 0) return;

	const permissionStrings = await prisma.permissionString.findMany({
		where: {
			OR: [
				{
					permissionString: "login;manage",
				},
				{
					permissionString: "event;read",
				},
			],
		},
		select: {
			roleId: true,
			permissionString: true,
		},
	});
	if (permissionStrings.length <= 0) return;

	const { loginManageRoleIds, eventReadRoleIds } = Object.groupBy(
		permissionStrings,
		(item) =>
			item.permissionString === "login;manage"
				? "loginManageRoleIds"
				: "eventReadRoleIds",
	);
	if (
		!loginManageRoleIds ||
		loginManageRoleIds.length <= 0 ||
		!eventReadRoleIds ||
		eventReadRoleIds.length <= 0
	)
		return;

	const citizensWithRoles = await prisma.entity.findMany({
		where: {
			discordId: {
				in: event.discordParticipants.map(
					(participant) => participant.discordUserId,
				),
			},
			roleAssignments: {
				some: {},
			},
		},
		select: {
			id: true,
			roleAssignments: {
				select: {
					roleId: true,
				},
			},
		},
	});
	const citizensWithMatchingRoles = citizensWithRoles.filter((citizen) => {
		const citizenRoleIds = citizen.roleAssignments.map((ra) => ra.roleId);
		const hasLoginManage = loginManageRoleIds.some((role) =>
			citizenRoleIds.includes(role.roleId),
		);
		const hasEventRead = eventReadRoleIds.some((role) =>
			citizenRoleIds.includes(role.roleId),
		);
		return hasLoginManage && hasEventRead;
	});
	if (citizensWithMatchingRoles.length === 0) return;

	return { event, participants: citizensWithMatchingRoles }
};
