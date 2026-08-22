import type { Prisma } from "@sam-monorepo/database/client";
import { describe, expect, test } from "vitest";
import { clonePositions } from "./clonePositions";
import { toTemplateContainer } from "./eventContainer";

interface CreatedPosition {
  readonly id: string;
  readonly eventId: string | null;
  readonly templateId: string | null;
  readonly parentPositionId: string | null;
  readonly name: string;
  readonly order: number;
}

/**
 * Records what `clonePositions` would write. Only `eventPosition.create` is
 * exercised, so the rest of the client is deliberately absent.
 */
const createRecordingTransaction = () => {
  const created: CreatedPosition[] = [];

  const transaction = {
    eventPosition: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const id = `new-${created.length}`;
        created.push({
          id,
          eventId: (data.eventId as string | null) ?? null,
          templateId: (data.templateId as string | null) ?? null,
          parentPositionId: (data.parentPositionId as string | null) ?? null,
          name: data.name as string,
          order: data.order as number,
        });
        return Promise.resolve({ id });
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { transaction, created };
};

interface SourcePosition {
  id: string;
  name: string;
  description: null;
  fontSize: null;
  backgroundColor: null;
  textColor: null;
  requiredRoles: never[];
  requiredVariants: never[];
  childPositions: SourcePosition[];
}

const position = (
  id: string,
  name: string,
  childPositions: SourcePosition[] = [],
): SourcePosition => ({
  id,
  name,
  description: null,
  fontSize: null,
  backgroundColor: null,
  textColor: null,
  requiredRoles: [],
  requiredVariants: [],
  childPositions,
});

describe("clone positions", () => {
  test("returns the new id of every source position, nested ones included", async () => {
    const { transaction, created } = createRecordingTransaction();

    const idMap = await clonePositions(
      transaction,
      [
        position("source-a", "Alpha", [
          position("source-a1", "Alpha 1"),
          position("source-a2", "Alpha 2", [position("source-a2x", "Deep")]),
        ]),
        position("source-b", "Bravo"),
      ],
      {
        container: toTemplateContainer("template-1"),
        parentPositionId: null,
        startOrder: 3,
      },
    );

    expect([...idMap.keys()]).toEqual([
      "source-a",
      "source-a1",
      "source-a2",
      "source-a2x",
      "source-b",
    ]);
    expect(new Set(idMap.values()).size).toBe(5);
    expect(created).toHaveLength(5);
  });

  test("writes every copy into the target container", async () => {
    const { transaction, created } = createRecordingTransaction();

    await clonePositions(
      transaction,
      [position("source-a", "Alpha", [position("source-a1", "Alpha 1")])],
      {
        container: toTemplateContainer("template-1"),
        parentPositionId: null,
        startOrder: 0,
      },
    );

    expect(
      created.every(
        (entry) => entry.templateId === "template-1" && entry.eventId === null,
      ),
    ).toBe(true);
  });

  test("re-parents children onto their copied parent and restarts their order", async () => {
    const { transaction, created } = createRecordingTransaction();

    const idMap = await clonePositions(
      transaction,
      [
        position("source-a", "Alpha", [
          position("source-a1", "Alpha 1"),
          position("source-a2", "Alpha 2"),
        ]),
      ],
      {
        container: toTemplateContainer("template-1"),
        parentPositionId: "existing-parent",
        startOrder: 5,
      },
    );

    const copiedRoot = created.find((entry) => entry.name === "Alpha")!;
    expect(copiedRoot.parentPositionId).toBe("existing-parent");
    expect(copiedRoot.order).toBe(5);

    const children = created.filter((entry) => entry.name.startsWith("Alpha "));
    expect(children.map((entry) => entry.parentPositionId)).toEqual([
      idMap.get("source-a"),
      idMap.get("source-a"),
    ]);
    expect(children.map((entry) => entry.order)).toEqual([0, 1]);
  });
});
