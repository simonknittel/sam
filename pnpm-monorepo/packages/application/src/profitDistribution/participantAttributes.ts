import type { PrismaClientType } from "@sam-monorepo/database";
import type {
  Prisma,
  ProfitDistributionCycleParticipant,
} from "@sam-monorepo/database/client";

/**
 * The values are also the attributes in the audit events and in the
 * notifications
 */
export enum ParticipantAttribute {
  Ceded = "ceded",
  Accepted = "accepted",
  Disbursed = "disbursed",
}

export const getAttributeColumns = (attribute: ParticipantAttribute) => {
  switch (attribute) {
    case ParticipantAttribute.Ceded:
      return { changedAt: "cededAt", changedById: "cededById" } as const;

    case ParticipantAttribute.Accepted:
      return { changedAt: "acceptedAt", changedById: "acceptedById" } as const;

    case ParticipantAttribute.Disbursed:
      return {
        changedAt: "disbursedAt",
        changedById: "disbursedById",
      } as const;

    default:
      throw new Error(
        `Unknown participant attribute: ${attribute satisfies never}`,
      );
  }
};

type AttributeColumns = ReturnType<typeof getAttributeColumns>;

type ParticipantAttributeData = Partial<
  Record<AttributeColumns["changedAt"], Date | null> &
    Record<AttributeColumns["changedById"], string>
>;

export const getAttributeData = (
  attribute: ParticipantAttribute,
  enabled: boolean,
  changedById: string,
  now: Date,
): ParticipantAttributeData => {
  const columns = getAttributeColumns(attribute);

  return {
    [columns.changedAt]: enabled ? now : null,
    [columns.changedById]: changedById,
  };
};

/**
 * Not `async`: it gives the `PrismaPromise`, thus a batch `$transaction([...])`
 * accepts it
 */
export const upsertParticipant = (
  prisma: Pick<PrismaClientType, "profitDistributionCycleParticipant">,
  cycleId: string,
  citizenId: string,
  data: ParticipantAttributeData,
): Prisma.PrismaPromise<ProfitDistributionCycleParticipant> =>
  prisma.profitDistributionCycleParticipant.upsert({
    where: { cycleId_citizenId: { cycleId, citizenId } },
    update: data,
    create: { cycleId, citizenId, ...data },
  });
