import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { countOwnerShips } from "@/modules/fleet/queries/ownerFleet";
import { sumPenaltyPointsOfCitizen } from "@/modules/penalty-points/queries/sumPenaltyPointsOfCitizen";
import { getAssignableRoles } from "@/modules/roles/utils/getRoles";
import { getMonthlySalaryOfRoles } from "@/modules/silc/queries/getMonthlySalaryOfRoles";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { cache } from "react";

/**
 * The avatar of a citizen is the Discord avatar of the user behind it, which
 * the app refreshes at every login.
 */
const getAvatarUrl = async (discordId: Entity["discordId"]) => {
  if (!discordId) return null;

  const account = await prisma.account.findFirst({
    where: {
      provider: "discord",
      providerAccountId: discordId,
    },
    select: {
      user: {
        select: {
          image: true,
        },
      },
    },
  });

  return account?.user.image ?? null;
};

/**
 * Everything both profile surfaces show: the citizen popover and the profile
 * tile of the dashboard. The metrics are per-metric optional — a metric the
 * viewer must not see is `null` instead of a number, so that the surfaces do
 * not show a zero which is only a missing permission.
 *
 * The permission for each metric depends on whether the viewer looks at
 * their own citizen or at a different one. Reading the own profile needs no
 * `citizen;read`, because the dashboard tile shows it to every citizen.
 */
export const getCitizenProfile = cache(
  withTrace("getCitizenProfile", async (id: Entity["id"]) => {
    const authentication = await requireAuthentication();

    const isCurrentCitizen = authentication.session.entity?.id === id;
    const canOpenSpynet = await authentication.authorize("citizen", "read");
    if (!isCurrentCitizen && !canOpenSpynet) throw new Error("Forbidden");

    const citizen = await prisma.entity.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        handle: true,
        discordId: true,
        silcBalance: true,
        timezone: true,
        birthdayDay: true,
        birthdayMonth: true,
        roleAssignments: {
          select: {
            roleId: true,
            citizenId: true,
            currentLevel: true,
          },
        },
      },
    });

    if (!citizen) return null;

    const [
      canReadSilcBalance,
      canReadPenaltyPoints,
      canReadShips,
      assignableRoles,
      avatarUrl,
    ] = await Promise.all([
      authentication.authorize(
        isCurrentCitizen
          ? "silcBalanceOfCurrentCitizen"
          : "silcBalanceOfOtherCitizen",
        "read",
      ),
      authentication.authorize(
        isCurrentCitizen ? "ownPenaltyEntry" : "penaltyEntry",
        "read",
      ),
      authentication.authorize(
        isCurrentCitizen ? "ship" : "otherShips",
        "read",
      ),
      getAssignableRoles(),
      getAvatarUrl(citizen.discordId),
    ]);

    const [monthlySalary, penaltyPoints, fleetCount] = await Promise.all([
      canReadSilcBalance
        ? getMonthlySalaryOfRoles(
            citizen.roleAssignments.map((assignment) => assignment.roleId),
          )
        : null,
      canReadPenaltyPoints ? sumPenaltyPointsOfCitizen(citizen.id) : null,
      canReadShips ? countOwnerShips(citizen.id) : null,
    ]);

    return {
      citizen: {
        id: citizen.id,
        handle: citizen.handle,
        timezone: citizen.timezone,
        birthdayDay: citizen.birthdayDay,
        birthdayMonth: citizen.birthdayMonth,
        roleAssignments: citizen.roleAssignments,
      },
      avatarUrl,
      isCurrentCitizen,
      canOpenSpynet,
      canUpdateAnyRoleAssignment: assignableRoles.length > 0,
      metrics: {
        silc: canReadSilcBalance
          ? { balance: citizen.silcBalance, monthlySalary: monthlySalary ?? 0 }
          : null,
        penaltyPoints,
        fleetCount,
      },
    };
  }),
);

export type CitizenProfile = NonNullable<
  Awaited<ReturnType<typeof getCitizenProfile>>
>;
