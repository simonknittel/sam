import { prisma, type SilcTransaction } from "@sam-monorepo/database";
import { publishWebPushNotifications } from "../web-push";

interface Payload {
  transactionIds: SilcTransaction["id"][];
}

export const SilcTransactionsCreatedHandler = async (payload: Payload) => {
  /**
   * Calculate recipients
   */
  const transactions = await prisma.silcTransaction.findMany({
    where: {
      id: {
        in: payload.transactionIds,
      },
    },
    select: {
      id: true,
      receiverId: true,
      value: true,
      description: true,
    },
  });
  if (transactions.length <= 0) return;

  const permissionStrings = await prisma.permissionString.findMany({
    where: {
      OR: [
        {
          permissionString: "login;manage",
        },
        {
          permissionString: "silcTransactionOfCurrentCitizen;read",
        },
      ],
    },
    select: {
      roleId: true,
      permissionString: true,
    },
  });
  if (permissionStrings.length <= 0) return;

  const { loginManageRoleIds, silcTransactionsOfCurrentCitizenReadRoleIds } =
    Object.groupBy(permissionStrings, (item) =>
      item.permissionString === "login;manage"
        ? "loginManageRoleIds"
        : "silcTransactionsOfCurrentCitizenReadRoleIds",
    );
  if (
    !loginManageRoleIds ||
    loginManageRoleIds.length <= 0 ||
    !silcTransactionsOfCurrentCitizenReadRoleIds ||
    silcTransactionsOfCurrentCitizenReadRoleIds.length <= 0
  )
    return;

  const citizensWithRoles = await prisma.entity.findMany({
    where: {
      id: {
        in: transactions.map((transaction) => transaction.receiverId),
      },
      roles: {
        not: null,
      },
    },
    select: {
      id: true,
      roles: true,
    },
  });
  const citizensWithMatchingRoles = citizensWithRoles.filter((citizen) => {
    const citizenRoleIds = citizen.roles!.split(",");
    const hasLoginManage = loginManageRoleIds.some((role) =>
      citizenRoleIds.includes(role.roleId),
    );
    const hasSilcTransactionsOfCurrentCitizenRead =
      silcTransactionsOfCurrentCitizenReadRoleIds.some((role) =>
        citizenRoleIds.includes(role.roleId),
      );
    return hasLoginManage && hasSilcTransactionsOfCurrentCitizenRead;
  });
  if (citizensWithMatchingRoles.length === 0) return;

  /**
   * Publish notifications
   */
  await publishWebPushNotifications(
    transactions
      .filter((transaction) =>
        citizensWithMatchingRoles.some(
          (citizen) => citizen.id === transaction.receiverId,
        ),
      )
      .map((transaction) => ({
        receiverId: transaction.receiverId,
        notificationType: "silc_transaction_created",
        title: "SILC-Transaktion erhalten",
        body: `${transaction.value >= 0 ? "+" : "-"}${Math.abs(transaction.value).toLocaleString("de")} SILC - ${transaction.description}`,
      })),
  );
};
