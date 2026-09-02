import { prisma } from "@/db";
import { requireAuthentication } from "@/modules/auth/server";
import { countOwnerShips } from "@/modules/fleet/queries/ownerFleet";
import { sumPenaltyPointsOfCitizen } from "@/modules/penalty-points/queries/sumPenaltyPointsOfCitizen";
import { getAssignableRoles } from "@/modules/roles/utils/getRoles";
import { getMonthlySalaryOfRoles } from "@/modules/silc/queries/getMonthlySalaryOfRoles";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Entity } from "@sam-monorepo/database/client";
import { cache } from "react";
import { hasBirthdayToday } from "../utils/hasBirthdayToday";

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
 *
 * A metric also carries the Spynet page behind it, but only when the viewer
 * can open that page. Each of these pages asks for its own permission, which
 * is not always the one that shows the metric — a link the viewer cannot
 * follow is worse than no link.
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
        /** Read for the party hat below; only the answer leaves the server */
        birthdayDay: true,
        birthdayMonth: true,
        roleAssignments: {
          select: {
            roleId: true,
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
      canOpenSilcPage,
      canOpenFleetPage,
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
      authentication.authorize(
        isCurrentCitizen
          ? "silcTransactionOfCurrentCitizen"
          : "silcTransactionOfOtherCitizen",
        "read",
      ),
      /** The fleet page asks for `otherShips;read`, also for the own fleet */
      authentication.authorize("otherShips", "read"),
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

    const spynetHref = `/app/spynet/citizen/${citizen.id}`;
    const buildMetricHref = (canOpenPage: boolean, subPage: string) =>
      canOpenSpynet && canOpenPage ? `${spynetHref}/${subPage}` : null;

    return {
      citizen: {
        id: citizen.id,
        handle: citizen.handle,
        timezone: citizen.timezone,
        hasBirthdayToday: hasBirthdayToday(citizen, new Date()),
        roleAssignments: citizen.roleAssignments,
      },
      avatarUrl,
      isCurrentCitizen,
      spynetHref: canOpenSpynet ? spynetHref : null,
      canUpdateAnyRoleAssignment: assignableRoles.length > 0,
      metrics: {
        silc: canReadSilcBalance
          ? {
              balance: citizen.silcBalance,
              monthlySalary: monthlySalary ?? 0,
              href: buildMetricHref(canOpenSilcPage, "silc"),
            }
          : null,
        penaltyPoints:
          penaltyPoints === null
            ? null
            : {
                value: penaltyPoints,
                href: buildMetricHref(canReadPenaltyPoints, "penalty-points"),
              },
        fleet:
          fleetCount === null
            ? null
            : {
                count: fleetCount,
                href: buildMetricHref(canOpenFleetPage, "fleet"),
              },
      },
    };
  }),
);

export type CitizenProfile = NonNullable<
  Awaited<ReturnType<typeof getCitizenProfile>>
>;
