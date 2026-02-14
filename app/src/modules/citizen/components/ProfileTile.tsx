import { requireAuthentication } from "@/modules/auth/server";
import Avatar from "@/modules/common/components/Avatar";
import { Link } from "@/modules/common/components/Link";
import { getPenaltyEntriesOfCurrentUser } from "@/modules/penalty-points/queries";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { getMyAssignedRoles } from "@/modules/roles/utils/getRoles";
import {
  getMonthlySalaryOfCurrentCitizen,
  getSilcBalanceOfCurrentCitizen,
} from "@/modules/silc/queries";
import clsx from "clsx";
import { forbidden } from "next/navigation";
import { FaExternalLinkAlt, FaPiggyBank } from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";

interface Props {
  readonly className?: string;
}

export const ProfileTile = async ({ className }: Props) => {
  const authentication = await requireAuthentication();
  if (!authentication.session.entity) forbidden();

  const name =
    authentication.session.user.name || authentication.session.discordId;
  const image = authentication.session.user.image;
  const roles = await getMyAssignedRoles();

  const [showSpynetLink, showPenaltyPoints, showSilcBalance] =
    await Promise.all([
      authentication.authorize("citizen", "read"),
      authentication.authorize("ownPenaltyEntry", "read"),
      authentication.authorize("silcBalanceOfCurrentCitizen", "read"),
    ]);

  const [silcBalance, monthlySalary] = showSilcBalance
    ? await Promise.all([
        getSilcBalanceOfCurrentCitizen(),
        getMonthlySalaryOfCurrentCitizen(),
      ])
    : [undefined, undefined];
  const penaltyPoints = showPenaltyPoints
    ? (await getPenaltyEntriesOfCurrentUser()).reduce(
        (previous, current) => (previous += current.points),
        0,
      )
    : undefined;

  return (
    <div className="flex flex-col gap-[2px] items-center">
      <section
        className={clsx(
          className,
          "rounded-primary p-4 background-secondary flex flex-col gap-4 items-center w-full",
        )}
      >
        <Avatar name={name} image={image} size={128} />

        <h2 className="font-thin">{name}</h2>

        {roles.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-center">
            {roles.map((role) => (
              <SingleRoleBadge
                key={role.id}
                roleId={role.id}
                citizenId={authentication.session.entity?.id}
              />
            ))}
          </div>
        )}
      </section>

      {(showSilcBalance || showPenaltyPoints) && (
        <div className="flex gap-[2px] w-full">
          {showSilcBalance && (
            <Link
              href={`/app/spynet/citizen/${authentication.session.entity.id}/silc`}
              title="Übersicht öffnen"
              className="flex-initial w-1/2 rounded-primary background-secondary hover:bg-neutral-600/50 focus-visible:bg-neutral-600/50 flex flex-col justify-center items-center p-4"
            >
              <span
                className={clsx("font-black text-4xl", {
                  "text-green-500": silcBalance && silcBalance > 0,
                  "text-red-500": silcBalance && silcBalance < 0,
                })}
              >
                {silcBalance}
              </span>

              {monthlySalary ? (
                <p className="text-neutral-500 text-xs">
                  {monthlySalary >= 0 ? "+" : "-"}
                  {monthlySalary} monatlich
                </p>
              ) : null}

              <p className="text-neutral-500 flex gap-2 items-center">
                <FaPiggyBank className="text-neutral-500" />
                SILC
              </p>
            </Link>
          )}

          {showPenaltyPoints && (
            <Link
              href={`/app/spynet/citizen/${authentication.session.entity.id}/penalty-points`}
              title="Übersicht öffnen"
              className="flex-initial w-1/2 rounded-primary background-secondary hover:bg-neutral-600/50 focus-visible:bg-neutral-600/50 flex flex-col justify-center items-center p-4"
            >
              <span
                className={clsx("font-black text-4xl", {
                  "text-red-500": penaltyPoints && penaltyPoints > 0,
                })}
              >
                {penaltyPoints}
              </span>
              <p className="text-neutral-500 flex gap-2 items-center">
                <FaScaleBalanced className="text-neutral-500" />
                Strafpunkte
              </p>
            </Link>
          )}
        </div>
      )}

      {showSpynetLink && (
        <Link
          href={`/app/spynet/citizen/${authentication.session.entity.id}`}
          className="text-interaction-500 hover:text-interaction-300 flex gap-2 items-center"
        >
          Vollständiges Profil
          <FaExternalLinkAlt />
        </Link>
      )}
    </div>
  );
};
