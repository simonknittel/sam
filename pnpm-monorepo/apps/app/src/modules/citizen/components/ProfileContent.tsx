import Avatar from "@/modules/common/components/Avatar";
import { CopyToClipboard } from "@/modules/common/components/CopyToClipboard";
import { Link } from "@/modules/common/components/Link";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import { FaPiggyBank, FaSpaceShuttle } from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";
import type { CitizenProfile } from "../queries/getCitizenProfile";
import { formatBirthday } from "../utils/birthday";
import { LocalTime } from "./LocalTime";
import { ProfileAttribute } from "./ProfileAttribute";
import { ProfileMetric, ProfileMetricTone } from "./ProfileMetric";
import { AddRoles } from "./roles/AddRoles";

const AVATAR_SIZE = 64;

const getSilcTone = (balance: number) => {
  if (balance > 0) return ProfileMetricTone.Positive;
  if (balance < 0) return ProfileMetricTone.Negative;
  return ProfileMetricTone.Neutral;
};

const formatMonthlySalary = (monthlySalary: number) =>
  `${monthlySalary > 0 ? "+" : ""}${monthlySalary.toLocaleString("de-de")} monatlich`;

interface Props {
  readonly profile: CitizenProfile;
  /**
   * Called after a role assignment changed. The popover refetches its query
   * with it; the server-rendered tile does not need it, because the role
   * actions revalidate the page.
   */
  readonly onRoleAssignmentsChanged?: () => void;
}

/**
 * The profile of a citizen. Both surfaces which show a profile — the citizen
 * popover and the dashboard tile — render this component, so that they
 * cannot drift apart. Each surface adds its own chrome around it.
 */
export const ProfileContent = ({
  profile,
  onRoleAssignmentsChanged,
}: Props) => {
  const { citizen, metrics } = profile;
  const name = citizen.handle || citizen.id;
  const birthday =
    citizen.birthdayDay !== null && citizen.birthdayMonth !== null
      ? formatBirthday(citizen.birthdayDay, citizen.birthdayMonth)
      : null;
  const hasMetrics = Boolean(
    metrics.silc || metrics.penaltyPoints || metrics.fleet,
  );

  return (
    <>
      <div className="flex gap-4 items-center pb-2">
        <Avatar
          name={name}
          image={profile.avatarUrl}
          size={AVATAR_SIZE}
          className="flex-none"
        />

        <div className="min-w-0">
          <p className="opacity-50 font-mono uppercase text-xs">Citizen</p>

          <h2 className="font-mono uppercase text-lg font-bold flex items-center gap-2 min-w-0">
            {profile.isCurrentCitizen && (
              <span
                className="flex-none inline-block rounded-full size-3 bg-green-500 relative"
                title="Dies bist du"
              >
                <span className="absolute inline-block rounded-full size-3 bg-green-500 animate-ping motion-reduce:hidden" />
              </span>
            )}

            <span className="truncate" title={name}>
              {name}
            </span>

            <CopyToClipboard value={name} />
          </h2>

          {profile.spynetHref && (
            <Link
              href={profile.spynetHref}
              className="text-interaction-500 hover:underline focus-visible:underline font-mono uppercase text-xs"
              prefetch={false}
            >
              Spynet öffnen
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-700 pt-2">
        <div className="flex flex-wrap gap-1">
          {citizen.roleAssignments.map((roleAssignment) => (
            <SingleRoleBadge
              key={roleAssignment.roleId}
              roleId={roleAssignment.roleId}
              citizenId={citizen.id}
              citizenLevel={roleAssignment.currentLevel}
              onSuccess={onRoleAssignmentsChanged}
            />
          ))}
        </div>

        {profile.canUpdateAnyRoleAssignment && (
          <AddRoles
            citizenId={citizen.id}
            assignedRoleIds={citizen.roleAssignments.map(
              (roleAssignment) => roleAssignment.roleId,
            )}
            className="mt-1"
            onRequestClose={onRoleAssignmentsChanged}
          />
        )}
      </div>

      {hasMetrics && (
        <div className="border-t border-neutral-700 pt-2 mt-2 flex gap-1">
          {metrics.silc && (
            <ProfileMetric
              label="SILC"
              icon={<FaPiggyBank />}
              value={metrics.silc.balance}
              hint={
                metrics.silc.monthlySalary === 0
                  ? undefined
                  : formatMonthlySalary(metrics.silc.monthlySalary)
              }
              tone={getSilcTone(metrics.silc.balance)}
              href={metrics.silc.href}
            />
          )}

          {metrics.penaltyPoints && (
            <ProfileMetric
              label="Strafpunkte"
              icon={<FaScaleBalanced />}
              value={metrics.penaltyPoints.value}
              tone={
                metrics.penaltyPoints.value > 0
                  ? ProfileMetricTone.Negative
                  : ProfileMetricTone.Neutral
              }
              href={metrics.penaltyPoints.href}
            />
          )}

          {metrics.fleet && (
            <ProfileMetric
              label="Flotte"
              icon={<FaSpaceShuttle />}
              value={metrics.fleet.count}
              href={metrics.fleet.href}
            />
          )}
        </div>
      )}

      {(citizen.timezone || birthday) && (
        <dl className="border-t border-neutral-700 pt-2 mt-2 flex flex-col gap-1 text-sm">
          {citizen.timezone && (
            <ProfileAttribute name="Zeitzone">
              <span className="truncate" title={citizen.timezone}>
                {citizen.timezone}
              </span>

              <LocalTime timezone={citizen.timezone} />
            </ProfileAttribute>
          )}

          {birthday && (
            <ProfileAttribute name="Geburtstag">{birthday}</ProfileAttribute>
          )}
        </dl>
      )}

      {/* TODO: Show active organization memberships */}
    </>
  );
};
