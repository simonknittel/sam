import { calculateSilcBalances } from "@sam-monorepo/domain";
import { describe, expect, test, vi } from "vitest";
import { updateCitizensSilcBalances } from "./updateCitizensSilcBalances";

interface Transaction {
  readonly receiverId: string;
  readonly value: number;
  readonly deletedAt: Date | null;
}

interface GroupByArguments {
  readonly where: {
    readonly deletedAt: null;
    readonly receiverId: { readonly in: string[] };
    readonly value: { readonly gt?: number; readonly lte?: number };
  };
}

const TRANSACTIONS: Transaction[] = [
  { receiverId: "alice", value: 100, deletedAt: null },
  { receiverId: "alice", value: 50, deletedAt: null },
  { receiverId: "alice", value: -30, deletedAt: null },
  { receiverId: "alice", value: 0, deletedAt: null },
  { receiverId: "alice", value: 1000, deletedAt: new Date() },
  { receiverId: "bob", value: -20, deletedAt: null },
  { receiverId: "dave", value: 500, deletedAt: null },
];

/** Applies the filters and the sum of the SQL query to `TRANSACTIONS` */
const groupBy = ({ where }: GroupByArguments) => {
  const matchingTransactions = TRANSACTIONS.filter(
    (transaction) =>
      transaction.deletedAt === where.deletedAt &&
      where.receiverId.in.includes(transaction.receiverId) &&
      (where.value.gt === undefined || transaction.value > where.value.gt) &&
      (where.value.lte === undefined || transaction.value <= where.value.lte),
  );

  return [
    ...Map.groupBy(
      matchingTransactions,
      (transaction) => transaction.receiverId,
    ),
  ].map(([receiverId, transactions]) => ({
    receiverId,
    _sum: {
      value: transactions.reduce((sum, { value }) => sum + value, 0),
    },
  }));
};

const { updateEntity } = vi.hoisted(() => ({ updateEntity: vi.fn() }));

vi.mock("@/db", () => ({
  prisma: {
    silcTransaction: {
      groupBy: (groupByArguments: GroupByArguments) =>
        groupBy(groupByArguments),
    },
    entity: { update: updateEntity },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("update citizens SILC balances", () => {
  test("writes the same balances as a replay of the single transactions", async () => {
    const citizenIds = ["alice", "bob", "carol"];

    await updateCitizensSilcBalances(citizenIds);

    const replayedBalances = calculateSilcBalances(
      citizenIds,
      TRANSACTIONS.filter((transaction) => transaction.deletedAt === null),
    );
    expect(updateEntity.mock.calls).toEqual(
      [...replayedBalances].map(([id, { balance, totalEarned }]) => [
        {
          where: { id },
          data: { silcBalance: balance, totalEarnedSilc: totalEarned },
        },
      ]),
    );
    expect(updateEntity).toHaveBeenCalledWith({
      where: { id: "alice" },
      data: { silcBalance: 120, totalEarnedSilc: 150 },
    });
  });
});
