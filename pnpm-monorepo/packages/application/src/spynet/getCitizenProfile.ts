import { ACTIVE_CITIZEN_WHERE } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { canChangeRoleAssignment } from "../roles/roleAssignmentPermissions.js";
import { loadVisibleRoleIds } from "../roles/roleVisibility.js";
import { getMonthlySalaryOfRoles } from "../silc/monthlySalaryOfRoles.js";
import { withSpan } from "../withSpan.js";
import { hasBirthdayTodaySafely } from "./birthdays.js";
import { requireCitizenReadAccess } from "./citizenAccess.js";
import { CitizenErrorMessage } from "./citizenErrors.js";
import {
  getVisiblePenaltyPointSum,
  getVisibleShipCount,
} from "./citizenMetrics.js";

export const getCitizenProfileInputSchema = z.object({
  citizen_id: idSchema,
});

export type GetCitizenProfileInput = z.infer<
  typeof getCitizenProfileInputSchema
>;

/** A metric of the profile with the Spynet page behind it */
interface ProfileMetricLink {
  /** A path of the app. Null when the actor cannot open the page. */
  readonly href: string | null;
}

/**
 * Everything the profile surfaces of the app show: the citizen popover, the
 * account popover and the profile tile of the dashboard. Only the app uses
 * it, thus the keys are camelCase.
 */
export interface CitizenProfile {
  readonly citizen: {
    readonly id: string;
    readonly handle: string | null;
    readonly timezone: string | null;
    /** Only the answer leaves the server, not the birthday */
    readonly hasBirthdayToday: boolean;
    readonly roleAssignments: {
      readonly roleId: string;
      readonly currentLevel: number | null;
    }[];
  };
  /**
   * The avatar of a citizen is the Discord avatar of its login, which the
   * app refreshes at each sign-in
   */
  readonly avatarUrl: string | null;
  readonly isCurrentCitizen: boolean;
  /** A path of the app. Null when the actor cannot open the Spynet. */
  readonly spynetHref: string | null;
  /** The actor can give or take away at least one visible role */
  readonly canUpdateAnyRoleAssignment: boolean;
  /**
   * A metric that the actor must not see is null instead of a number, thus
   * the surfaces do not show a zero which is only a missing permission
   */
  readonly metrics: {
    readonly silc:
      | (ProfileMetricLink & {
          readonly balance: number;
          readonly monthlySalary: number;
        })
      | null;
    readonly penaltyPoints:
      (ProfileMetricLink & { readonly value: number }) | null;
    readonly fleet: (ProfileMetricLink & { readonly count: number }) | null;
  };
}

/**
 * The profile of a citizen for the popovers and the dashboard tile. The
 * permission for each metric depends on whether the actor looks at the own
 * citizen or at a different one. The own profile needs no `citizen;read`,
 * because the dashboard tile and the account popover show it to each
 * citizen.
 *
 * A metric also carries the Spynet page behind it, but only when the actor
 * can open that page. Each of these pages asks for its own permission, which
 * is not always the one that shows the metric: a link that the actor cannot
 * follow is worse than no link.
 *
 * @throws NotFoundError when the citizen does not exist or is deleted
 */
export const getCitizenProfile = (
  context: ApplicationContext,
  actor: Actor,
  input: GetCitizenProfileInput,
): Promise<CitizenProfile> =>
  withSpan(context, "getCitizenProfile", async () => {
    requireCitizenReadAccess(actor, input.citizen_id);

    const isCurrentCitizen = actor.citizen?.id === input.citizen_id;
    const canOpenSpynet = actor.authorize("citizen", "read");

    const citizen = await context.prisma.citizen.findFirst({
      where: { id: input.citizen_id, ...ACTIVE_CITIZEN_WHERE },
      select: {
        id: true,
        handle: true,
        silcBalance: true,
        timezone: true,
        birthdayDay: true,
        birthdayMonth: true,
        roleAssignments: { select: { roleId: true, currentLevel: true } },
        user: { select: { image: true } },
      },
    });
    if (!citizen) throw new NotFoundError(CitizenErrorMessage.NotFound);

    const canReadSilcBalance = actor.authorize(
      isCurrentCitizen
        ? "silcBalanceOfCurrentCitizen"
        : "silcBalanceOfOtherCitizen",
      "read",
    );
    const canOpenSilcPage = actor.authorize(
      isCurrentCitizen
        ? "silcTransactionOfCurrentCitizen"
        : "silcTransactionOfOtherCitizen",
      "read",
    );
    /** The fleet page asks for `otherShips;read`, also for the own fleet */
    const canOpenFleetPage = actor.authorize("otherShips", "read");

    const [visibleRoleIds, monthlySalary, penaltyPoints, fleetCount] =
      await Promise.all([
        loadVisibleRoleIds(context, actor),
        canReadSilcBalance
          ? getMonthlySalaryOfRoles(context, citizen.roleAssignments)
          : null,
        getVisiblePenaltyPointSum(context, actor, citizen.id),
        getVisibleShipCount(context, actor, citizen.id),
      ]);

    const spynetHref = `/app/spynet/citizen/${citizen.id}`;
    const buildMetricHref = (canOpenPage: boolean, subPage: string) =>
      canOpenSpynet && canOpenPage ? `${spynetHref}/${subPage}` : null;

    return {
      citizen: {
        id: citizen.id,
        handle: citizen.handle,
        timezone: citizen.timezone,
        hasBirthdayToday: hasBirthdayTodaySafely(
          context,
          citizen,
          context.now(),
        ),
        roleAssignments: citizen.roleAssignments.map((roleAssignment) => ({
          roleId: roleAssignment.roleId,
          currentLevel: roleAssignment.currentLevel,
        })),
      },
      avatarUrl: citizen.user?.image ?? null,
      isCurrentCitizen,
      spynetHref: canOpenSpynet ? spynetHref : null,
      canUpdateAnyRoleAssignment: visibleRoleIds.some((roleId) =>
        canChangeRoleAssignment(actor, roleId),
      ),
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
                /**
                 * The penalty points page asks for the same permission as
                 * the metric
                 */
                href: buildMetricHref(true, "penalty-points"),
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
  });
