import { prisma } from "@sam-monorepo/database";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../../test/database";
import {
  createCitizenWithInheritedPermissions,
  createCitizenWithLeveledRole,
  MAXIMUM_LEVEL,
} from "../../common/effectivePermissions.fixtures";
import { publishNotifications } from "../publish";
import { SilcTransactionsCreatedHandler } from "./SilcTransactionsCreated";

vi.mock("../publish", () => ({ publishNotifications: vi.fn() }));

const PERMISSION_STRINGS = [
  "login;manage",
  "silcTransactionOfCurrentCitizen;read",
];

const createTransaction = (receiverId: string) =>
  prisma.silcTransaction.create({
    data: { receiverId, value: 100, description: "Test" },
  });

beforeEach(async () => {
  await truncateAllTables();
  vi.mocked(publishNotifications).mockClear();
});

describe("SilcTransactionsCreatedHandler", () => {
  test("notifies a citizen with the permissions only through an inherited role", async () => {
    const citizen = await createCitizenWithInheritedPermissions(
      "inherited",
      PERMISSION_STRINGS,
    );
    const transaction = await createTransaction(citizen.id);

    await SilcTransactionsCreatedHandler({ transactionIds: [transaction.id] });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({
        receiverId: citizen.id,
        notificationType: "silc_transaction_created",
      }),
    ]);
  });

  test("notifies only the receiver at the maximum level of the role", async () => {
    const atMaximumLevel = await createCitizenWithLeveledRole(
      "at-maximum-level",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL,
    );
    const belowMaximumLevel = await createCitizenWithLeveledRole(
      "below-maximum-level",
      PERMISSION_STRINGS,
      MAXIMUM_LEVEL - 1,
    );
    const transactions = await Promise.all([
      createTransaction(atMaximumLevel.id),
      createTransaction(belowMaximumLevel.id),
    ]);

    await SilcTransactionsCreatedHandler({
      transactionIds: transactions.map((transaction) => transaction.id),
    });

    expect(publishNotifications).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ receiverId: atMaximumLevel.id }),
    ]);
  });
});
