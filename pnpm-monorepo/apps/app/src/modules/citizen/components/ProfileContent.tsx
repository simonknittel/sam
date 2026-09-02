import Avatar, { AvatarDecoration } from "@/modules/common/components/Avatar";
import { BirthdayHat } from "@/modules/common/components/BirthdayHat";
import { ConfettiCanvas } from "@/modules/common/components/ConfettiCanvas";
import { CopyToClipboard } from "@/modules/common/components/CopyToClipboard";
import { Link } from "@/modules/common/components/Link";
import { SingleRoleBadge } from "@/modules/roles/components/SingleRoleBadge";
import clsx from "clsx";
import { FaPiggyBank, FaSpaceShuttle } from "react-icons/fa";
import { FaScaleBalanced } from "react-icons/fa6";
import type { CitizenProfile } from "../queries/getCitizenProfile";
import { LocalTime } from "./LocalTime";
import { ProfileAttribute } from "./ProfileAttribute";
import { ProfileMetric, ProfileMetricTone } from "./ProfileMetric";
import { AddRoles } from "./roles/AddRoles";

const AVATAR_SIZE = 64;

/** Milliseconds between two bursts while the profile is in view */
const CONFETTI_INTERVAL = 1400;

/**
 * The profile is a tall box, thus the shots are steeper than the flat ones
 * of a notification row and the particles need more speed to reach the
 * middle.
 */
const CONFETTI_SHOT = {
  particleCount: 5,
  spread: 45,
  startVelocity: 30,
  gravity: 0.6,
  decay: 0.94,
  scalar: 0.7,
  ticks: 220,
};

/** One shot from each lower corner, both towards the middle of the profile */
const CONFETTI_SHOTS = [
  { ...CONFETTI_SHOT, angle: 55, origin: { x: 0, y: 1 } },
  { ...CONFETTI_SHOT, angle: 125, origin: { x: 1, y: 1 } },
];

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
  const hasMetrics = Boolean(
    metrics.silc || metrics.penaltyPoints || metrics.fleet,
  );

  return (
    <>
      {citizen.hasBirthdayToday && (
        <>
          {/* The surface which carries this one isolates itself and holds
          the colour clouds, thus the confetti stays behind the profile. */}
          <ConfettiCanvas
            shots={CONFETTI_SHOTS}
            intervalMilliseconds={CONFETTI_INTERVAL}
            className="absolute inset-0 -z-10 size-full rounded-[inherit]"
          />

          <p className="flex items-center justify-center gap-2 rounded-secondary border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 mb-2 font-mono text-sm uppercase text-amber-300">
            Happy Birthday
            <BirthdayHat className="size-4 flex-none" />
          </p>
        </>
      )}

      <div className="flex gap-4 items-center pb-2">
        <Avatar
          name={name}
          image={profile.avatarUrl}
          size={AVATAR_SIZE}
          className="flex-none"
          decoration={
            citizen.hasBirthdayToday ? AvatarDecoration.BirthdayHat : undefined
          }
        />

        <div className="min-w-0">
          <p className="opacity-50 font-mono uppercase text-xs">Citizen</p>

          <h2 className="font-mono uppercase text-lg font-bold flex items-center gap-2 min-w-0">
            <span
              className={clsx("truncate", {
                "text-birthday": citizen.hasBirthdayToday,
                "text-me":
                  !citizen.hasBirthdayToday && profile.isCurrentCitizen,
              })}
              title={name}
            >
              {name}
            </span>

            {profile.isCurrentCitizen && (
              <span className="sr-only">Dies bist du</span>
            )}

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

      {citizen.timezone && (
        <dl className="border-t border-neutral-700 pt-2 mt-2 flex flex-col gap-1 text-sm">
          <ProfileAttribute name="Zeitzone">
            <span className="truncate" title={citizen.timezone}>
              {citizen.timezone}
            </span>

            <LocalTime timezone={citizen.timezone} />
          </ProfileAttribute>
        </dl>
      )}

      {/* TODO: Show active organization memberships */}
    </>
  );
};
