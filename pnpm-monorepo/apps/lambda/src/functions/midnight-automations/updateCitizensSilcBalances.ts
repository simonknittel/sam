import { prisma, type Entity } from "@sam-monorepo/database";
import { getSilcTransactionsOfAllCitizensWithoutAuthorization } from "./getSilcTransactionsOfAllCitizensWithoutAuthorization";
import { captureAsyncFunc } from "../../common/xray";

export const updateCitizensSilcBalances = async (
	citizenIds: Entity["id"][],
) => {
	return captureAsyncFunc("updateCitizensSilcBalances", async () => {
		if (citizenIds.length <= 0) return;

		const _transactions =
			await getSilcTransactionsOfAllCitizensWithoutAuthorization();
		const transactions = _transactions.filter((transaction) =>
			citizenIds.includes(transaction.receiverId),
		);

		const silcBalancePerCitizen = new Map<
			string,
			{ balance: number; totalEarned: number }
		>(citizenIds.map((citizenId) => [citizenId, { balance: 0, totalEarned: 0 }]));

		for (const transaction of transactions) {
			const { receiverId, value } = transaction;

			const balance = silcBalancePerCitizen.get(receiverId)!.balance;
			const totalEarned = silcBalancePerCitizen.get(receiverId)!.totalEarned;

			silcBalancePerCitizen.set(receiverId, {
				balance: balance + value,
				totalEarned: value > 0 ? totalEarned + value : totalEarned,
			});
		}

		for (const [receiverId, { balance, totalEarned }] of silcBalancePerCitizen) {
			await prisma.entity.update({
				where: {
					id: receiverId,
				},
				data: {
					silcBalance: balance,
					totalEarnedSilc: totalEarned,
				},
			});
		}
	});
};
