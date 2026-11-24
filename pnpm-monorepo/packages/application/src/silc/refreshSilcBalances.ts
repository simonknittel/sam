import { AuditEventType, updateSilcBalances } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

export interface RefreshSilcBalancesOutput {
  readonly citizen_count: number;
}

/** Also for the deleted citizens */
export const refreshSilcBalances = (
  context: ApplicationContext,
  actor: Actor,
): Promise<RefreshSilcBalancesOutput> =>
  withSpan(context, "refreshSilcBalances", async () => {
    requirePermission(actor, "silcBalanceOfOtherCitizen", "manage");

    const citizens = await context.prisma.citizen.findMany({
      select: { id: true },
    });
    await context.prisma.$transaction((transaction) =>
      updateSilcBalances(
        transaction,
        citizens.map((citizen) => citizen.id),
      ),
    );

    await context.audit.create([
      {
        type: AuditEventType.SILC_BALANCES_REFRESHED,
        data: { citizenCount: citizens.length },
        createdById: actor.userId,
      },
    ]);

    return { citizen_count: citizens.length };
  });
