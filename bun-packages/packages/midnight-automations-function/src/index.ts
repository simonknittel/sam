import type { ScheduledHandler } from "aws-lambda";
import { prisma } from "./db";
import { log } from "./logging";

export const handler: ScheduledHandler = async () => {
	try {
		const citizenWithRoles = await prisma.entity.findMany({
			where: {
				roles: {
					not: null,
				},
			},
			select: {
				id: true,
				discordId: true,
				roles: true,
			},
		});

		const accounts = await prisma.account.findMany({
			where: {
				provider: "discord",
				providerAccountId: {
					in: citizenWithRoles.map((citizen) => citizen.discordId),
				},
			},
			select: {
				id: true,
				providerAccountId: true,
				user: {
					select: {
						lastSeenAt: true,
					},
				},
			},
		});

		const rolesWithMaxAge = await prisma.role.findMany({
			where: {
				maxAgeDays: {
					not: null,
				},
			},
			select: {
				id: true,
				maxAgeDays: true,
			},
		});

		const expirationMap = new Map<string, Date>();
		for (const role of rolesWithMaxAge) {
			const date = new Date();
			date.setDate(date.getDate() - role.maxAgeDays);
			expirationMap.set(role.id, date);
		}

		const changes = [];
		for (const citizenWithRole of citizenWithRoles) {
			const citizenRoles = citizenWithRole.roles?.split(",");
			if (!citizenRoles) continue;

			const account = accounts.find(
				(account) => account.providerAccountId === citizenWithRole.discordId,
			);

			for (const citizenRole of citizenRoles) {
				const roleExpirationDate = expirationMap.get(citizenRole);
				if (!roleExpirationDate) continue;

				if (
					!account?.user?.lastSeenAt ||
					account.user.lastSeenAt < roleExpirationDate
				) {
					changes.push({
						citizenId: citizenWithRole.id,
						roleId: citizenRole,
					});
				}
			}
		}

		await prisma.$transaction([
			prisma.entityLog.createMany({
				data: changes.map((change) => ({
					type: "role-removed",
					content: change.roleId,
					entityId: change.citizenId,
					attributes: {
						create: {
							data: {
								key: "confirmed",
								value: "confirmed",
							},
						},
					},
				})),
			}),

			...changes.map((change) => {
				const roles =
					citizenWithRoles
						.find((citizen) => citizen.id === change.citizenId)!
						.roles!.split(",")
						.filter((roleId) => roleId !== change.roleId)
						.join(",") || null;

				return prisma.entity.update({
					where: { id: change.citizenId },
					data: {
						roles: {
							set: roles,
						},
					},
				});
			}),
		]);
	} catch (error) {
		log.error("Failed to run midnight automations", error);
		throw error;
	}
};
